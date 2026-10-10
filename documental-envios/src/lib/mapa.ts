import {geoGraticule, geoMercator, geoPath} from 'd3-geo';
import type {FeatureCollection, Geometry} from 'geojson';
import {interpolate} from 'remotion';
import batimetria1000 from '../data/geo/batimetria-1000.json';
import batimetria3000 from '../data/geo/batimetria-3000.json';
import estadosVenezuela from '../data/geo/estados-venezuela.json';
import lagos from '../data/geo/lagos.json';
import paises from '../data/geo/paises.json';
import rios from '../data/geo/rios.json';
import zonaReclamacion from '../data/geo/zona-reclamacion.json';
import lugares from '../data/lugares.json';
import rutasMaritimas from '../data/rutas-maritimas.json';
import {CURVA} from './animacion';

// ---------------------------------------------------------------------------
// Proyección base
// Toda la geometría se proyecta UNA sola vez con una Mercator fija. La "cámara"
// es una transformación afín (escala + traslación) sobre ese espacio, por lo que
// los movimientos son exactos, deterministas y baratos de calcular por fotograma.
// ---------------------------------------------------------------------------

const ESCALA_BASE = 1000;
export const proyeccionBase = geoMercator().scale(ESCALA_BASE).translate([0, 0]);
const rutaBase = geoPath(proyeccionBase);

export type LonLat = [number, number];
export type Punto = [number, number];

export type Lugar = {nombre: string; region: string; pais: string; lat: number; lon: number};
export const LUGARES = lugares as Record<string, Lugar>;
export type IdLugar = keyof typeof lugares;
export const IDS_LUGARES = Object.keys(lugares) as IdLugar[];
export const lonLat = (id: IdLugar): LonLat => [LUGARES[id].lon, LUGARES[id].lat];

export type IdRuta = keyof typeof rutasMaritimas;
export const RUTAS = rutasMaritimas as unknown as Record<IdRuta, {nombre: string; puntos: LonLat[]}>;
export const IDS_RUTAS = Object.keys(rutasMaritimas) as IdRuta[];

// --- Capas (se calculan una vez, perezosamente) ---------------------------------

type Capas = {
	tierra: string;
	paises: {iso: string; nombre: string; d: string}[];
	estados: {nombre: string; d: string}[];
	lagos: string;
	rios: {nombre: string; rango: number; d: string}[];
	bati1000: string;
	bati3000: string;
	reclamacion: string;
	reticula: string;
};

let capas: Capas | null = null;
const fc = (x: unknown) => x as FeatureCollection<Geometry, Record<string, unknown>>;

export const obtenerCapas = (): Capas => {
	if (capas) return capas;
	const listaPaises = fc(paises).features.map((f) => ({
		iso: String(f.properties.iso),
		nombre: String(f.properties.nombre),
		d: rutaBase(f) ?? '',
	}));
	capas = {
		tierra: listaPaises.map((p) => p.d).join(''),
		paises: listaPaises,
		estados: fc(estadosVenezuela).features.map((f) => ({nombre: String(f.properties.nombre), d: rutaBase(f) ?? ''})),
		lagos: fc(lagos).features.map((f) => rutaBase(f) ?? '').join(''),
		rios: fc(rios).features.map((f) => ({
			nombre: String(f.properties.nombre),
			rango: Number(f.properties.rango),
			d: rutaBase(f) ?? '',
		})),
		bati1000: fc(batimetria1000).features.map((f) => rutaBase(f) ?? '').join(''),
		bati3000: fc(batimetria3000).features.map((f) => rutaBase(f) ?? '').join(''),
		reclamacion: fc(zonaReclamacion).features.map((f) => rutaBase(f) ?? '').join(''),
		reticula: rutaBase(geoGraticule().step([5, 5]).extent([[-100, -5], [-50, 35]])()) ?? '',
	};
	return capas;
};

// --- Cámara ------------------------------------------------------------------

/** Encuadre: centro geográfico y grados de longitud visibles a lo ancho del cuadro. */
export type Encuadre = {lon: number; lat: number; ancho: number};
export type ClaveCamara = Encuadre & {frame: number};

export type Camara = {
	escala: number;
	transform: string;
	/** Coordenadas geográficas → píxeles de pantalla. */
	aPantalla: (p: LonLat) => Punto;
	/** Espacio proyectado base → píxeles de pantalla. */
	baseAPantalla: (p: Punto) => Punto;
};

export const crearCamara = (e: Encuadre, ancho: number, alto: number): Camara => {
	const escala = ancho / ((ESCALA_BASE * e.ancho * Math.PI) / 180);
	const [cx, cy] = proyeccionBase([e.lon, e.lat]) as Punto;
	const baseAPantalla = ([x, y]: Punto): Punto => [(x - cx) * escala + ancho / 2, (y - cy) * escala + alto / 2];
	return {
		escala,
		transform: `translate(${ancho / 2} ${alto / 2}) scale(${escala}) translate(${-cx} ${-cy})`,
		baseAPantalla,
		aPantalla: (p) => baseAPantalla(proyeccionBase(p) as Punto),
	};
};

/**
 * Interpola el encuadre entre claves de cámara. El centro se interpola en el
 * espacio proyectado (paneo lineal en pantalla) y el zoom en escala logarítmica
 * (velocidad de acercamiento perceptualmente constante).
 */
