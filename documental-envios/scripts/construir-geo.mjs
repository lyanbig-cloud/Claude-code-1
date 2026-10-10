// Genera los datos geográficos del proyecto a partir de fuentes reales:
//   - Natural Earth 10m (dominio público): países, estados de Venezuela, lagos,
//     ríos, batimetría y zonas en disputa.
//   - GeoNames (CC BY 4.0, vía el paquete npm `all-the-cities`): coordenadas de ciudades.
//
// Uso:
//   bash scripts/descargar-natural-earth.sh <carpeta>
//   node scripts/construir-geo.mjs <carpeta>
//
// Salida: src/data/geo/*.json y src/data/lugares.json
// También valida que la ruta marítima no cruce tierra firme.

import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {geoContains, geoMercator} from 'd3-geo';

const require = createRequire(import.meta.url);
const NE = process.argv[2];
if (!NE) {
	console.error('Uso: node scripts/construir-geo.mjs <carpeta-natural-earth>');
	process.exit(1);
}
const OUT = path.resolve('src/data/geo');
fs.mkdirSync(OUT, {recursive: true});

const leer = (f) => JSON.parse(fs.readFileSync(path.join(NE, f), 'utf8'));
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// Región de trabajo (Golfo de México, Caribe y norte de Sudamérica).
const REGION = {oeste: -100, este: -52, sur: -2, norte: 33};

// --- Recorte Sutherland–Hodgman de un anillo contra el rectángulo de la región.
const recortarAnillo = (anillo) => {
	const bordes = [
		[(p) => p[0] >= REGION.oeste, (a, b) => interX(a, b, REGION.oeste)],
		[(p) => p[0] <= REGION.este, (a, b) => interX(a, b, REGION.este)],
		[(p) => p[1] >= REGION.sur, (a, b) => interY(a, b, REGION.sur)],
		[(p) => p[1] <= REGION.norte, (a, b) => interY(a, b, REGION.norte)],
	];
	let salida = anillo.slice(0, -1);
	for (const [dentro, inter] of bordes) {
		const entrada = salida;
		salida = [];
		if (entrada.length === 0) break;
		let prev = entrada[entrada.length - 1];
		for (const p of entrada) {
			if (dentro(p)) {
				if (!dentro(prev)) salida.push(inter(prev, p));
				salida.push(p);
			} else if (dentro(prev)) {
				salida.push(inter(prev, p));
			}
			prev = p;
		}
	}
	if (salida.length < 3) return null;
	salida.push(salida[0]);
	return salida.map(([x, y]) => [r4(x), r4(y)]);
};
const interX = (a, b, x) => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
const interY = (a, b, y) => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];

const recortarPoligonos = (geom) => {
	const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
	const res = [];
	for (const poly of polys) {
		const ext = recortarAnillo(poly[0]);
		if (!ext) continue;
		const huecos = poly.slice(1).map(recortarAnillo).filter(Boolean);
		res.push([ext, ...huecos]);
	}
	if (res.length === 0) return null;
	return {type: 'MultiPolygon', coordinates: res};
};

const recortarLineas = (geom) => {
	const lineas = geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'MultiLineString' ? geom.coordinates : [];
	const dentro = (p) => p[0] >= REGION.oeste && p[0] <= REGION.este && p[1] >= REGION.sur && p[1] <= REGION.norte;
	const res = [];
	for (const l of lineas) {
		let actual = [];
		for (const p of l) {
			if (dentro(p)) actual.push([r4(p[0]), r4(p[1])]);
			else if (actual.length) {
				if (actual.length > 1) res.push(actual);
				actual = [];
			}
		}
		if (actual.length > 1) res.push(actual);
	}
	return res.length ? {type: 'MultiLineString', coordinates: res} : null;
};

const coleccion = (features) => ({type: 'FeatureCollection', features});
const guardar = (nombre, datos) => {
	const f = path.join(OUT, nombre);
	fs.writeFileSync(f, JSON.stringify(datos));
	console.log(`  ${nombre}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB, ${datos.features.length} elementos`);
};

console.log('Generando capas geográficas…');

// 1) Países
const paises = leer('ne_10m_admin_0_countries.geojson')
	.features.map((f) => {
		const g = recortarPoligonos(f.geometry);
		if (!g) return null;
		const p = f.properties;
		return {type: 'Feature', properties: {iso: p.ADM0_A3, nombre: p.NAME_ES || p.NAME}, geometry: g};
	})
	.filter(Boolean);
guardar('paises.json', coleccion(paises));

// 2) Estados de Venezuela (nombres oficiales vigentes; Vargas pasó a llamarse La Guaira en 2019)
const NOMBRES_ESTADOS = {'VE-A': 'Distrito Capital', 'VE-X': 'La Guaira', 'VE-X01~': 'La Guaira'};
const estados = leer('ne_10m_admin_1_states_provinces.geojson')
	.features.filter((f) => f.properties.adm0_a3 === 'VEN')
	.map((f) => ({
		type: 'Feature',
		properties: {nombre: NOMBRES_ESTADOS[f.properties.iso_3166_2] ?? f.properties.name_es ?? f.properties.name, codigo: f.properties.iso_3166_2},
		geometry: recortarPoligonos(f.geometry),
	}));
