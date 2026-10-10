import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {Escena} from '../components/Escena';
import {PorConfirmar} from '../components/PorConfirmar';
import {Titulo} from '../components/Titulo';
import {CURVA, progreso} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

export const esquemaTiempoEntrega = z.object({
	duracionSegundos: z.number().min(5).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	/** Tiempo mínimo. Vacío (null) = dato por confirmar. */
	tiempoMinimo: z.number().int().min(0).nullable(),
	/** Tiempo máximo. Vacío (null) = dato por confirmar. */
	tiempoMaximo: z.number().int().min(0).nullable(),
	unidad: z.string(),
	origen: z.string(),
	destino: z.string(),
	nota: z.string(),
});

export const propsTiempoEntrega: z.infer<typeof esquemaTiempoEntrega> = {
	duracionSegundos: 15,
	fondoTransparente: false,
	antetitulo: 'De Tampa a Venezuela',
	titulo: 'Tiempo de entrega',
	tiempoMinimo: null,
	tiempoMaximo: null,
	unidad: 'semanas',
	origen: 'Tampa',
	destino: 'Venezuela',
	nota: '',
};

const CX = 1080;
const CY = 1930;
const RADIO = 640;

/** Esfera de reloj con marcas finas y un arco que se completa. */
const Esfera: React.FC<{avance: number; aparicion: number}> = ({avance, aparicion}) => {
	const marcas = 120;
	const arco = 2 * Math.PI * RADIO;
	return (
		<svg width={2160} height={3840} style={{position: 'absolute', inset: 0}}>
			<defs>
				<linearGradient id="arcoDorado" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={COLOR.doradoSuave} />
					<stop offset="0.5" stopColor={COLOR.ambarClaro} />
					<stop offset="1" stopColor={COLOR.ambar} />
				</linearGradient>
				<radialGradient id="discoEsfera" cx="0.4" cy="0.35" r="0.75">
					<stop offset="0" stopColor="#2e231b" />
					<stop offset="0.7" stopColor="#1a1410" />
					<stop offset="1" stopColor="#120e0b" />
				</radialGradient>
				<filter id="sombraEsfera" x="-30%" y="-30%" width="160%" height="160%">
					<feDropShadow dx="0" dy="30" stdDeviation="40" floodColor="#000" floodOpacity="0.6" />
				</filter>
				<filter id="brilloArco" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="12" />
				</filter>
			</defs>
			<g opacity={aparicion} transform={`translate(${CX} ${CY}) scale(${0.94 + aparicion * 0.06})`}>
				<circle r={RADIO + 70} fill="url(#discoEsfera)" filter="url(#sombraEsfera)" />
				<circle r={RADIO + 70} fill="none" stroke="rgba(217,183,110,0.35)" strokeWidth={3} />
				<circle r={RADIO - 70} fill="none" stroke="rgba(233,220,196,0.08)" strokeWidth={2} />
				{Array.from({length: marcas}, (_, i) => {
					const ang = (i / marcas) * Math.PI * 2 - Math.PI / 2;
					const larga = i % 10 === 0;
					const r1 = RADIO + 40;
					const r2 = r1 - (larga ? 52 : 26);
					const encendida = i / marcas <= avance;
					return (
						<line
							key={i}
							x1={Math.cos(ang) * r1}
							y1={Math.sin(ang) * r1}
							x2={Math.cos(ang) * r2}
							y2={Math.sin(ang) * r2}
							stroke={encendida ? COLOR.doradoSuave : 'rgba(233,220,196,0.22)'}
							strokeWidth={larga ? 5 : 3}
							strokeLinecap="round"
						/>
					);
				})}
				<g transform="rotate(-90)">
					<circle r={RADIO - 20} fill="none" stroke="rgba(233,220,196,0.07)" strokeWidth={14} />
					<circle r={RADIO - 20} fill="none" stroke={COLOR.ambar} strokeOpacity={0.5} strokeWidth={30} strokeDasharray={`${avance * arco} ${arco}`} filter="url(#brilloArco)" />
					<circle r={RADIO - 20} fill="none" stroke="url(#arcoDorado)" strokeWidth={14} strokeLinecap="round" strokeDasharray={`${avance * arco} ${arco}`} />
				</g>
			</g>
		</svg>
	);
};