export const encuadreEn = (frame: number, claves: ClaveCamara[], curva = CURVA.suave): Encuadre => {
	if (claves.length === 1 || frame <= claves[0].frame) return claves[0];
	const ultima = claves[claves.length - 1];
	if (frame >= ultima.frame) return ultima;
	let i = 0;
	while (i < claves.length - 2 && frame >= claves[i + 1].frame) i++;
	const [a, b] = [claves[i], claves[i + 1]];
	const t = interpolate(frame, [a.frame, b.frame], [0, 1], {easing: curva, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const pa = proyeccionBase([a.lon, a.lat]) as Punto;
	const pb = proyeccionBase([b.lon, b.lat]) as Punto;
	const centro = proyeccionBase.invert!([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]) as LonLat;
	return {lon: centro[0], lat: centro[1], ancho: Math.exp(Math.log(a.ancho) + (Math.log(b.ancho) - Math.log(a.ancho)) * t)};
};

// --- Trazados (rutas) -------------------------------------------------------------

export type Trazado = {puntos: Punto[]; acumulado: number[]; largo: number};

const cacheTrazados = new Map<string, Trazado>();

const medir = (puntos: Punto[]): Trazado => {
	const acumulado = [0];
	for (let i = 1; i < puntos.length; i++) {
		acumulado.push(acumulado[i - 1] + Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]));
	}
	return {puntos, acumulado, largo: acumulado[acumulado.length - 1]};
};

/** Curva Catmull-Rom centrípeta que pasa por todos los puntos de paso (en espacio base). */
export const trazadoSuave = (clave: string, lonlats: LonLat[], muestrasPorTramo = 24): Trazado => {
	const enCache = cacheTrazados.get(clave);
	if (enCache) return enCache;
	const P = lonlats.map((p) => proyeccionBase(p) as Punto);
	const out: Punto[] = [];
	for (let i = 0; i < P.length - 1; i++) {
		const p0 = P[Math.max(0, i - 1)];
		const p1 = P[i];
		const p2 = P[i + 1];
		const p3 = P[Math.min(P.length - 1, i + 2)];
		const d = (a: Punto, b: Punto) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
		const t0 = 0;
		const t1 = t0 + d(p0, p1);
		const t2 = t1 + d(p1, p2);
		const t3 = t2 + d(p2, p3);
		for (let s = 0; s < muestrasPorTramo; s++) {
			const t = t1 + ((t2 - t1) * s) / muestrasPorTramo;
			const lerp = (a: Punto, b: Punto, ta: number, tb: number): Punto => {
				const k = tb - ta < 1e-9 ? 0 : (t - ta) / (tb - ta);
				return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
			};
			const a1 = lerp(p0, p1, t0, t1);
			const a2 = lerp(p1, p2, t1, t2);
			const a3 = lerp(p2, p3, t2, t3);
			const b1 = lerp(a1, a2, t0, t2);
			const b2 = lerp(a2, a3, t1, t3);
			out.push(lerp(b1, b2, t1, t2));
		}
	}
	out.push(P[P.length - 1]);
	const tr = medir(out);
	cacheTrazados.set(clave, tr);
	return tr;
};

/** Arco suave entre dos lugares (curvatura relativa a la distancia; positivo = hacia la izquierda). */
export const trazadoArco = (clave: string, a: LonLat, b: LonLat, curvatura = 0.2, muestras = 80): Trazado => {
	const enCache = cacheTrazados.get(clave);
	if (enCache) return enCache;
	const pa = proyeccionBase(a) as Punto;
	const pb = proyeccionBase(b) as Punto;
	const [mx, my] = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
	const [dx, dy] = [pb[0] - pa[0], pb[1] - pa[1]];
	const c: Punto = [mx - dy * curvatura, my + dx * curvatura];
	const pts: Punto[] = [];
	for (let i = 0; i <= muestras; i++) {
		const t = i / muestras;
		const u = 1 - t;
		pts.push([u * u * pa[0] + 2 * u * t * c[0] + t * t * pb[0], u * u * pa[1] + 2 * u * t * c[1] + t * t * pb[1]]);
	}
	const tr = medir(pts);
	cacheTrazados.set(clave, tr);
	return tr;
};

/** Parte inicial de un trazado (0–1), en píxeles de pantalla, con la posición y rumbo de la punta. */
export const tramoVisible = (tr: Trazado, t: number, camara: Camara, desde = 0) => {
	const objetivo = Math.max(0, Math.min(1, t)) * tr.largo;
	const inicio = Math.max(0, Math.min(1, desde)) * tr.largo;
	const pts: Punto[] = [];
	let punta: Punto = camara.baseAPantalla(tr.puntos[0]);
	let rumbo = 0;
	for (let i = 0; i < tr.puntos.length; i++) {
		const l = tr.acumulado[i];
		if (l < inicio) continue;
		if (l <= objetivo) {
			pts.push(camara.baseAPantalla(tr.puntos[i]));
			continue;
		}
		const [a, b] = [tr.puntos[i - 1], tr.puntos[i]];
		const k = (objetivo - tr.acumulado[i - 1]) / (l - tr.acumulado[i - 1] || 1);
		pts.push(camara.baseAPantalla([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]));
		break;
	}
	if (pts.length) punta = pts[pts.length - 1];
	if (pts.length > 1) {
		const ref = pts[Math.max(0, pts.length - 4)];
		rumbo = (Math.atan2(punta[1] - ref[1], punta[0] - ref[0]) * 180) / Math.PI;
	}
	const d = pts.length > 1 ? 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') : '';
	return {d, punta, rumbo};
};
