import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {z} from 'zod';
import {Escena} from '../components/Escena';
import {PorConfirmar} from '../components/PorConfirmar';
import {Titulo} from '../components/Titulo';
import {CURVA, progreso} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const INICIALES_DOMINGO = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const INICIALES_LUNES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const esquemaFecha = z.object({
	dia: z.number().int().min(1).max(31),
	etiqueta: z.string(),
});

export const esquemaCalendarioNavidad = z.object({
	duracionSegundos: z.number().min(5).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	anio: z.number().int().min(2000).max(2100),
	/** Mes mostrado (1–12). */
	mes: z.number().int().min(1).max(12),
	semanaEmpiezaEn: z.enum(['domingo', 'lunes']),
	/** Fechas festivas destacadas en dorado (dentro del mes mostrado). */
	fechasDestacadas: z.array(esquemaFecha),
	/** Fecha límite de envío (dentro del mes mostrado). Vacío (null) = dato por confirmar. */
	fechaLimite: esquemaFecha.nullable(),
	textoFechaLimite: z.string(),
});

export const propsCalendarioNavidad: z.infer<typeof esquemaCalendarioNavidad> = {
	duracionSegundos: 15,
	fondoTransparente: false,
	antetitulo: 'Temporada navideña',
	titulo: 'Calendario de Navidad',
	anio: 2026,
	mes: 12,
	semanaEmpiezaEn: 'domingo',
	fechasDestacadas: [
		{dia: 24, etiqueta: 'Nochebuena'},
		{dia: 25, etiqueta: 'Navidad'},
	],
	fechaLimite: null,
	textoFechaLimite: 'Fecha límite de envío',
};

const COLS = 7;
const GX0 = SEGURO.lateral;
const GX1 = 2160 - SEGURO.lateral;
const HUECO = 22;
const CELDA = (GX1 - GX0 - HUECO * (COLS - 1)) / COLS;
const ALTO_CELDA = 232;
const GY0 = 1330;

