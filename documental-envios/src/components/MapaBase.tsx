import React, {useMemo} from 'react';
import {useVideoConfig} from 'remotion';
import {type Camara, obtenerCapas} from '../lib/mapa';
import {COLOR} from '../lib/tema';

export type OpcionesMapa = {
	/** Código ISO-3 del país a destacar (p. ej. "VEN"). */
	destacar?: string[];
	/** Intensidad del país destacado (0–1), animable. */
	intensidadDestacado?: number;
	estados?: boolean;
	opacidadEstados?: number;
	rios?: boolean;
	lagos?: boolean;
	batimetria?: boolean;
	reticula?: boolean;
	/** Muestra la Guayana Esequiba como zona en reclamación (rayado). */
	zonaReclamacion?: boolean;
};

/**
 * Mapa base con datos reales de Natural Earth 10m: océano con batimetría,
 * tierra con sombra proyectada, costas, ríos, lagos y límites.
 */
export const MapaBase: React.FC<{camara: Camara; opciones?: OpcionesMapa}> = ({camara, opciones = {}}) => {
	const {width, height} = useVideoConfig();
	const capas = useMemo(() => obtenerCapas(), []);
	const {
		destacar = [],
		intensidadDestacado = 1,
		estados = false,
		opacidadEstados = 1,
		rios = true,
		lagos = true,
		batimetria = true,
		reticula = true,
		zonaReclamacion = false,
	} = opciones;
	const destacados = capas.paises.filter((p) => destacar.includes(p.iso));
	// Grosor de línea constante en pantalla, independiente del zoom.
	const px = (n: number) => n / camara.escala;

	return (
		<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
			<defs>
				<linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#14424a" />
					<stop offset="0.55" stopColor={COLOR.oceano} />
					<stop offset="1" stopColor={COLOR.oceanoProfundo} />
				</linearGradient>
				<radialGradient id="luzMar" cx="0.35" cy="0.3" r="0.8">
					<stop offset="0" stopColor="rgba(230,190,120,0.10)" />
					<stop offset="1" stopColor="rgba(230,190,120,0)" />
				</radialGradient>
				<filter id="sombraTierra" x="-10%" y="-10%" width="120%" height="120%">
					<feGaussianBlur stdDeviation="16" />
				</filter>
				<filter id="brilloDestacado" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="22" />
				</filter>
				<pattern id="rayado" width={px(18)} height={px(18)} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2={px(18)} stroke={COLOR.ambar} strokeWidth={px(4)} strokeOpacity="0.55" />
				</pattern>
			</defs>

			{/* Océano */}
			<rect width={width} height={height} fill="url(#mar)" />
			<g transform={camara.transform}>
				{batimetria && (
					<>
						<path d={capas.bati1000} fill="#0f343b" stroke="rgba(233,220,196,0.05)" strokeWidth={px(2)} />
						<path d={capas.bati3000} fill="#0b2b33" stroke="rgba(233,220,196,0.045)" strokeWidth={px(2)} />
					</>
				)}
				{reticula && <path d={capas.reticula} fill="none" stroke="rgba(233,220,196,0.07)" strokeWidth={px(2)} />}
			</g>
			<rect width={width} height={height} fill="url(#luzMar)" />

			{/* Sombra de la tierra sobre el mar (en espacio de pantalla) */}
			<g filter="url(#sombraTierra)" transform="translate(10 18)" opacity="0.7">
				<g transform={camara.transform}>
					<path d={capas.tierra} fill="#020a0c" />
				</g>
			</g>

			<g transform={camara.transform}>
				{/* Resplandor costero */}
				<path d={capas.tierra} fill="none" stroke={COLOR.ambar} strokeOpacity="0.10" strokeWidth={px(14)} strokeLinejoin="round" />
				{/* Tierra */}
				<path d={capas.tierra} fill={COLOR.tierra} />
				{/* Límites internacionales */}
				{capas.paises.map((p) => (
					<path key={p.iso + p.d.length} d={p.d} fill="none" stroke="rgba(233,220,196,0.16)" strokeWidth={px(2)} />
				))}

				{/* País destacado */}
				{destacados.map((p) => (
					<g key={p.iso} opacity={intensidadDestacado}>
						<path d={p.d} fill={COLOR.ambar} opacity="0.35" filter="url(#brilloDestacado)" />
						<path d={p.d} fill={COLOR.tierraClara} />
						<path d={p.d} fill={COLOR.ambar} opacity="0.16" />
					</g>
				))}

				{zonaReclamacion && <path d={capas.reclamacion} fill="url(#rayado)" stroke={COLOR.ambar} strokeOpacity="0.6" strokeWidth={px(2.5)} strokeDasharray={`${px(10)} ${px(8)}`} />}

				{estados && (
					<g opacity={opacidadEstados}>
						{capas.estados.map((e, i) => (
							<path key={i} d={e.d} fill="none" stroke="rgba(233,220,196,0.22)" strokeWidth={px(1.6)} />
						))}
					</g>
				)}

				{lagos && <path d={capas.lagos} fill={COLOR.oceano} stroke="rgba(200,169,120,0.35)" strokeWidth={px(1.5)} />}
				{rios &&
					capas.rios.map((r, i) => (
						<path key={i} d={r.d} fill="none" stroke="#2c6a70" strokeOpacity="0.85" strokeWidth={px(r.rango <= 3 ? 4 : 2.5)} strokeLinecap="round" />
					))}

				{/* Línea de costa */}
				<path d={capas.tierra} fill="none" stroke={COLOR.costa} strokeOpacity="0.55" strokeWidth={px(2.2)} strokeLinejoin="round" />
				{destacados.map((p) => (
					<path key={'b' + p.iso} d={p.d} fill="none" stroke={COLOR.dorado} strokeOpacity={0.9 * intensidadDestacado} strokeWidth={px(4)} strokeLinejoin="round" />
				))}
			</g>
		</svg>
	);
};
