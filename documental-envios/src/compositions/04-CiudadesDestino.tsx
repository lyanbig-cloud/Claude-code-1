import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {MarcadorLugar, RotuloGeo} from '../components/ElementosMapa';
import {Escena} from '../components/Escena';
import {MapaBase} from '../components/MapaBase';
import {PorConfirmar} from '../components/PorConfirmar';
import {Titulo} from '../components/Titulo';
import {VeloMapa} from '../components/VeloMapa';
import {CURVA, progreso} from '../lib/animacion';
import {IDS_LUGARES, type IdLugar, LUGARES, crearCamara, encuadreEn, lonLat} from '../lib/mapa';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

const esquemaCiudad = z.object({
	/** Clave de src/data/lugares.json (coordenadas reales de GeoNames). */
	id: z.enum(IDS_LUGARES as [string, ...string[]]),
	/** Posición de la etiqueta respecto al punto, para evitar solapamientos. */
	lado: z.enum(['derecha', 'izquierda', 'arriba', 'abajo']),
});

export const esquemaCiudadesDestino = z.object({
	duracionSegundos: z.number().min(6).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	ciudades: z.array(esquemaCiudad).max(16),
	/** Marca la lista como provisional hasta que el cliente la confirme. */
	listaPorConfirmar: z.boolean(),
	mostrarEstados: z.boolean(),
	/** Guayana Esequiba rayada como zona en reclamación (Natural Earth). */
	mostrarZonaEnReclamacion: z.boolean(),
	textoContador: z.string(),
});

export const propsCiudadesDestino: z.infer<typeof esquemaCiudadesDestino> = {
	duracionSegundos: 20,
	fondoTransparente: false,
	antetitulo: 'Cobertura',
	titulo: 'Ciudades destino',
	// Lista PROVISIONAL de muestra: sustituir por las ciudades reales del servicio.
	ciudades: [
		{id: 'caracas', lado: 'arriba'},
		{id: 'maracaibo', lado: 'arriba'},
		{id: 'valencia', lado: 'abajo'},
		{id: 'barquisimeto', lado: 'izquierda'},
		{id: 'merida', lado: 'derecha'},
		{id: 'san-cristobal', lado: 'abajo'},
		{id: 'barcelona', lado: 'abajo'},
		{id: 'maturin', lado: 'derecha'},
		{id: 'ciudad-guayana', lado: 'abajo'},
		{id: 'puerto-ayacucho', lado: 'derecha'},
	],
	listaPorConfirmar: true,
	mostrarEstados: true,
	mostrarZonaEnReclamacion: false,
	textoContador: 'ciudades destino',
};

export const CiudadesDestino: React.FC<z.infer<typeof esquemaCiudadesDestino>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D, width, height} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	const camara = crearCamara(
		encuadreEn(frame, [
			{frame: 0, lon: -66.2, lat: 5.6, ancho: 21},
			{frame: T(0.3), lon: -66.4, lat: 5.0, ancho: 16.8},
			{frame: D, lon: -66.4, lat: 5.0, ancho: 16.2},
		]),
		width,
		height,
	);

	const destacado = progreso(frame, T(0.06), T(0.18), CURVA.suave);
	const pEstados = progreso(frame, T(0.18), T(0.14));
	const inicioCiudades = T(0.28);
	const finCiudades = T(0.78);
	const paso = p.ciudades.length > 1 ? (finCiudades - inicioCiudades) / (p.ciudades.length - 1) : 0;
	const visibles = p.ciudades.filter((_, i) => frame >= inicioCiudades + paso * i).length;
	const pContador = progreso(frame, inicioCiudades - 6, 20);

	return (
		<Escena fondoTransparente={p.fondoTransparente} luzY={0.4}>
			<AbsoluteFill style={{opacity: progreso(frame, 0, T(0.08), CURVA.suave)}}>
				<MapaBase
					camara={camara}
					opciones={{
						destacar: ['VEN'],
						intensidadDestacado: destacado,
						estados: p.mostrarEstados,
						opacidadEstados: pEstados,
						reticula: false,
						zonaReclamacion: p.mostrarZonaEnReclamacion,
					}}
				/>
			</AbsoluteFill>
			<VeloMapa transparente={p.fondoTransparente} superior={1300} inferior={1400} />
			<RotuloGeo camara={camara} posicion={[-66.4, 12.6]} texto="Mar Caribe" inicio={T(0.1)} tamano={0.9} />
			<RotuloGeo camara={camara} posicion={[-71.6, 5.2]} texto="Colombia" estilo="pais" inicio={T(0.14)} />
			<RotuloGeo camara={camara} posicion={[-63.2, 2.2]} texto="Brasil" estilo="pais" inicio={T(0.14)} />
			{p.mostrarZonaEnReclamacion && (
				<RotuloGeo camara={camara} posicion={[-59.6, 5.6]} texto="Zona en Reclamación" estilo="pais" tamano={0.7} inicio={T(0.2)} />
			)}
			{p.ciudades.map((c, i) => {
				const lugar = LUGARES[c.id];
				return (
					<MarcadorLugar
						key={c.id}
						camara={camara}
						posicion={lonLat(c.id as IdLugar)}
						nombre={lugar.nombre}
						inicio={Math.round(inicioCiudades + paso * i)}
						lado={c.lado}
						tamano={0.9}
					/>
				);
			})}
			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} />

			{/* Contador */}
			<div
				style={{
					position: 'absolute',
					left: SEGURO.lateral,
					right: SEGURO.lateral,
					top: 2780,
					textAlign: 'center',
					opacity: pContador,
				}}
			>
				<span style={{fontFamily: FUENTE.titulo, fontWeight: 600, fontSize: 240, color: COLOR.beige, fontVariantNumeric: 'lining-nums tabular-nums'}}>
					{String(visibles).padStart(2, '0')}
				</span>
				<div
					style={{
						fontFamily: FUENTE.etiqueta,
						fontWeight: 500,
						fontSize: 64,
						letterSpacing: '0.32em',
						textTransform: 'uppercase',
						color: COLOR.dorado,
						marginTop: -10,
					}}
				>
					{p.textoContador}
				</div>
				{p.listaPorConfirmar && (
					<div style={{marginTop: 34}}>
						<PorConfirmar tamano={34} opacidad={progreso(frame, T(0.4), T(0.1))} />
					</div>
				)}
			</div>
		</Escena>
	);
};