guardar('estados-venezuela.json', coleccion(estados));

// 3) Zona en reclamación (Guayana Esequiba), según Natural Earth
const reclamacion = leer('ne_10m_admin_0_disputed_areas.geojson')
	.features.filter((f) => f.properties.BRK_NAME === 'West of Essequibo River')
	.map((f) => ({type: 'Feature', properties: {nombre: 'Guayana Esequiba'}, geometry: recortarPoligonos(f.geometry)}));
guardar('zona-reclamacion.json', coleccion(reclamacion));

// 4) Lagos principales (y todos los lagos dentro del recuadro de Venezuela)
const enVenezuela = (g) => {
	const p = (g.type === 'Polygon' ? g.coordinates : g.coordinates[0])[0][0];
	return p[0] > -73.5 && p[0] < -59.5 && p[1] > 0.5 && p[1] < 12.5;
};
const lagos = leer('ne_10m_lakes.geojson')
	.features.filter((f) => (f.properties.scalerank ?? 10) <= 6 || enVenezuela(f.geometry))
	.map((f) => ({type: 'Feature', properties: {nombre: f.properties.name}, geometry: recortarPoligonos(f.geometry)}))
	.filter((f) => f.geometry);
guardar('lagos.json', coleccion(lagos));

// 5) Ríos principales
const rios = leer('ne_10m_rivers_lake_centerlines.geojson')
	.features.filter((f) => (f.properties.scalerank ?? 10) <= 6)
	.map((f) => ({type: 'Feature', properties: {nombre: f.properties.name, rango: f.properties.scalerank}, geometry: recortarLineas(f.geometry)}))
	.filter((f) => f.geometry);
guardar('rios.json', coleccion(rios));

// 6) Batimetría (isóbatas de 1000 m y 3000 m)
for (const [archivo, salida] of [
	['ne_10m_bathymetry_J_1000.geojson', 'batimetria-1000.json'],
	['ne_10m_bathymetry_H_3000.geojson', 'batimetria-3000.json'],
]) {
	const b = leer(archivo)
		.features.map((f) => ({type: 'Feature', properties: {}, geometry: recortarPoligonos(f.geometry)}))
		.filter((f) => f.geometry);
	guardar(salida, coleccion(b));
}

// 7) Lugares (GeoNames vía all-the-cities)
console.log('Generando lugares (GeoNames)…');
const ciudades = require('all-the-cities');
const buscar = (nombre, pais, admin) => {
	const c = ciudades
		.filter((x) => x.name === nombre && x.country === pais && (!admin || x.adminCode === admin))
		.sort((a, b) => b.population - a.population)[0];
	if (!c) throw new Error(`No se encontró ${nombre} (${pais})`);
	return {lat: c.loc.coordinates[1], lon: c.loc.coordinates[0], geonameId: c.cityId, poblacion: c.population};
};

