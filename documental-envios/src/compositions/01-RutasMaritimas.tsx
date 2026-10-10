import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {MarcadorLugar, RotuloGeo, RutaAnimada} from '../components/ElementosMapa';
import {Escena} from '../components/Escena';
import {MapaBase} from '../components/MapaBase';
import {NotaPie} from '../components/NotaPie';
import {Titulo} from '../components/Titulo';
import {VeloMapa} from '../components/VeloMapa';
import {CURVA, progreso} from '../lib/animacion';
import {IDS_RUTAS, RUTAS, crearCamara, encuadreEn, lonLat, trazadoSuave} from '../lib/mapa';

export const esquemaRutasMaritimas = z.object({
	duracionSegundos: z.number().min(5).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	subtitulo: z.string(),
	rutaId: z.enum(IDS_RUTAS as [string, ...string[]]),
	etiquetaOrigen: z.string(),
	etiquetaDestino: z.string(),
	detalleDestino: z.string(),
	mostrarRotulos: z.boolean(),
	notaPie: z.string(),
});

export const propsRutasMaritimas: z.infer<typeof esquemaRutasMaritimas> = {
	duracionSegundos: 20,
	fondoTransparente: false,
	antetitulo: 'Envíos a Venezuela',
	titulo: 'Rutas marítimas',
	subtitulo: 'De Florida al Caribe venezolano',
	rutaId: 'miami-la-guaira',
	etiquetaOrigen: 'Miami',
	etiquetaDestino: 'La Guaira',
	detalleDestino: 'Venezuela',
	mostrarRotulos: true,
	notaPie: 'Trayecto ilustrativo · Cartografía: Natural Earth',
};

export const RutasMaritimas: React.FC<z.infer<typeof esquemaRutasMaritimas>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D, width, height} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	const camara = crearCamara(
		encuadreEn(frame, [
			{frame: 0, lon: -74.6, lat: 20.6, ancho: 27},
			{frame: D, lon: -73.6, lat: 19.4, ancho: 21.5},
		]),
		width,
		height,
	);
	const ruta = RUTAS[p.rutaId as keyof typeof RUTAS];
	const trazado = trazadoSuave(p.rutaId, ruta.puntos);
	const avance = progreso(frame, T(0.16), T(0.6), CURVA.trazo);
	const destacado = progreso(frame, T(0.72), T(0.14), CURVA.suave);
	const fin = ruta.puntos[ruta.puntos.length - 1];

	return (
		<Escena fondoTransparente={p.fondoTransparente}>
			<AbsoluteFill style={{opacity: progreso(frame, 0, T(0.1), CURVA.suave)}}>
				<MapaBase camara={camara} opciones={{destacar: ['VEN'], intensidadDestacado: destacado}} />
			</AbsoluteFill>
			<VeloMapa transparente={p.fondoTransparente} />
			{p.mostrarRotulos && (
				<>
					<RotuloGeo camara={camara} posicion={[-68.6, 25.6]} texto="Océano Atlántico" inicio={T(0.1)} />
					<RotuloGeo camara={camara} posicion={[-72.8, 14.6]} texto="Mar Caribe" inicio={T(0.36)} />
					<RotuloGeo camara={camara} posicion={[-79.6, 21.95]} texto="Cuba" estilo="pais" inicio={T(0.22)} />
					<RotuloGeo camara={camara} posicion={[-77.35, 18.15]} texto="Jamaica" estilo="pais" inicio={T(0.3)} />
					<RotuloGeo camara={camara} posicion={[-70.25, 18.75]} texto="Rep. Dominicana" estilo="pais" tamano={0.7} inicio={T(0.3)} />
					<RotuloGeo camara={camara} posicion={[-73.4, 8.3]} texto="Colombia" estilo="pais" inicio={T(0.5)} />
				</>
			)}
			<RutaAnimada camara={camara} trazado={trazado} progreso={avance} />
			<MarcadorLugar camara={camara} posicion={lonLat('miami')} nombre={p.etiquetaOrigen} detalle="Florida" inicio={T(0.1)} principal />
			<MarcadorLugar camara={camara} posicion={fin} nombre={p.etiquetaDestino} detalle={p.detalleDestino} inicio={T(0.74)} lado="abajo" principal />
			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} subtitulo={p.subtitulo} />
			<NotaPie texto={p.notaPie} inicio={T(0.3)} />
		</Escena>
	);
};
