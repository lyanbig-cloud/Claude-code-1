import {useEffect, useState} from 'react';
import {
	AbsoluteFill,
	Easing,
	Img,
	continueRender,
	delayRender,
	interpolate,
	random,
	staticFile,
	useCurrentFrame,
} from 'remotion';
import {FlipPage} from './calendar/FlipPage';
import {CW, PAPER_TEXTURE, PH, PageFace, RING_COUNT, ringX} from './calendar/PageFace';
import {SANS, SERIF} from './fonts';
import {Props} from './schema';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const prog = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
	interpolate(f, [a, b], [0, 1], {...clamp, easing});

// Calendar placement in the 2160x3840 frame (matches the reference's framing).
const CAL_LEFT = 380;
const CAL_TOP = 1270;
const LEAN = 10; // degrees the tent's front face leans back
const SWEEP = 360 - 2 * LEAN; // front face -> back face of the tent
const FOCUS = {x: CAL_LEFT + CW / 2, y: CAL_TOP + PH * 0.5};

const GRAIN = [0, 1, 2, 3, 4, 5].map((i) => staticFile(`grano${i}.png`));

const usePreload = (urls: string[]) => {
	const [handle] = useState(() => delayRender('textures'));
	useEffect(() => {
		Promise.all(
			urls.map(
				(src) =>
					new Promise((resolve) => {
						const img = new Image();
						img.onload = img.onerror = resolve;
						img.src = src;
					}),
			),
		).then(() => continueRender(handle));
	}, [handle, urls]);
};
const PRELOAD = [PAPER_TEXTURE, ...GRAIN];

/** Twin-wire binding drawn over the top of the stack. */
const Binding: React.FC = () => (
	<svg
		style={{position: 'absolute', left: 0, top: -60, width: CW, height: 140, overflow: 'visible', transform: 'translateZ(6px)'}}
		viewBox={`0 -60 ${CW} 140`}
	>
		<defs>
			<linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor="#1B1714" />
				<stop offset="0.45" stopColor="#5A524A" />
				<stop offset="0.6" stopColor="#B9AC98" />
				<stop offset="1" stopColor="#2A241F" />
			</linearGradient>
		</defs>
		{Array.from({length: RING_COUNT}, (_, i) => {
			const x = ringX(i);
			return [-7, 7].map((dx) => (
				<g key={`${i}${dx}`}>
					<path
						d={`M${x + dx - 6} 40 C ${x + dx - 13} -18, ${x + dx + 13} -18, ${x + dx + 6} 12`}
						fill="none"
						stroke="rgba(0,0,0,0.35)"
						strokeWidth={9}
						transform="translate(3 5)"
					/>
					<path
						d={`M${x + dx - 6} 40 C ${x + dx - 13} -18, ${x + dx + 13} -18, ${x + dx + 6} 12`}
						fill="none"
						stroke="url(#wire)"
						strokeWidth={7}
						strokeLinecap="round"
					/>
				</g>
			));
		})}
	</svg>
);

