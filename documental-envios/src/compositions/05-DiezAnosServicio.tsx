import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {Escena} from '../components/Escena';
import {CURVA, progreso} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

export const esquemaDiezAnos = z.object({
	duracionSegundos: z.number().min(5).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	anos: z.number().int().min(1).max(99),
	textoAnos: z.string(),
	textoServicio: z.string(),
	lema: z.string(),
	/** Año de inicio del servicio. Vacío (null) = no se muestran años. */
	anioInicio: z.number().int().min(1950).max(2100).nullable(),
});

export const propsDiezAnos: z.infer<typeof esquemaDiezAnos> = {
	duracionSegundos: 15,
	fondoTransparente: false,
	antetitulo: 'Una trayectoria',
	anos: 10,
	textoAnos: 'años',
	textoServicio: 'de servicio',
	lema: 'Desde Tampa hacia Venezuela',
	anioInicio: null,
};

export const DiezAnosServicio: React.FC<z.infer<typeof esquemaDiezAnos>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	const pAnte = progreso(frame, T(0.04), T(0.12));
	const pCifra = progreso(frame, T(0.08), T(0.16));
	const cuenta = progreso(frame, T(0.1), T(0.42), CURVA.suave);
	const numero = Math.max(1, Math.round(interpolate(cuenta, [0, 1], [1, p.anos])));
	const pTexto = progreso(frame, T(0.36), T(0.14));
	const pServicio = progreso(frame, T(0.44), T(0.14));
	const pLema = progreso(frame, T(0.6), T(0.14));
	// Barrido de luz sobre el metal dorado (determinista).
	const barrido = interpolate(frame, [T(0.5), T(0.78)], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: CURVA.suave});

	const segmentos = Math.min(p.anos, 30);
	const X0 = SEGURO.lateral + 80;
	const X1 = 2160 - SEGURO.lateral - 80;
	const ancho = (X1 - X0) / segmentos;

	return (
		<Escena fondoTransparente={p.fondoTransparente} luzY={0.38}>
			<AbsoluteFill style={{alignItems: 'center'}}>
				<div
					style={{
						position: 'absolute',
						top: 760,
						fontFamily: FUENTE.etiqueta,
						fontWeight: 500,
						fontSize: 62,
						letterSpacing: `${0.46 - pAnte * 0.1}em`,
						textTransform: 'uppercase',
						color: COLOR.dorado,
						opacity: pAnte,
					}}
				>
					{p.antetitulo}
				</div>

				{/* Cifra principal en dorado metálico */}
				<div
					style={{
						position: 'absolute',
						top: 880,
						width: '100%',
						textAlign: 'center',
						opacity: pCifra,
						transform: `scale(${0.96 + pCifra * 0.04})`,
					}}
				>
					<span
						style={{
							fontFamily: FUENTE.titulo,
							fontWeight: 700,
							fontSize: 1100,
							lineHeight: 1,
							fontVariantNumeric: 'lining-nums',
							backgroundImage: `linear-gradient(115deg, rgba(255,255,255,0) ${barrido - 14}%, rgba(255,246,222,0.85) ${barrido}%, rgba(255,255,255,0) ${barrido + 14}%), linear-gradient(180deg, #f3e2b6 0%, ${COLOR.dorado} 38%, #a8792f 62%, #e2c27f 82%, #8a5f26 100%)`,
							WebkitBackgroundClip: 'text',
							backgroundClip: 'text',
							color: 'transparent',
							filter: 'drop-shadow(0 30px 50px rgba(0,0,0,0.55))',
						}}
					>
						{numero}
					</span>
				</div>

				<div
					style={{
						position: 'absolute',
						top: 2080,
						fontFamily: FUENTE.etiqueta,
						fontWeight: 600,
						fontSize: 190,
						letterSpacing: `${0.5 - pTexto * 0.12}em`,
						marginLeft: '0.38em',
						textTransform: 'uppercase',
						color: COLOR.beige,
						opacity: pTexto,
					}}
				>
					{p.textoAnos}
				</div>
				<div
					style={{
						position: 'absolute',
						top: 2330,
						fontFamily: FUENTE.titulo,
						fontStyle: 'italic',
						fontWeight: 500,
						fontSize: 140,
						color: COLOR.doradoSuave,
						opacity: pServicio,
						transform: `translateY(${(1 - pServicio) * 30}px)`,
					}}
				>
					{p.textoServicio}
				</div>
			</AbsoluteFill>

			{/* Línea de tiempo: un segmento por año */}
			<svg width={2160} height={3840} style={{position: 'absolute', inset: 0}}>
				{Array.from({length: segmentos}, (_, i) => {
					const encendido = progreso(frame, T(0.1) + (T(0.42) / segmentos) * i, 10);
					const x = X0 + ancho * i;
					return (
						<g key={i}>
							<rect x={x + 8} y={2700} width={ancho - 16} height={14} rx={7} fill="rgba(233,220,196,0.12)" />
							<rect x={x + 8} y={2700} width={(ancho - 16) * encendido} height={14} rx={7} fill={COLOR.dorado} />
						</g>
					);
				})}
			</svg>
			{p.anioInicio !== null &&
				[
					{x: X0 + 8, texto: String(p.anioInicio), alin: 'left' as const},
					{x: X1 - 8, texto: String(p.anioInicio + p.anos), alin: 'right' as const},
				].map((a) => (
					<div
						key={a.texto}
						style={{
							position: 'absolute',
							top: 2750,
							left: a.alin === 'left' ? a.x : undefined,
							right: a.alin === 'right' ? 2160 - a.x : undefined,
							fontFamily: FUENTE.etiqueta,
							fontWeight: 500,
							fontSize: 56,
							letterSpacing: '0.12em',
							color: COLOR.beigeTenue,
							opacity: progreso(frame, T(0.2), T(0.1)),
						}}
					>
						{a.texto}
					</div>
				))}

			<div
				style={{
					position: 'absolute',
					top: 2900,
					left: SEGURO.lateral,
					right: SEGURO.lateral,
					textAlign: 'center',
					fontFamily: FUENTE.titulo,
					fontWeight: 500,
					fontStyle: 'italic',
					fontSize: 84,
					color: COLOR.beigeTenue,
					opacity: pLema,
				}}
			>
				{p.lema}
			</div>
		</Escena>
	);
};
