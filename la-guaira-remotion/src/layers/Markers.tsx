import {interpolate} from 'remotion';
import {LonLat, View} from '../geo/projection';
import {BODY_FONT, TITLE_FONT} from '../fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Formats a coordinate the way a Spanish-language documentary would. */
export const formatCoord = ([lon, lat]: LonLat) => {
	const f = (v: number) => Math.abs(v).toFixed(2).replace('.', ',');
	return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'} · ${f(lon)}° ${lon >= 0 ? 'E' : 'O'}`;
};

/** Ground contact ring, painted on the tilted map plane. `t` is local time in frames since appearance. */
export const GroundRing: React.FC<{view: View; coord: LonLat; color: string; t: number; opacity?: number}> = ({
	view,
	coord,
	color,
	t,
	opacity = 1,
}) => {
	if (t < 0) return null;
	const [x, y] = view.screenFlat(coord);
	const grow = interpolate(t, [0, 10], [0.3, 1], clamp);
	const pulse = interpolate(t, [4, 34], [0, 1], clamp);
	return (
		<svg style={{position: 'absolute', left: x - 120, top: y - 120, width: 240, height: 240, overflow: 'visible', opacity}}>
			<circle cx={120} cy={120} r={22 * grow} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={4} />
			<circle cx={120} cy={120} r={7} fill="#FFF8EE" />
			{pulse > 0 && pulse < 1 && (
				<circle cx={120} cy={120} r={22 + 90 * pulse} fill="none" stroke={color} strokeWidth={3} opacity={(1 - pulse) * 0.8} />
			)}
		</svg>
	);
};

export type PinProps = {
	view: View;
	coord: LonLat;
	color: string;
	textColor: string;
	title: string;
	subtitle: string;
	coordLine?: string;
	/** Optional highlighted caption under the title (e.g. a departure day). */
	tag?: string;
	tagColor?: string;
	side: 'izquierda' | 'derecha';
	stem: number;
	/** Frames since the pin started to appear (negative = hidden). */
	t: number;
	dim?: number;
	/** Overall size, e.g. smaller when the camera pulls far out. */
	scale?: number;
};

/** Upright pin standing on the map, with its label. Lives outside the tilted plane. */
export const Pin: React.FC<PinProps> = ({view, coord, color, textColor, title, subtitle, coordLine, tag, tagColor, side, stem, t, dim = 0, scale = 1}) => {
	if (t < 0) return null;
	const p = view.screen(coord);
	const rise = interpolate(t, [0, 14], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
	const text = interpolate(t, [8, 22], [0, 1], clamp);
	const tagIn = interpolate(t, [14, 28], [0, 1], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
	const h = stem * rise;
	const left = side === 'izquierda';
	return (
		<div style={{position: 'absolute', left: p.x, top: p.y, opacity: 1 - dim * 0.35, transform: `scale(${scale})`, transformOrigin: '0 0'}}>
			{/* Stem */}
			<div
				style={{
					position: 'absolute',
					left: -2.5,
					top: -h,
					width: 5,
					height: h,
					background: `linear-gradient(to top, rgba(255,248,236,0.15), rgba(255,248,236,0.95))`,
					borderRadius: 3,
				}}
			/>
			{/* Head */}
			<div
				style={{
					position: 'absolute',
					left: -24,
					top: -h - 24,
					width: 48,
					height: 48,
					borderRadius: '50%',
					background: color,
					border: '6px solid #FFF6EA',
					boxSizing: 'border-box',
					boxShadow: `0 8px 22px rgba(0,0,0,0.45), 0 0 26px ${color}55`,
					transform: `scale(${rise})`,
				}}
			/>
			{/* Label */}
			<div
				style={{
					position: 'absolute',
					top: -h - 46,
					...(left ? {right: 46} : {left: 46}),
					textAlign: left ? 'right' : 'left',
					whiteSpace: 'nowrap',
					color: textColor,
					opacity: text,
					transform: `translateY(${(1 - text) * 14}px)`,
					textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.4)',
				}}
			>
				<div style={{fontFamily: TITLE_FONT, fontWeight: 600, fontSize: 72, letterSpacing: '0.05em', lineHeight: 1}}>{title}</div>
				<div style={{fontFamily: BODY_FONT, fontWeight: 500, fontSize: 36, letterSpacing: '0.04em', marginTop: 10, opacity: 0.86}}>
					{subtitle}
				</div>
				{tag && (
					<div
						style={{
							display: 'inline-block',
							marginTop: 16,
							padding: '12px 22px 10px',
							borderRadius: 6,
							background: 'rgba(16,24,28,0.62)',
							borderLeft: left ? 'none' : `5px solid ${tagColor ?? color}`,
							borderRight: left ? `5px solid ${tagColor ?? color}` : 'none',
							fontFamily: TITLE_FONT,
							fontWeight: 600,
							fontSize: 50,
							letterSpacing: '0.12em',
							lineHeight: 1,
							color: textColor,
							textShadow: 'none',
							opacity: tagIn,
							transform: `translateX(${(1 - tagIn) * (left ? 18 : -18)}px)`,
							clipPath: left ? `inset(0 0 0 ${(1 - tagIn) * 100}%)` : `inset(0 ${(1 - tagIn) * 100}% 0 0)`,
						}}
					>
						{tag}
					</div>
				)}
				{coordLine && (
					<div style={{fontFamily: BODY_FONT, fontWeight: 400, fontSize: 30, letterSpacing: '0.06em', marginTop: 6, opacity: 0.66}}>
						{coordLine}
					</div>
				)}
			</div>
		</div>
	);
};

/** Interruption mark: a break symbol at the cut point and a short caption. */
export const CutMark: React.FC<{view: View; coord: LonLat; color: string; textColor: string; label: string; k: number}> = ({
	view,
	coord,
	color,
	textColor,
	label,
	k,
}) => {
	if (k <= 0) return null;
	const p = view.screen(coord);
	const s = interpolate(k, [0, 1], [0.7, 1]);
	return (
		<div style={{position: 'absolute', left: p.x, top: p.y, opacity: k}}>
			<svg style={{position: 'absolute', left: -40, top: -40, width: 80, height: 80, overflow: 'visible', transform: `scale(${s})`}}>
				<circle cx={40} cy={40} r={30} fill="rgba(18,12,10,0.62)" stroke={color} strokeWidth={5} />
				<path d="M28 28 L52 52 M52 28 L28 52" stroke="#FBEDE6" strokeWidth={6} strokeLinecap="round" />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: 56,
					top: -20,
					whiteSpace: 'nowrap',
					fontFamily: TITLE_FONT,
					fontWeight: 500,
					fontSize: 34,
					letterSpacing: '0.12em',
					color: textColor,
					textShadow: '0 2px 10px rgba(0,0,0,0.65)',
					transform: `translateX(${(1 - k) * -12}px)`,
				}}
			>
				{label}
			</div>
		</div>
	);
};