export const TiempoEntrega: React.FC<z.infer<typeof esquemaTiempoEntrega>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	const aparicion = progreso(frame, T(0.08), T(0.16), CURVA.salida);
	const avance = progreso(frame, T(0.18), T(0.5), CURVA.suave);
	const pNumero = progreso(frame, T(0.2), T(0.14));
	const pRiel = progreso(frame, T(0.5), T(0.1));
	const viaje = progreso(frame, T(0.56), T(0.32), CURVA.suave);

	const pendiente = p.tiempoMinimo === null || p.tiempoMaximo === null;
	const contar = (n: number | null) => (n === null ? '00' : String(Math.round(interpolate(avance, [0, 1], [0, n]))));
	const cifra = p.tiempoMinimo === p.tiempoMaximo && !pendiente ? contar(p.tiempoMinimo) : `${contar(p.tiempoMinimo)}–${contar(p.tiempoMaximo)}`;
	const marcasRiel = Math.max(2, Math.min(16, p.tiempoMaximo ?? 8));

	const RX1 = SEGURO.lateral + 120;
	const RX2 = 2160 - SEGURO.lateral - 120;
	const RY = 3020;
	const cajaX = RX1 + (RX2 - RX1) * viaje;

	return (
		<Escena fondoTransparente={p.fondoTransparente} luzY={0.45}>
			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} />
			<Esfera avance={avance} aparicion={aparicion} />

			{/* Cifra central */}
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', top: CY - 1920}}>
				<div style={{textAlign: 'center', opacity: pNumero, transform: `translateY(${(1 - pNumero) * 40}px)`}}>
					<div
						style={{
							fontFamily: FUENTE.titulo,
							fontWeight: 600,
							fontSize: 400,
							lineHeight: 0.9,
							color: pendiente ? 'rgba(233,220,196,0.35)' : COLOR.beige,
							fontVariantNumeric: 'lining-nums tabular-nums',
							textShadow: '0 20px 60px rgba(0,0,0,0.5)',
						}}
					>
						{cifra}
					</div>
					<div
						style={{
							fontFamily: FUENTE.etiqueta,
							fontWeight: 500,
							fontSize: 92,
							letterSpacing: '0.4em',
							marginLeft: '0.4em',
							textTransform: 'uppercase',
							color: COLOR.dorado,
							marginTop: 30,
						}}
					>
						{p.unidad}
					</div>
					{pendiente && (
						<div style={{marginTop: 46}}>
							<PorConfirmar opacidad={progreso(frame, T(0.3), T(0.1))} />
						</div>
					)}
				</div>
			</AbsoluteFill>

			{/* Riel del trayecto */}
			<svg width={2160} height={3840} style={{position: 'absolute', inset: 0, opacity: pRiel}}>
				<line x1={RX1} y1={RY} x2={RX2} y2={RY} stroke="rgba(233,220,196,0.2)" strokeWidth={4} />
				<line x1={RX1} y1={RY} x2={cajaX} y2={RY} stroke={COLOR.ambarClaro} strokeWidth={6} />
				{Array.from({length: marcasRiel + 1}, (_, i) => {
					const x = RX1 + ((RX2 - RX1) * i) / marcasRiel;
					return <line key={i} x1={x} y1={RY - 18} x2={x} y2={RY + 18} stroke={x <= cajaX ? COLOR.dorado : 'rgba(233,220,196,0.3)'} strokeWidth={3} />;
				})}
				<circle cx={RX1} cy={RY} r={16} fill={COLOR.doradoSuave} />
				<circle cx={RX2} cy={RY} r={16} fill={viaje > 0.99 ? COLOR.ambarClaro : 'none'} stroke={COLOR.doradoSuave} strokeWidth={4} />
				{/* Caja que recorre el trayecto */}
				<g transform={`translate(${cajaX} ${RY - 74})`}>
					<ellipse cx={0} cy={74} rx={50} ry={10} fill="rgba(0,0,0,0.5)" />
					<path d="M -46 -36 L 0 -58 L 46 -36 L 0 -14 Z" fill="#c99a63" />
					<path d="M -46 -36 L 0 -14 L 0 50 L -46 28 Z" fill="#a8794a" />
					<path d="M 46 -36 L 0 -14 L 0 50 L 46 28 Z" fill="#8c623a" />
					<path d="M -23 -47 L 23 -25 L 23 -19 L -23 -41 Z" fill="#e2c48e" opacity="0.8" />
				</g>
			</svg>
			{[
				{x: RX1, texto: p.origen},
				{x: RX2, texto: p.destino},
			].map((e) => (
				<div
					key={e.texto}
					style={{
						position: 'absolute',
						left: e.x,
						top: RY + 60,
						transform: 'translateX(-50%)',
						fontFamily: FUENTE.etiqueta,
						fontWeight: 600,
						fontSize: 64,
						letterSpacing: '0.14em',
						textTransform: 'uppercase',
						color: COLOR.beige,
						opacity: pRiel,
					}}
				>
					{e.texto}
				</div>
			))}
			{p.nota && (
				<div
					style={{
						position: 'absolute',
						left: SEGURO.lateral,
						right: SEGURO.lateral,
						top: RY + 200,
						textAlign: 'center',
						fontFamily: FUENTE.titulo,
						fontStyle: 'italic',
						fontSize: 64,
						color: COLOR.beigeTenue,
						opacity: progreso(frame, T(0.6), T(0.1)),
					}}
				>
					{p.nota}
				</div>
			)}
		</Escena>
	);
};
