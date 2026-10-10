import {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {FlipPage} from '../calendar/FlipPage';
import {CW, PAPER_TEXTURE, PH, RING_COUNT, ringX} from '../calendar/PageFace';
import {CONDENSED, SERIF} from '../fonts';
import {PaginaNavidad, dayCentre} from './PaginaNavidad';
import {NavidadProps} from './schema';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const prog = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
	interpolate(f, [a, b], [0, 1], {...clamp, easing});
const smooth = Easing.bezier(0.45, 0, 0.25, 1);

// Calendar placement in the 2160x3840 frame and its 3D set-up.
const CAL_LEFT = 220;
const CAL_TOP = 1640;
const LEAN = 10;
const SWEEP = 360 - 2 * LEAN;
const PERSPECTIVE = 3400;
const PO: [number, number] = [CAL_LEFT + CW / 2, CAL_TOP + PH / 2 - 300];

/** Screen position of a point on the front page (same maths as the CSS 3D set-up). */
const project = ([x, y]: [number, number]): [number, number] => {
	const a = (LEAN * Math.PI) / 180;
	const dy = y - PH;
	const X = CAL_LEFT + x;
	const Y = CAL_TOP + PH + dy * Math.cos(a);
	const Z = dy * Math.sin(a);
	const s = PERSPECTIVE / (PERSPECTIVE - Z);
	return [PO[0] + (X - PO[0]) * s, PO[1] + (Y - PO[1]) * s];
};

const GRAIN = [0, 1, 2, 3, 4, 5].map((i) => staticFile(`grano${i}.png`));
const PRELOAD = [PAPER_TEXTURE, ...GRAIN];

// Out-of-focus lights from the tree and ornaments (background plate coordinates).
const BOKEH: [number, number, number][] = [
	[2050, 420, 70], [1990, 980, 52], [2110, 1300, 84], [2020, 1700, 46], [2080, 2280, 60], [1890, 3420, 90], [2060, 3610, 70],
];

const GoldBinding: React.FC = () => (
	<svg style={{position: 'absolute', left: 0, top: -60, width: CW, height: 140, overflow: 'visible', transform: 'translateZ(6px)'}} viewBox={`0 -60 ${CW} 140`}>
		<defs>
			<linearGradient id="brass" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor="#5A3E1C" />
				<stop offset="0.45" stopColor="#B88A45" />
				<stop offset="0.62" stopColor="#F2D49A" />
				<stop offset="1" stopColor="#6B4A22" />
			</linearGradient>
		</defs>
		{Array.from({length: RING_COUNT}, (_, i) => {
			const x = ringX(i);
			return [-7, 7].map((dx) => (
				<g key={`${i}${dx}`}>
					<path d={`M${x + dx - 6} 40 C ${x + dx - 13} -18, ${x + dx + 13} -18, ${x + dx + 6} 12`} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={9} transform="translate(3 5)" />
					<path d={`M${x + dx - 6} 40 C ${x + dx - 13} -18, ${x + dx + 13} -18, ${x + dx + 6} 12`} fill="none" stroke="url(#brass)" strokeWidth={7} strokeLinecap="round" />
				</g>
			));
		})}
	</svg>
);

/** Word-by-word reveal of a (possibly multi-line) statement. */
const Statement: React.FC<{text: string; frame: number; start: number; color: string; size: number}> = ({text, frame, start, color, size}) => {
	const lines = text.split('\n').map((l) => l.trim().split(/\s+/));
	let n = 0;
	return (
		<div style={{fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: '0.035em', color, textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>
			{lines.map((ws, li) => (
				<div key={li} style={{whiteSpace: 'nowrap'}}>
					{ws.map((w, wi) => {
						const i = n++;
						const c = prog(frame, start + i * 2.4, start + i * 2.4 + 20, Easing.bezier(0.16, 1, 0.3, 1));
						return (
							<span key={wi} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.06em'}}>
								<span style={{display: 'inline-block', transform: `translateY(${(1 - c) * 100}%)`, opacity: Math.min(1, c * 1.5)}}>
									{w}
									{wi < ws.length - 1 ? ' ' : ''}
								</span>
							</span>
						);
					})}
				</div>
			))}
		</div>
	);
};

export const CalendarioNavidad: React.FC<NavidadProps> = (props) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const {calendario: cal, colores: col, tiempos: t, textos: tx, marcas} = props;

	const [handle] = useState(() => delayRender('textures'));
	useEffect(() => {
		Promise.all(PRELOAD.map((src) => new Promise((r) => Object.assign(new Image(), {onload: r, onerror: r, src})))).then(() => continueRender(handle));
	}, [handle]);

	// ---- Page turns ---------------------------------------------------------
	const flipStarts = [t.hojaNoviembre, t.hojaDiciembre];
	const flips = cal.paginas.map((_, i) => {
		if (i >= cal.paginas.length - 1) return {p: 0, angle: 0, bend: 0};
		const s = flipStarts[i] ?? t.hojaDiciembre + (i - 1) * 36;
		const raw = prog(frame, s, s + t.duracionHoja);
		const angle = SWEEP * Easing.bezier(0.5, 0.02, 0.28, 1)(raw);
		const bend = -46 * Math.sin(Math.PI * Math.min(1, raw * 1.08)) * (1 - raw * 0.4);
		return {p: raw, angle, bend};
	});

	// ---- Marks --------------------------------------------------------------
	const sendDraw = prog(frame, t.circuloEnvio, t.circuloEnvio + 22, Easing.bezier(0.4, 0, 0.3, 1));
	const goalDraw = prog(frame, t.circuloObjetivo, t.circuloObjetivo + 20, Easing.bezier(0.4, 0, 0.3, 1));
	const marksFor = (i: number) => [
		...(i === marcas.envio.pagina ? [{dia: marcas.envio.dia, progreso: sendDraw, color: col.marcador, grosor: 9, opacidad: 0.9, semilla: 1}] : []),
		...(i === marcas.objetivo.pagina ? [{dia: marcas.objetivo.dia, progreso: goalDraw, color: col.marcadorDiscreto, grosor: 5.5, opacidad: 0.75, semilla: 2}] : []),
	];
	const face = (i: number) => {
		const pg = cal.paginas[i];
		return (
			<PaginaNavidad
				year={pg.anio}
				month={pg.mes}
				monthName={cal.meses[pg.mes - 1]}
				weekdays={cal.diasSemana}
				weekStart={cal.inicioSemana}
				paper={col.papel}
				ink={col.tinta}
				sunday={col.domingo}
				marcas={marksFor(i)}
			/>
		);
	};

	// ---- Camera ---------------------------------------------------------------
	// Opening: a slow push that leans towards the marked date. Page turns: ease
	// back to the whole page. End: close on the goal date, kept low in frame.
	const calCentre = project([CW / 2, PH * 0.55]);
	const sendPg = cal.paginas[marcas.envio.pagina];
	const goalPg = cal.paginas[marcas.objetivo.pagina];
	const sendPt = project(dayCentre(sendPg.anio, sendPg.mes, cal.inicioSemana, marcas.envio.dia) ?? [CW / 2, PH / 2]);
	const goalPt = project(dayCentre(goalPg.anio, goalPg.mes, cal.inicioSemana, marcas.objetivo.dia) ?? [CW / 2, PH / 2]);
	const open = prog(frame, 0, t.salidaTextoEnvio, Easing.inOut(Easing.sin));
	const settle = prog(frame, t.salidaTextoEnvio - 6, t.hojaNoviembre + 10, smooth);
	const close = prog(frame, t.acercamiento, t.acercamiento + 44, smooth);
	const lerp2 = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
	const leanTo = lerp2(calCentre, sendPt, 0.18 * open * (1 - settle));
	let c = lerp2(leanTo, calCentre, settle * (1 - close));
	c = lerp2(c, goalPt, close);
	const z = (1 + 0.07 * open * (1 - settle) + 0.03 * settle) * (1 + (props.camara.zoomObjetivo - 1.03) * close);
	const O = lerp2([width / 2, height * 0.56], [width / 2, height * 0.62], close);
	const tf = (k: number) => {
		const zz = 1 + (z - 1) * k;
		return `translate(${O[0] - c[0] * zz}px, ${O[1] - c[1] * zz}px) scale(${zz}) rotate(${props.camara.inclinacion * 0.3 * k}deg)`;
	};

	// ---- Texts ---------------------------------------------------------------
	const sendOut = prog(frame, t.salidaTextoEnvio, t.salidaTextoEnvio + 10, Easing.in(Easing.cubic));
	const sendDetail = prog(frame, t.textoEnvio + 16, t.textoEnvio + 34, Easing.out(Easing.cubic));
	const goalKicker = prog(frame, t.textoObjetivo - 4, t.textoObjetivo + 14, Easing.out(Easing.cubic));
	const scrim = Math.max(prog(frame, t.textoEnvio - 10, t.textoEnvio + 12) * (1 - sendOut), prog(frame, t.textoObjetivo - 12, t.textoObjetivo + 10));

	const shadowOn = (i: number) => {
		if (i === 0) return 0;
		const a = flips[i - 1].angle;
		if (a <= 0 || a >= 200) return 0;
		return Math.sin((Math.min(a, 180) * Math.PI) / 180) ** 0.7 * 0.45;
	};

	const g = Math.floor(frame / 2) % 6;
	const gx = Math.floor(random(`gx${frame}`) * 512);
	const gy = Math.floor(random(`gy${frame}`) * 512);

	return (
		<AbsoluteFill style={{backgroundColor: '#1A0F08', overflow: 'hidden'}}>
			{/* Background plate (moves less: it is far away) and soft tree lights */}
			<AbsoluteFill style={{transform: tf(0.55), transformOrigin: '0 0'}}>
				<Img src={staticFile('navidad-fondo.jpg')} style={{width: '100%', height: '100%', transform: 'scale(1.18)', transformOrigin: '50% 45%'}} />
				{BOKEH.map(([x, y, r], i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x - r,
							top: y - r,
							width: 2 * r,
							height: 2 * r,
							borderRadius: '50%',
							background: 'radial-gradient(circle, rgba(255,205,130,0.55) 0%, rgba(255,180,90,0.25) 55%, rgba(255,160,70,0) 72%)',
							mixBlendMode: 'screen',
							opacity: 0.45 + 0.35 * Math.sin(frame / 22 + i * 1.7),
						}}
					/>
				))}
			</AbsoluteFill>

			{/* Calendar, its contact shadow and the desk it stands on */}
			<AbsoluteFill style={{transform: `${tf(1)} translateZ(0)`, transformOrigin: '0 0', isolation: 'isolate'}}>
				<div
					style={{
						position: 'absolute',
						left: CAL_LEFT - 60,
						top: CAL_TOP + PH - 30,
						width: CW + 120,
						height: 120,
						background: 'radial-gradient(ellipse at 50% 40%, rgba(20,8,2,0.8), rgba(20,8,2,0) 70%)',
						filter: 'blur(16px)',
					}}
				/>
				<AbsoluteFill style={{perspective: PERSPECTIVE, perspectiveOrigin: `${PO[0]}px ${PO[1]}px`}}>
					<div
						style={{
							position: 'absolute',
							left: CAL_LEFT,
							top: CAL_TOP,
							width: CW,
							height: PH,
							transformStyle: 'preserve-3d',
							transformOrigin: '50% 100%',
							transform: `rotateX(${LEAN}deg)`,
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: -24,
								top: -14,
								width: CW + 48,
								height: PH + 46,
								borderRadius: 6,
								background: 'linear-gradient(100deg, #110C08 0%, #241A12 60%, #2E2116 100%)',
								transform: 'translateZ(-8px)',
							}}
						/>
						{[4, 3, 2, 1].map((k) => (
							<div key={k} style={{position: 'absolute', left: 2, top: 6, width: CW - 4, height: PH + k * 3, background: k % 2 ? '#D8C9AE' : '#C6B597', transform: `translateZ(${-k * 0.8}px)`}} />
						))}
						{cal.paginas
							.map((_, i) => i)
							.reverse()
							.map((i) => {
								const s = flips[i];
								if (s.p >= 1) return null;
								const shadow = shadowOn(i);
								const content = (
									<>
										{face(i)}
										{shadow > 0 && (
											<div
												style={{
													position: 'absolute',
													inset: 0,
													background: `linear-gradient(to bottom, rgba(45,22,6,${shadow}) 0%, rgba(45,22,6,${shadow * 0.45}) 35%, rgba(45,22,6,0) 80%)`,
												}}
											/>
										)}
									</>
								);
								return (
									<div key={i} style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${(cal.paginas.length - 1 - i) * 0.9}px)`}}>
										{s.angle > 0 ? <FlipPage face={content} angle={s.angle} bend={s.bend} backColor="#E2D3B8" /> : <div style={{position: 'absolute', inset: 0}}>{content}</div>}
									</div>
								);
							})}
						<GoldBinding />
						{/* Warm window light falling across the page from the left */}
						<div
							style={{
								position: 'absolute',
								inset: 0,
								transform: 'translateZ(7px)',
								pointerEvents: 'none',
								background: 'linear-gradient(105deg, rgba(255,190,110,0.16) 0%, rgba(255,170,90,0.05) 45%, rgba(60,30,10,0.16) 100%)',
								mixBlendMode: 'soft-light',
							}}
						/>
					</div>
				</AbsoluteFill>
			</AbsoluteFill>

			{/* Foreground desk items (closest, so they move most) */}
			<AbsoluteFill style={{transform: tf(1.25), transformOrigin: '0 0'}}>
				<Img src={staticFile('navidad-frente.png')} style={{position: 'absolute', left: 0, bottom: 0, width: 2160, transform: 'scale(1.2)', transformOrigin: '50% 0%'}} />
			</AbsoluteFill>

			{/* Warm grade and vignette */}
			<AbsoluteFill style={{background: 'rgba(255,150,70,0.08)', mixBlendMode: 'soft-light'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 64% at 50% 54%, rgba(0,0,0,0) 55%, rgba(14,6,2,0.55) 100%)'}} />

			{/* ---- Texts ---- */}
			<AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(14,7,3,0.62) 0%, rgba(14,7,3,0.4) 20%, rgba(14,7,3,0) 34%)', opacity: scrim}} />
			{frame >= t.textoEnvio && sendOut < 1 && (
				<div style={{position: 'absolute', left: 60, right: 60, top: 470, textAlign: 'center', opacity: 1 - sendOut, transform: `translateY(${-24 * sendOut}px)`}}>
					<Statement text={tx.envio} frame={frame} start={t.textoEnvio} color={col.texto} size={124} />
					{tx.envioDetalle && (
						<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 40, opacity: sendDetail}}>
							<div style={{height: 3, width: 130 * sendDetail, background: col.dorado}} />
							<div style={{fontFamily: CONDENSED, fontWeight: 600, fontSize: 64, letterSpacing: `${0.42 - 0.1 * sendDetail}em`, color: col.dorado, marginRight: '-0.32em', textShadow: '0 4px 16px rgba(0,0,0,0.6)'}}>
								{tx.envioDetalle}
							</div>
							<div style={{height: 3, width: 130 * sendDetail, background: col.dorado}} />
						</div>
					)}
				</div>
			)}
			{frame >= t.textoObjetivo - 4 && (
				<div style={{position: 'absolute', left: 60, right: 60, top: 400, textAlign: 'center'}}>
					<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, marginBottom: 34, opacity: goalKicker}}>
						<div style={{height: 3, width: 130 * goalKicker, background: col.dorado}} />
						<div style={{fontFamily: CONDENSED, fontWeight: 600, fontSize: 68, letterSpacing: `${0.5 - 0.12 * goalKicker}em`, color: col.dorado, marginRight: '-0.38em', textShadow: '0 4px 16px rgba(0,0,0,0.6)'}}>
							{tx.objetivoEtiqueta}
						</div>
						<div style={{height: 3, width: 130 * goalKicker, background: col.dorado}} />
					</div>
					<Statement text={tx.objetivo} frame={frame} start={t.textoObjetivo + 4} color={col.texto} size={124} />
				</div>
			)}

			{/* Film grain */}
			<AbsoluteFill
				style={{
					backgroundImage: `url(${GRAIN[g]})`,
					backgroundSize: '512px 512px',
					backgroundPosition: `${gx}px ${gy}px`,
					mixBlendMode: 'overlay',
					opacity: props.grano * 2.2,
				}}
			/>
		</AbsoluteFill>
	);
};
