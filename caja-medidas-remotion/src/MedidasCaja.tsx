import {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import caja from '../public/caja.json';
import {CONDENSED, SERIF} from './fonts';
import {Props} from './schema';

// Photo space: every graphic is drawn in the original photo's pixels and the
// SVG scales it onto the plate, so lines stay locked to the box.
const PHOTO_W = 941;
const PHOTO_H = 1671;

type Pt = [number, number];
type Measure = Props['medidas']['ancho'];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const prog = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
	interpolate(f, [a, b], [0, 1], {...clamp, easing});
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const drawProgress = (frame: number, t0: number, d: number) => prog(frame, t0, t0 + d, Easing.bezier(0.45, 0, 0.2, 1));

/** Box height above the floor (photo px): ease up, then a slow float. */
const liftAt = (frame: number, c: Props['caja']) =>
	c.elevacion * prog(frame, 0, c.finElevacion, Easing.bezier(0.3, 0, 0.15, 1)) +
	c.flotacion * Math.sin((frame - c.finElevacion) / 13) * prog(frame, c.finElevacion - 8, c.finElevacion + 14);

type Cam = {x: number; y: number; z: number};

/**
 * Where the camera wants to be on a given frame: wide while the box rises,
 * then close on each dimension's drawing head, settling on the whole line as
 * its label appears, and wide again at the end.
 */
const camTarget = (f: number, p: Props): Cam => {
	const wide: Cam = {x: PHOTO_W / 2, y: PHOTO_H * 0.53, z: 1};
	const {zoomSeguimiento: z} = p.camara;
	const d = p.tiempos.duracionLinea;
	const lift = liftAt(f, p.caja);
	for (const m of [p.medidas.ancho, p.medidas.alto, p.medidas.profundidad]) {
		const t0 = m.inicio;
		if (f < t0 - 2 || f > t0 + d + 14) continue;
		const a = m.desde as Pt;
		const b = m.hasta as Pt;
		// Lead slightly ahead of the head so the line draws into frame.
		const lead = lerp(a, b, Math.min(1, drawProgress(f, t0, d) + 0.12));
		const settle = prog(f, t0 + d - 2, t0 + d + 12, Easing.inOut(Easing.cubic));
		const mid = lerp(a, b, 0.5);
		const pt = lerp(lead, mid, settle);
		return {x: pt[0], y: pt[1] - lift, z: z * (1 - 0.22 * settle)};
	}
	return wide;
};

/** Gaussian-smoothed camera path: deterministic per frame, no sudden moves. */
const cameraAt = (frame: number, p: Props, last: number): Cam => {
	const sigma = p.camara.suavidad;
	let wx = 0;
	let x = 0;
	let y = 0;
	let lz = 0;
	for (let k = -3 * sigma; k <= 3 * sigma; k++) {
		const f = Math.min(last, Math.max(0, frame + k));
		const w = Math.exp(-(k * k) / (2 * sigma * sigma));
		const c = camTarget(f, p);
		x += c.x * w;
		y += c.y * w;
		lz += Math.log(c.z) * w;
		wx += w;
	}
	const z = Math.exp(lz / wx);
	// Never show past the photo's edges.
	const hw = PHOTO_W / (2 * z);
	const hh = PHOTO_H / (2 * z);
	return {
		x: Math.min(PHOTO_W - hw, Math.max(hw, x / wx)),
		y: Math.min(PHOTO_H - hh, Math.max(hh, y / wx)),
		z,
	};
};

const GRAIN = [0, 1, 2, 3, 4, 5].map((i) => staticFile(`grano${i}.png`));

/** Open chevron arrowhead pointing along (dx, dy) at `tip`. */
const chevron = (tip: Pt, dx: number, dy: number, size: number) => {
	const l = Math.hypot(dx, dy) || 1;
	const [ux, uy] = [dx / l, dy / l];
	const a = (26 * Math.PI) / 180;
	const back = (s: number): Pt => [
		tip[0] - size * (ux * Math.cos(a) - s * uy * Math.sin(a)),
		tip[1] - size * (uy * Math.cos(a) + s * ux * Math.sin(a)),
	];
	const [p1, p2] = [back(1), back(-1)];
	return `M${p1[0]} ${p1[1]} L${tip[0]} ${tip[1]} L${p2[0]} ${p2[1]}`;
};

/** One dimension: witness lines, the drawn line, arrowheads, gold details and its label. */
const Dimension: React.FC<{m: Measure; frame: number; duration: number; line: string; gold: string; dim: number; showLabel: boolean}> = ({
	m,
	frame,
	duration,
	line,
	gold,
	dim,
	showLabel,
}) => {
	const t0 = m.inicio;
	const ext = prog(frame, t0 - 4, t0 + 8, Easing.out(Easing.cubic));
	const draw = drawProgress(frame, t0, duration);
	const heads = prog(frame, t0 + duration - 6, t0 + duration + 4, Easing.out(Easing.back(1.8)));
	const label = prog(frame, t0 + duration - 8, t0 + duration + 12, Easing.out(Easing.cubic));
	const glint = draw > 0 && draw < 1 ? Math.sin(Math.PI * draw) : 0;
	if (ext <= 0) return null;

	const [a, b] = [m.desde as Pt, m.hasta as Pt];
	const head = lerp(a, b, draw);
	const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
	// Upright reading direction and the side the label sits on.
	let [ux, uy] = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)];
	if (ux < -1e-6) [ux, uy] = [-ux, -uy];
	const [nx, ny] = [-uy, ux];
	const mid = lerp(a, b, 0.5);
	const lp: Pt = [mid[0] + nx * m.separacionTexto, mid[1] + ny * m.separacionTexto];
	const angle = (Math.atan2(uy, ux) * 180) / Math.PI;

	return (
		<g opacity={dim}>
			{/* Witness lines grow from the box outwards */}
			{m.extensiones.map(([p, q], i) => {
				const e = lerp(p as Pt, q as Pt, ext);
				return (
					<g key={i}>
						<line x1={p[0]} y1={p[1]} x2={e[0]} y2={e[1]} stroke={line} strokeWidth={1.3} strokeDasharray="4.5 3" opacity={0.9} />
					</g>
				);
			})}
			{/* Gold end points where the dimension meets its witness lines */}
			{[a, b].map((p, i) => (
				<circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill={gold} opacity={i === 0 ? ext : heads} />
			))}
			{/* Dimension line, drawn progressively */}
			{draw > 0 && (
				<line x1={a[0]} y1={a[1]} x2={head[0]} y2={head[1]} stroke={line} strokeWidth={1.7} strokeLinecap="round" />
			)}
			{heads > 0 && (
				<g stroke={line} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={Math.min(1, heads)}>
					<path d={chevron(a, -dx, -dy, 11 * Math.min(1.15, heads))} />
					<path d={chevron(b, dx, dy, 11 * Math.min(1.15, heads))} />
				</g>
			)}
			{/* Small gold glint travelling with the drawing head */}
			{glint > 0 && (
				<>
					<circle cx={head[0]} cy={head[1]} r={7} fill={gold} opacity={0.22 * glint} filter="url(#soft)" />
					<circle cx={head[0]} cy={head[1]} r={1.8} fill="#FFF3DD" opacity={glint} />
				</>
			)}
			{/* Label aligned with the dimension, as in a technical drawing */}
			{showLabel && label > 0 && (
				<g transform={`translate(${lp[0]} ${lp[1]}) rotate(${angle})`} opacity={label}>
					<text
						x={0}
						y={0}
						textAnchor="middle"
						dominantBaseline="central"
						fontFamily={CONDENSED}
						fontWeight={600}
						fontSize={21}
						letterSpacing={`${0.32 + 0.12 * (1 - label)}em`}
						fill={line}
						style={{paintOrder: 'stroke', stroke: 'rgba(20,10,4,0.55)', strokeWidth: 2.4}}
					>
						{m.texto}
					</text>
				</g>
			)}
		</g>
	);
};