export const CalendarioNavidad: React.FC<z.infer<typeof esquemaCalendarioNavidad>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	// Calendario real calculado en UTC (independiente de la zona horaria del equipo).
	const diasMes = new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate();
	const primerDia = new Date(Date.UTC(p.anio, p.mes - 1, 1)).getUTCDay(); // 0 = domingo
	const desfase = p.semanaEmpiezaEn === 'domingo' ? primerDia : (primerDia + 6) % 7;
	const iniciales = p.semanaEmpiezaEn === 'domingo' ? INICIALES_DOMINGO : INICIALES_LUNES;
	const finSemana = p.semanaEmpiezaEn === 'domingo' ? [0, 6] : [5, 6];

	const pCabecera = progreso(frame, T(0.12), T(0.12));
	const inicioCeldas = T(0.18);
	const pDestacar = progreso(frame, T(0.5), T(0.12), CURVA.suave);
	const pLimite = progreso(frame, T(0.64), T(0.12));

	const destacada = (d: number) => p.fechasDestacadas.find((f) => f.dia === d);
	const limite = p.fechaLimite && p.fechaLimite.dia <= diasMes ? p.fechaLimite : null;
	const filas = Math.ceil((desfase + diasMes) / COLS);

	const nombreFechaLimite = limite
		? `${DIAS_LARGOS[new Date(Date.UTC(p.anio, p.mes - 1, limite.dia)).getUTCDay()]} ${limite.dia} de ${MESES[p.mes - 1]}`
		: '';

	return (
		<Escena fondoTransparente={p.fondoTransparente} luzY={0.3}>
			{/* Luces cálidas lejanas, muy sutiles */}
			{!p.fondoTransparente && (
				<svg width={2160} height={3840} style={{position: 'absolute', inset: 0}}>
					<defs>
						<radialGradient id="luzBokeh">
							<stop offset="0" stopColor="#f0c27a" stopOpacity="0.5" />
							<stop offset="0.7" stopColor="#f0c27a" stopOpacity="0.12" />
							<stop offset="1" stopColor="#f0c27a" stopOpacity="0" />
						</radialGradient>
					</defs>
					{Array.from({length: 14}, (_, i) => {
						const x = random(`bx${i}`) * 2160;
						const y = 120 + random(`by${i}`) * 900;
						const r = 40 + random(`br${i}`) * 90;
						const titileo = 0.55 + 0.45 * Math.sin(frame / (18 + random(`bt${i}`) * 20) + i);
						return <circle key={i} cx={x} cy={y + Math.sin(frame / 60 + i) * 6} r={r} fill="url(#luzBokeh)" opacity={0.35 * titileo * progreso(frame, 0, T(0.2))} />;
					})}
				</svg>
			)}

			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} tamano={180} />

			{/* Mes y año */}
			<div style={{position: 'absolute', top: 1070, left: GX0, right: 2160 - GX1, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: pCabecera}}>
				<div style={{fontFamily: FUENTE.titulo, fontWeight: 600, fontSize: 120, color: COLOR.beige, textTransform: 'capitalize'}}>{MESES[p.mes - 1]}</div>
				<div style={{fontFamily: FUENTE.etiqueta, fontWeight: 500, fontSize: 80, letterSpacing: '0.2em', color: COLOR.dorado}}>{p.anio}</div>
			</div>
			<div style={{position: 'absolute', top: GY0 - 20, left: GX0, width: GX1 - GX0, height: 3, background: `rgba(217,183,110,${0.5 * pCabecera})`}} />

			{/* Iniciales de los días */}
			{iniciales.map((d, i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						top: GY0 + 10,
						left: GX0 + i * (CELDA + HUECO),
						width: CELDA,
						textAlign: 'center',
						fontFamily: FUENTE.etiqueta,
						fontWeight: 600,
						fontSize: 54,
						letterSpacing: '0.1em',
						color: finSemana.includes(i) ? COLOR.dorado : COLOR.beigeTenue,
						opacity: pCabecera,
					}}
				>
					{d}
				</div>
			))}

			{/* Días */}
			{Array.from({length: diasMes}, (_, k) => {
				const dia = k + 1;
				const pos = desfase + k;
				const col = pos % COLS;
				const fila = Math.floor(pos / COLS);
				const x = GX0 + col * (CELDA + HUECO);
				const y = GY0 + 110 + fila * (ALTO_CELDA + HUECO);
				const aparicion = progreso(frame, inicioCeldas + (fila + col) * 2.2, 18);
				const fiesta = destacada(dia);
				const esLimite = limite?.dia === dia;
				const realce = (fiesta || esLimite ? 1 : 0) * pDestacar;
				return (
					<div
						key={dia}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: CELDA,
							height: ALTO_CELDA,
							borderRadius: 18,
							background: fiesta
								? `linear-gradient(160deg, rgba(217,183,110,${0.06 + 0.22 * realce}), rgba(160,110,45,${0.04 + 0.16 * realce}))`
								: 'linear-gradient(160deg, rgba(233,220,196,0.07), rgba(233,220,196,0.025))',
							border: esLimite
								? `3px dashed rgba(230,169,79,${0.3 + 0.7 * realce})`
								: `2px solid ${fiesta ? `rgba(217,183,110,${0.2 + 0.7 * realce})` : 'rgba(233,220,196,0.10)'}`,
							boxShadow: `0 18px 40px rgba(0,0,0,0.35)${fiesta ? `, 0 0 ${60 * realce}px rgba(217,183,110,${0.3 * realce})` : ''}`,
							opacity: aparicion,
							transform: `translateY(${(1 - aparicion) * 40}px)`,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<div
							style={{
								fontFamily: FUENTE.titulo,
								fontWeight: fiesta ? 700 : 600,
								fontSize: 104,
								lineHeight: 1,
								color: fiesta && realce > 0.5 ? COLOR.doradoSuave : finSemana.includes(col) ? 'rgba(233,220,196,0.62)' : COLOR.beige,
								fontVariantNumeric: 'lining-nums',
							}}
						>
							{dia}
						</div>
						{(fiesta || esLimite) && (
							<div
								style={{
									fontFamily: FUENTE.etiqueta,
									fontWeight: 600,
									fontSize: 27,
									letterSpacing: '0.08em',
									textTransform: 'uppercase',
									color: esLimite ? COLOR.ambarClaro : COLOR.dorado,
									marginTop: 12,
									opacity: realce,
									whiteSpace: 'nowrap',
								}}
							>
								{esLimite ? limite!.etiqueta : fiesta!.etiqueta}
							</div>
						)}
					</div>
				);
			})}

			{/* Fecha límite de envío */}
			<AbsoluteFill>
				<div
					style={{
						position: 'absolute',
						left: SEGURO.lateral + 100,
						right: SEGURO.lateral + 100,
						top: GY0 + 110 + filas * (ALTO_CELDA + HUECO) + 90,
						padding: '56px 40px',
						borderRadius: 26,
						border: `2px solid rgba(217,183,110,0.45)`,
						background: 'linear-gradient(160deg, rgba(43,31,23,0.85), rgba(26,22,19,0.85))',
						boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
						textAlign: 'center',
						opacity: pLimite,
						transform: `translateY(${(1 - pLimite) * 40}px)`,
					}}
				>
					<div style={{fontFamily: FUENTE.etiqueta, fontWeight: 600, fontSize: 52, letterSpacing: '0.3em', textTransform: 'uppercase', color: COLOR.dorado}}>
						{p.textoFechaLimite}
					</div>
					<div style={{marginTop: 26}}>
						{limite ? (
							<span style={{fontFamily: FUENTE.titulo, fontWeight: 600, fontSize: 104, color: COLOR.beige}}>{nombreFechaLimite.charAt(0).toUpperCase() + nombreFechaLimite.slice(1)}</span>
						) : (
							<PorConfirmar tamano={40} />
						)}
					</div>
				</div>
			</AbsoluteFill>
		</Escena>
	);
};
