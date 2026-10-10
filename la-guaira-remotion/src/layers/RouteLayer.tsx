import {View, Vec} from '../geo/projection';
import {Route, pointAt, slice} from '../geo/spline';

const BLEED = 4000;

export type Stroke = {
	route: Route;
	from: number;
	to: number;
	color: string;
	width: number;
	dash: [number, number];
	/** Dash offset in screen px (negative values move dashes forward). */
	offset: number;
	opacity: number;
};

export type Head = {route: Route; at: number; color: string; opacity: number};
export type Node = {point: Vec; color: string; opacity: number; radius: number};

const flatPath = (view: View, pts: Vec[]) =>
	pts
		.map((p, i) => {
			const [x, y] = view.flat(p);
			return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join('');

/** Length in plane px of the first `u` of a route; keeps dash phase continuous across split strokes. */
export const flatLength = (view: View, r: Route, from: number, to: number) => {
	const pts = slice(r, from, to).map(view.flat);
	let l = 0;
	for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
	return l;
};

/** Route strokes, drawing heads and nodes, all on the tilted map plane. */
export const RouteLayer: React.FC<{view: View; strokes: Stroke[]; heads: Head[]; nodes: Node[]}> = ({
	view,
	strokes,
	heads,
	nodes,
}) => {
	const box = {
		position: 'absolute' as const,
		left: -BLEED,
		top: -BLEED,
		width: view.width + 2 * BLEED,
		height: view.height + 2 * BLEED,
		overflow: 'visible' as const,
	};
	const viewBox = `${-BLEED} ${-BLEED} ${view.width + 2 * BLEED} ${view.height + 2 * BLEED}`;
	const visible = strokes.filter((s) => s.to > s.from && s.opacity > 0);
	return (
		<>
			{/* Contact shadow: keeps lines legible over bright terrain without a neon glow. */}
			<svg style={{...box, filter: 'blur(5px)'}} viewBox={viewBox}>
				{visible.map((s, i) => (
					<path
						key={i}
						d={flatPath(view, slice(s.route, s.from, s.to))}
						fill="none"
						stroke="rgba(6,14,18,0.55)"
						strokeWidth={s.width + 7}
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={s.opacity}
					/>
				))}
			</svg>
			<svg style={box} viewBox={viewBox}>
				<defs>
					<radialGradient id="head-halo">
						<stop offset="0" stopColor="#FFF6E6" stopOpacity="0.55" />
						<stop offset="1" stopColor="#FFF6E6" stopOpacity="0" />
					</radialGradient>
				</defs>
				{visible.map((s, i) => (
					<path
						key={i}
						d={flatPath(view, slice(s.route, s.from, s.to))}
						fill="none"
						stroke={s.color}
						strokeWidth={s.width}
						strokeDasharray={s.dash.join(' ')}
						strokeDashoffset={s.offset}
						strokeLinecap="round"
						strokeLinejoin="round"
						opacity={s.opacity}
					/>
				))}
				{nodes
					.filter((n) => n.opacity > 0)
					.map((n, i) => {
						const [x, y] = view.flat(n.point);
						return (
							<g key={i} opacity={n.opacity}>
								<circle cx={x} cy={y} r={n.radius} fill="rgba(10,22,28,0.55)" stroke={n.color} strokeWidth={4} />
								<circle cx={x} cy={y} r={n.radius * 0.32} fill={n.color} />
							</g>
						);
					})}
				{heads
					.filter((h) => h.opacity > 0)
					.map((h, i) => {
						const [x, y] = view.flat(pointAt(h.route, h.at));
						return (
							<g key={i} opacity={h.opacity}>
								<circle cx={x} cy={y} r={34} fill="url(#head-halo)" />
								<circle cx={x} cy={y} r={11} fill={h.color} />
								<circle cx={x} cy={y} r={5} fill="#FFFDF8" />
							</g>
						);
					})}
			</svg>
		</>
	);
};
