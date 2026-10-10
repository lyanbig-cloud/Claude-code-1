import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {MarcadorLugar, RotuloGeo, RutaAnimada} from '../components/ElementosMapa';
import {Escena} from '../components/Escena';
import {MapaBase} from '../components/MapaBase';
import {Titulo} from '../components/Titulo';
import {VeloMapa} from '../components/VeloMapa';
import {CURVA, progreso} from '../lib/animacion';
import {IDS_RUTAS, RUTAS, crearCamara, encuadreEn, lonLat, trazadoArco, trazadoSuave} from '../lib/mapa';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

export const esquemaTampaMiamiVenezuela = z.object({
	duracionSegundos: z.number().min(8).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	rutaId: z.enum(IDS_RUTAS as [string, ...string[]]),
	etapas: z.tuple([z.string(), z.string(), z.string()]),
	detalles: z.tuple([z.string(), z.string(), z.string()]),
});

export const propsTampaMiamiVenezuela: z.infer<typeof esquemaTampaMiamiVenezuela> = {
	duracionSegundos: 20,
	fondoTransparente: false,
	antetitulo: 'El recorrido',
	titulo: 'De Tampa a Venezuela',
	rutaId: 'miami-la-guaira',
	etapas: ['Tampa', 'Miami', 'Venezuela'],
	detalles: ['Florida', 'Florida', ''],
};

/** Indicador de etapas en la parte inferior (01 · 02 · 03). */
const Etapas: React.FC<{nombres: string[]; activas: number[]}> = ({nombres, activas}) => {
	const x0 = SEGURO.lateral + 140;
	const x1 = 2160 - SEGURO.lateral - 140;
	const y = 3130;
	const paso = (x1 - x0) / (nombres.length - 1);
	return (
		<>
			<svg width={2160} height={3840} style={{position: 'absolute', inset: 0}}>
				<line x1={x0} y1={y} x2={x1} y2={y} stroke="rgba(233,220,196,0.18)" strokeWidth={3} />
				{nombres.slice(0, -1).map((_, i) => (
					<line key={i} x1={x0 + paso * i} y1={y} x2={x0 + paso * i + paso * activas[i + 1]} y2={y} stroke={COLOR.ambarClaro} strokeWidth={5} />
				))}
				{nombres.map((_, i) => (
					<g key={i} transform={`translate(${x0 + paso * i} ${y})`}>
						<circle r={38} fill={COLOR.carbon} stroke={activas[i] > 0 ? COLOR.dorado : 'rgba(233,220,196,0.3)'} strokeWidth={3} />
						<circle r={38 * activas[i]} fill={COLOR.ambar} opacity={0.9} />
					</g>
				))}
			</svg>
			{nombres.map((n, i) => (
				<div
					key={n + i}
					style={{
						position: 'absolute',
						left: x0 + paso * i,
						top: y - 22,
						transform: 'translateX(-50%)',
						width: 400,
						textAlign: 'center',
					}}
				>
					<div style={{fontFamily: FUENTE.etiqueta, fontWeight: 600, fontSize: 36, color: activas[i] > 0.5 ? COLOR.carbon : COLOR.beigeTenue, letterSpacing: '0.05em'}}>
						{String(i + 1).padStart(2, '0')}
					</div>
					<div
						style={{
							marginTop: 54,
							fontFamily: FUENTE.etiqueta,
							fontWeight: 600,
							fontSize: 60,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: COLOR.beige,
							opacity: 0.45 + 0.55 * activas[i],
						}}
					>
						{n}
					</div>
				</div>
			))}
		</>
	);
};

export const TampaMiamiVenezuela: React.FC<z.infer<typeof esquemaTampaMiamiVenezuela>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D, width, height} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	const camara = crearCamara(
		encuadreEn(frame, [
			{frame: 0, lon: -81.0, lat: 26.2, ancho: 7.5},
			{frame: T(0.34), lon: -81.2, lat: 26.0, ancho: 6.4},
			{frame: T(0.6), lon: -73.8, lat: 20.6, ancho: 24.5},
			{frame: D, lon: -73.6, lat: 20.4, ancho: 23.5},
		]),
		width,
		height,
	);

	const tramoTierra = trazadoArco('tampa-miami', lonLat('tampa'), lonLat('miami'), -0.18);
	const ruta = RUTAS[p.rutaId as keyof typeof RUTAS];
	const tramoMar = trazadoSuave(p.rutaId, ruta.puntos);
	const fin = ruta.puntos[ruta.puntos.length - 1];

	const pTierra = progreso(frame, T(0.12), T(0.2), CURVA.trazo);
	const pMar = progreso(frame, T(0.4), T(0.38), CURVA.trazo);
	const destacado = progreso(frame, T(0.74), T(0.12), CURVA.suave);
	const activas = [progreso(frame, T(0.06), T(0.06)), progreso(frame, T(0.3), T(0.06)), progreso(frame, T(0.78), T(0.06))];
	// Los rótulos de Florida se desvanecen al alejarse la cámara.
	const etiquetasFlorida = 1 - progreso(frame, T(0.4), T(0.08), CURVA.entrada);

	return (
		<Escena fondoTransparente={p.fondoTransparente}>
			<AbsoluteFill style={{opacity: progreso(frame, 0, T(0.06), CURVA.suave)}}>
				<MapaBase camara={camara} opciones={{destacar: ['VEN'], intensidadDestacado: destacado}} />
			</AbsoluteFill>
			<VeloMapa transparente={p.fondoTransparente} inferior={1300} />
			<AbsoluteFill style={{opacity: etiquetasFlorida}}>
				<RotuloGeo camara={camara} posicion={[-84.2, 26.4]} texto="Golfo de México" inicio={T(0.04)} tamano={0.9} />
				<RotuloGeo camara={camara} posicion={[-78.6, 27.2]} texto="Océano Atlántico" inicio={T(0.08)} tamano={0.9} />
			</AbsoluteFill>
			<RotuloGeo camara={camara} posicion={[-72.6, 14.4]} texto="Mar Caribe" inicio={T(0.6)} />
			<RutaAnimada camara={camara} trazado={tramoTierra} progreso={pTierra} estilo="terrestre" />
			<RutaAnimada camara={camara} trazado={tramoMar} progreso={pMar} />
			<MarcadorLugar camara={camara} posicion={lonLat('tampa')} nombre={p.etapas[0]} detalle={p.detalles[0]} inicio={T(0.06)} lado="izquierda" principal opacidadTexto={etiquetasFlorida} />
			<MarcadorLugar camara={camara} posicion={lonLat('miami')} nombre={p.etapas[1]} detalle={p.detalles[1]} inicio={T(0.3)} principal opacidadTexto={etiquetasFlorida} />
			<MarcadorLugar camara={camara} posicion={fin} nombre={p.etapas[2]} detalle={p.detalles[2]} inicio={T(0.78)} lado="abajo" principal />
			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} tamano={180} />
			<Etapas nombres={p.etapas} activas={activas} />
		</Escena>
	);
};