export const MedidasCaja: React.FC<Props> = (props) => {
	const frame = useCurrentFrame();
	const {colores: col, tiempos: t, medidas: md, textos} = props;

	// Preload the CSS-background grain so no frame renders without it.
	const [handle] = useState(() => delayRender('grain'));
	useEffect(() => {
		Promise.all(GRAIN.map((src) => new Promise((r) => Object.assign(new Image(), {onload: r, onerror: r, src})))).then(() =>
			continueRender(handle),
		);
	}, [handle]);

	const {width, height, durationInFrames} = useVideoConfig();
	const sx = width / PHOTO_W;
	const sy = height / PHOTO_H;
	const lift = liftAt(frame, props.caja);
	const cam = cameraAt(frame, props, durationInFrames - 1);
	const camTransform = `translate(${width / 2 - cam.z * cam.x * sx}px, ${height / 2 - cam.z * cam.y * sy}px) scale(${cam.z})`;
	// Shadow on the floor: sharp and dense on contact, softer and wider as the box rises.
	const liftK = lift / 40;
	const foot = (caja.footprint as Pt[]).map((q) => q.join(',')).join(' ');
	// Measurements recede a touch when the statement arrives.
	const dim = textos.mostrarTitulo ? 1 - 0.28 * prog(frame, t.titulo - 4, t.titulo + 20) : 1;

	const title = prog(frame, t.titulo, t.titulo + 26, Easing.bezier(0.16, 1, 0.3, 1));
	const sub = prog(frame, t.subtitulo, t.subtitulo + 22, Easing.out(Easing.cubic));
	const rule = prog(frame, t.subtitulo - 8, t.subtitulo + 16, Easing.inOut(Easing.cubic));
	const scrim = prog(frame, t.titulo - 10, t.titulo + 20);
	const lines = textos.titulo.split('\n').map((l) => l.trim().split(/\s+/));

	const g = Math.floor(frame / 2) % 6;
	const gx = Math.floor(random(`gx${frame}`) * 512);
	const gy = Math.floor(random(`gy${frame}`) * 512);

	return (
		<AbsoluteFill style={{backgroundColor: '#0E0905', overflow: 'hidden'}}>
			{/* Camera: background, shadow, box and measurements move as one scene */}
			<AbsoluteFill style={{transform: camTransform, transformOrigin: '0 0'}}>
				<Img src={staticFile('fondo.jpg')} style={{width: '100%', height: '100%'}} />
				<svg viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`} preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
					<defs>
						<filter id="shadow" x="-0.5" y="-0.5" width="2" height="2">
							<feGaussianBlur stdDeviation={3 + 24 * liftK} />
						</filter>
					</defs>
					<polygon points={foot} fill="#0A0502" opacity={0.8 - 0.42 * liftK} filter="url(#shadow)" transform={`translate(0 ${8 * liftK})`} />
				</svg>
				<Img
					src={staticFile('caja.png')}
					style={{position: 'absolute', left: caja.x, top: caja.y - lift * sy, width: caja.width, height: caja.height}}
				/>
				<svg viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`} preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
					<defs>
						<filter id="soft" x="-2" y="-2" width="5" height="5">
							<feGaussianBlur stdDeviation="3" />
						</filter>
					</defs>
					<g transform={`translate(0 ${-lift})`}>
					<Dimension m={md.ancho} frame={frame} duration={t.duracionLinea} line={col.linea} gold={col.dorado} dim={dim} showLabel={textos.mostrarEtiquetas} />
					<Dimension m={md.alto} frame={frame} duration={t.duracionLinea} line={col.linea} gold={col.dorado} dim={dim} showLabel={textos.mostrarEtiquetas} />
					<Dimension m={md.profundidad} frame={frame} duration={t.duracionLinea} line={col.linea} gold={col.dorado} dim={dim} showLabel={textos.mostrarEtiquetas} />
					</g>
				</svg>
			</AbsoluteFill>

			{/* ---- Statement ---- */}
			{textos.mostrarTitulo && (
			<>
			<AbsoluteFill
				style={{
					background: 'linear-gradient(to bottom, rgba(8,5,2,0.55) 0%, rgba(8,5,2,0.35) 22%, rgba(8,5,2,0) 34%)',
					opacity: scrim,
				}}
			/>
			<div style={{position: 'absolute', left: 80, right: 80, top: 500, textAlign: 'center'}}>
				<div
					style={{
						fontFamily: SERIF,
						fontWeight: 600,
						fontSize: 128,
						lineHeight: 1.08,
						letterSpacing: '0.035em',
						color: col.titulo,
						textWrap: 'balance',
						textShadow: '0 6px 30px rgba(0,0,0,0.6)',
						fontFeatureSettings: '"lnum" 1',
					} as React.CSSProperties}
				>
					{lines.map((ws, li) => (
						<div key={li} style={{whiteSpace: 'nowrap'}}>
							{ws.map((w, wi) => {
								const i = lines.slice(0, li).reduce((n, l) => n + l.length, 0) + wi;
								const c = prog(frame, t.titulo + i * 2.2, t.titulo + i * 2.2 + 20, Easing.bezier(0.16, 1, 0.3, 1));
								return (
									<span key={wi} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.06em'}}>
										<span style={{display: 'inline-block', transform: `translateY(${(1 - c) * 100}%)`, opacity: Math.min(1, c * 1.5) * Math.min(1, title * 3)}}>
											{w}
											{wi < ws.length - 1 ? '\u00A0' : ''}
										</span>
									</span>
								);
							})}
						</div>
					))}
				</div>
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 56}}>
					<div style={{height: 3, width: 170 * rule, background: col.dorado}} />
					<div
						style={{
							fontFamily: CONDENSED,
							fontWeight: 600,
							fontSize: 104,
							letterSpacing: `${0.5 - 0.12 * sub}em`,
							color: col.dorado,
							opacity: sub,
							transform: `translateY(${(1 - sub) * 18}px)`,
							textShadow: '0 4px 18px rgba(0,0,0,0.6)',
							whiteSpace: 'nowrap',
							marginRight: '-0.38em', // optical centring of tracked caps
						}}
					>
						{textos.subtitulo}
					</div>
					<div style={{height: 3, width: 170 * rule, background: col.dorado}} />
				</div>
			</div>

			</>
			)}

			{/* Light vignette and film grain; the photo's own lighting is untouched */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 70% at 50% 52%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)'}} />
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