export const CalendarioEntrega: React.FC<Props> = (props) => {
	const frame = useCurrentFrame();
	usePreload(PRELOAD);
	const {calendario: cal, colores: col, tiempos: t, textos} = props;
	const pages = cal.paginas;
	const flips = pages.length - 1;

	// ---- Page turns ---------------------------------------------------------
	// Lift slowly, swing quickly through the top, settle onto the back.
	const turn = Easing.bezier(0.55, 0.02, 0.3, 1);
	const flipState = pages.map((_, i) => {
		if (i >= flips) return {p: 0, angle: 0, bend: 0};
		const start = t.primeraHoja + i * t.intervaloHojas;
		const raw = prog(frame, start, start + t.duracionHoja);
		const p = turn(raw);
		// The free edge trails while the sheet accelerates, then catches up.
		const bend = -62 * Math.sin(Math.PI * Math.min(1, raw * 1.1)) * (1 - raw * 0.4);
		return {p: raw, angle: SWEEP * p, bend};
	});

	const face = (i: number, highlight = false) => {
		const pg = pages[i];
		const hl = highlight
			? {
					from: cal.rangoInicio,
					to: cal.rangoFin,
					progress: prog(frame, t.rangoInicio, t.rangoFin, Easing.inOut(Easing.cubic)),
					startIcon: prog(frame, t.rangoInicio - 2, t.rangoInicio + 8, Easing.out(Easing.back(1.6))),
					endIcon: prog(frame, t.rangoFin - 4, t.rangoFin + 6, Easing.out(Easing.back(1.6))),
					arrow: prog(frame, t.rangoFin - 14, t.rangoFin - 2, Easing.inOut(Easing.cubic)),
					band: col.rango,
					accent: col.acento,
				}
			: undefined;
		return (
			<PageFace
				year={pg.anio}
				month={pg.mes}
				monthName={cal.meses[pg.mes - 1]}
				weekdays={cal.diasSemana}
				weekStart={cal.inicioSemana}
				showYear={cal.mostrarAnio}
				paper={col.papel}
				ink={col.tinta}
				accent={col.acento}
				highlight={hl}
			/>
		);
	};

	// ---- Camera -------------------------------------------------------------
	const push = prog(frame, 0, 119, Easing.bezier(0.33, 0, 0.3, 1));
	const zoom = 1 + (props.camara.acercamiento - 1) * push;
	const bgZoom = 1 + (props.camara.acercamiento - 1) * 0.35 * push;
	const fgZoom = 1 + (props.camara.acercamiento - 1) * 1.45 * push;
	// A breath of hand-held float, far below the threshold of "shake".
	const floatX = Math.sin(frame / 37) * 3;
	const floatY = Math.cos(frame / 43) * 2.5;
	const tilt = props.camara.inclinacion + Math.sin(frame / 60) * 0.15;
	const origin = `${FOCUS.x}px ${FOCUS.y}px`;

	// ---- Title --------------------------------------------------------------
	const chars = Array.from(textos.titulo);
	const titleTrack = interpolate(frame, [t.titulo, t.titulo + 34], [0.12, 0.035], {...clamp, easing: Easing.out(Easing.cubic)});
	const sub = prog(frame, t.subtitulo, t.subtitulo + 22, Easing.out(Easing.cubic));
	const rule = prog(frame, t.subtitulo - 6, t.subtitulo + 20, Easing.inOut(Easing.cubic));
	const titleScrim = prog(frame, t.titulo - 12, t.titulo + 16);

	const g = Math.floor(frame / 2) % 6;
	const gx = Math.floor(random(`gx${frame}`) * 512);
	const gy = Math.floor(random(`gy${frame}`) * 512);

	// Shadow cast on the sheet underneath by a page that is lifting.
	const shadowOn = (i: number) => {
		if (i === 0) return 0;
		const a = flipState[i - 1].angle;
		if (a <= 0 || a >= 200) return 0;
		return Math.sin((Math.min(a, 180) * Math.PI) / 180) ** 0.7 * 0.5;
	};

	return (
		<AbsoluteFill style={{backgroundColor: '#1E120A', overflow: 'hidden'}}>
			{/* Background plate: the port at sunset, defocused */}
			<AbsoluteFill style={{transform: `scale(${bgZoom}) rotate(${tilt * 0.5}deg)`, transformOrigin: origin}}>
				<Img src={staticFile('fondo.jpg')} style={{width: '100%', height: '100%'}} />
			</AbsoluteFill>

			{/* Contact shadow of the calendar on the table */}
			<AbsoluteFill style={{transform: `scale(${zoom}) rotate(${tilt}deg)`, transformOrigin: origin}}>
				<div
					style={{
						position: 'absolute',
						left: CAL_LEFT - 40,
						top: CAL_TOP + PH - 40,
						width: CW + 80,
						height: 120,
						background: 'radial-gradient(ellipse at 50% 40%, rgba(20,8,2,0.75), rgba(20,8,2,0) 70%)',
						filter: 'blur(14px)',
					}}
				/>
			</AbsoluteFill>

			{/* ---- 3D calendar. Flat isolated wrapper keeps Chromium from depth-sorting it against the overlays. ---- */}
			<AbsoluteFill style={{transform: 'translateZ(0)', isolation: 'isolate'}}>
				<AbsoluteFill style={{perspective: 3400, perspectiveOrigin: `${FOCUS.x}px ${FOCUS.y - 300}px`}}>
					<AbsoluteFill
						style={{
							transformStyle: 'preserve-3d',
							transformOrigin: origin,
							transform: `translate(${floatX}px, ${floatY}px) scale(${zoom}) rotateZ(${tilt}deg)`,
						}}
					>
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
							{/* Stand / backing board */}
							<div
								style={{
									position: 'absolute',
									left: -24,
									top: -14,
									width: CW + 48,
									height: PH + 46,
									borderRadius: 6,
									background: 'linear-gradient(100deg, #120D09 0%, #2A1E15 55%, #3A2A1C 100%)',
									transform: 'translateZ(-8px)',
									boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
								}}
							/>
							{/* Page stack thickness */}
							{[5, 4, 3, 2, 1].map((k) => (
								<div
									key={k}
									style={{
										position: 'absolute',
										left: 2,
										top: 6,
										width: CW - 4,
										height: PH + k * 3,
										background: k % 2 ? '#D9CDB8' : '#C9BBA3',
										transform: `translateZ(${-k * 0.8}px)`,
									}}
								/>
							))}
							{/* Pages, back (last) to front (first). */}
							{pages
								.map((_, i) => i)
								.reverse()
								.map((i) => {
									const s = flipState[i];
									const isLast = i === pages.length - 1;
									if (s.p >= 1) return null; // fully turned: hangs behind the stand
									const shadow = shadowOn(i);
									const content = (
										<>
											{face(i, isLast)}
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
										<div
											key={i}
											style={{
												position: 'absolute',
												inset: 0,
												transformStyle: 'preserve-3d',
												transform: `translateZ(${(pages.length - 1 - i) * 0.9}px)`,
											}}
										>
											{s.angle > 0 ? (
												<FlipPage face={content} angle={s.angle} bend={s.bend} backColor="#E3D7C3" />
											) : (
												<div style={{position: 'absolute', inset: 0}}>{content}</div>
											)}
										</div>
									);
								})}
							<Binding />
						</div>
					</AbsoluteFill>
				</AbsoluteFill>
			</AbsoluteFill>

			{/* Foreground plate: parcels and notebook, nearest depth plane */}
			<AbsoluteFill style={{transform: `scale(${fgZoom}) rotate(${tilt * 1.2}deg)`, transformOrigin: origin}}>
				<Img src={staticFile('frente.png')} style={{position: 'absolute', left: 0, bottom: 0, width: 2160}} />
			</AbsoluteFill>

			{/* Key light: low sun from the upper right, warm wash, vignette */}
			<AbsoluteFill
				style={{
					background:
						'radial-gradient(ellipse 80% 55% at 88% 8%, rgba(255,196,120,0.34) 0%, rgba(255,160,80,0.10) 45%, rgba(0,0,0,0) 70%)',
					mixBlendMode: 'screen',
				}}
			/>
			<AbsoluteFill style={{background: 'rgba(255,150,70,0.10)', mixBlendMode: 'soft-light'}} />
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse 75% 60% at 55% 50%, rgba(0,0,0,0) 50%, rgba(18,8,2,0.62) 100%)',
				}}
			/>

			{/* ---- Title ---- */}
			<AbsoluteFill
				style={{
					background: 'linear-gradient(to bottom, rgba(26,12,4,0.62) 0%, rgba(26,12,4,0.38) 20%, rgba(26,12,4,0) 34%)',
					opacity: titleScrim,
				}}
			/>
			<div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center'}}>
				<div
					style={{
						fontFamily: SERIF,
						fontWeight: 600,
						fontSize: 240,
						lineHeight: 1,
						fontVariantNumeric: 'lining-nums',
						fontFeatureSettings: '"lnum" 1',
						letterSpacing: `${titleTrack}em`,
						color: col.titulo,
						whiteSpace: 'nowrap',
						textShadow: '0 6px 30px rgba(30,12,2,0.55)',
					}}
				>
					{chars.map((ch, i) => {
						const c = prog(frame, t.titulo + i * 1.6, t.titulo + i * 1.6 + 18, Easing.bezier(0.16, 1, 0.3, 1));
						return (
							<span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0 0.01em'}}>
								<span
									style={{
										display: 'inline-block',
										transform: `translateY(${(1 - c) * 105}%)`,
										opacity: Math.min(1, c * 1.4),
										whiteSpace: 'pre',
									}}
								>
									{ch}
								</span>
							</span>
						);
					})}
				</div>
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34, marginTop: 34}}>
					<div style={{height: 3, width: 150 * rule, background: col.titulo, opacity: 0.7}} />
					<div
						style={{
							fontFamily: SANS,
							fontWeight: 500,
							fontSize: 54,
							letterSpacing: `${0.42 - 0.1 * sub}em`,
							color: col.titulo,
							opacity: sub,
							transform: `translateY(${(1 - sub) * 16}px)`,
							textShadow: '0 3px 16px rgba(30,12,2,0.6)',
							whiteSpace: 'nowrap',
						}}
					>
						{textos.subtitulo}
					</div>
					<div style={{height: 3, width: 150 * rule, background: col.titulo, opacity: 0.7}} />
				</div>
			</div>

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