// [clave, nombre en GeoNames, país, nombre a mostrar, estado/región]
const LISTA = [
	['tampa', 'Tampa', 'US', 'Tampa', 'Florida'],
	['miami', 'Miami', 'US', 'Miami', 'Florida'],
	['caracas', 'Caracas', 'VE', 'Caracas', 'Distrito Capital'],
	['la-guaira', 'La Guaira', 'VE', 'La Guaira', 'La Guaira'],
	['maracaibo', 'Maracaibo', 'VE', 'Maracaibo', 'Zulia'],
	['valencia', 'Valencia', 'VE', 'Valencia', 'Carabobo'],
	['maracay', 'Maracay', 'VE', 'Maracay', 'Aragua'],
	['barquisimeto', 'Barquisimeto', 'VE', 'Barquisimeto', 'Lara'],
	['puerto-cabello', 'Puerto Cabello', 'VE', 'Puerto Cabello', 'Carabobo'],
	['ciudad-guayana', 'Ciudad Guayana', 'VE', 'Ciudad Guayana', 'Bolívar'],
	['ciudad-bolivar', 'Ciudad Bolívar', 'VE', 'Ciudad Bolívar', 'Bolívar'],
	['barcelona', 'Barcelona', 'VE', 'Barcelona', 'Anzoátegui'],
	['puerto-la-cruz', 'Puerto La Cruz', 'VE', 'Puerto La Cruz', 'Anzoátegui'],
	['maturin', 'Maturín', 'VE', 'Maturín', 'Monagas'],
	['cumana', 'Cumaná', 'VE', 'Cumaná', 'Sucre'],
	['merida', 'Mérida', 'VE', 'Mérida', 'Mérida'],
	['san-cristobal', 'San Cristóbal', 'VE', 'San Cristóbal', 'Táchira'],
	['barinas', 'Barinas', 'VE', 'Barinas', 'Barinas'],
	['coro', 'Coro', 'VE', 'Coro', 'Falcón'],
	['punto-fijo', 'Punto Fijo', 'VE', 'Punto Fijo', 'Falcón'],
	['porlamar', 'Porlamar', 'VE', 'Porlamar', 'Nueva Esparta'],
	['valera', 'Valera', 'VE', 'Valera', 'Trujillo'],
	['acarigua', 'Acarigua', 'VE', 'Acarigua', 'Portuguesa'],
	['guanare', 'Guanare', 'VE', 'Guanare', 'Portuguesa'],
	['san-fernando-de-apure', 'San Fernando de Apure', 'VE', 'San Fernando de Apure', 'Apure'],
	['san-juan-de-los-morros', 'San Juan de los Morros', 'VE', 'San Juan de los Morros', 'Guárico'],
	['san-carlos', 'San Carlos', 'VE', 'San Carlos', 'Cojedes'],
	['san-felipe', 'San Felipe', 'VE', 'San Felipe', 'Yaracuy'],
	['los-teques', 'Los Teques', 'VE', 'Los Teques', 'Miranda'],
	['cabimas', 'Cabimas', 'VE', 'Cabimas', 'Zulia'],
	['el-tigre', 'El Tigre', 'VE', 'El Tigre', 'Anzoátegui'],
	['carupano', 'Carúpano', 'VE', 'Carúpano', 'Sucre'],
	['tucupita', 'Tucupita', 'VE', 'Tucupita', 'Delta Amacuro'],
	['puerto-ayacucho', 'Puerto Ayacucho', 'VE', 'Puerto Ayacucho', 'Amazonas'],
];

const paisVEN = paises.find((f) => f.properties.iso === 'VEN');
const paisUSA = paises.find((f) => f.properties.iso === 'USA');
const lugares = {};
for (const [clave, nombreGN, pais, nombre, region] of LISTA) {
	const c = buscar(nombreGN, pais);
	const dentro = geoContains(pais === 'VE' ? paisVEN : paisUSA, [c.lon, c.lat]);
	if (!dentro) console.warn(`  ⚠ ${nombre}: el punto cae fuera del polígono 10m (costa/isla), revisar`);
	lugares[clave] = {nombre, region, pais, lat: r4(c.lat), lon: r4(c.lon), geonameId: c.geonameId};
}

fs.writeFileSync(path.resolve('src/data/lugares.json'), JSON.stringify(lugares, null, '\t'));
console.log(`  lugares.json  ${Object.keys(lugares).length} lugares`);

// 8) Validación de rutas marítimas: la curva suavizada (la misma Catmull-Rom centrípeta
//    de src/lib/mapa.ts) no puede tocar tierra en ningún punto, salvo en los muelles.
const proy = geoMercator().scale(1000).translate([0, 0]);
const curva = (lonlats, n = 24) => {
	const P = lonlats.map((p) => proy(p));
	const out = [];
	const d = (a, b) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
	for (let i = 0; i < P.length - 1; i++) {
		const [p0, p1, p2, p3] = [P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(P.length - 1, i + 2)]];
		const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
		for (let s = 0; s < n; s++) {
			const t = t1 + ((t2 - t1) * s) / n;
			const L = (a, b, ta, tb) => {
				const k = tb - ta < 1e-9 ? 0 : (t - ta) / (tb - ta);
				return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
			};
			const a1 = L(p0, p1, t0, t1), a2 = L(p1, p2, t1, t2), a3 = L(p2, p3, t2, t3);
			out.push(L(L(a1, a2, t0, t2), L(a2, a3, t1, t3), t1, t2));
		}
	}
	out.push(P[P.length - 1]);
	return out.map((p) => proy.invert(p));
};
const rutas = JSON.parse(fs.readFileSync(path.resolve('src/data/rutas-maritimas.json'), 'utf8'));
const tierra = paises;
let errores = 0;
for (const [id, ruta] of Object.entries(rutas)) {
	const pts = curva(ruta.puntos, 60);
	const muelle = 0.35; // grados alrededor de origen y destino que pueden tocar costa
	const [o, f] = [ruta.puntos[0], ruta.puntos[ruta.puntos.length - 1]];
	for (const p of pts) {
		const cerca = (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < muelle;
		if (cerca(o) || cerca(f)) continue;
		const pais = tierra.find((t) => geoContains(t, p));
		if (pais) {
			console.error(`  ✗ Ruta ${id}: toca tierra (${pais.properties.nombre}) en ${p[1].toFixed(3)}, ${p[0].toFixed(3)}`);
			errores++;
		}
	}
}
if (errores) process.exit(1);
console.log(`  ✓ ${Object.keys(rutas).length} ruta(s) marítima(s) validada(s): la curva no toca tierra.`);
