import {Vec, View} from '../geo/projection';
import {Route, pointAt, tangentAt} from '../geo/spline';

/** Places a top-down vehicle on the map plane, aligned with the route. */
const OnRoute: React.FC<{view: View; route: Route; at: number; opacity: number; children: React.ReactNode}> = ({
	view,
	route,
	at,
	opacity,
	children,
}) => {
	if (opacity <= 0) return null;
	const [x, y] = view.flat(pointAt(route, at));
	const [tx, ty]: Vec = tangentAt(route, at);
	const angle = (Math.atan2(ty, tx) * 180) / Math.PI;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity, transform: `rotate(${angle}deg)`}}>
			{children}
		</div>
	);
};

/** Small articulated truck seen from above (cab + container trailer), facing +x. */
export const Truck: React.FC<{view: View; route: Route; at: number; opacity: number; scale?: number}> = ({
	scale = 1,
	...p
}) => (
	<OnRoute {...p}>
		<svg width={120} height={50} viewBox="-60 -25 120 50" style={{position: 'absolute', left: -60, top: -25, overflow: 'visible', transform: `scale(${scale})`}}>
			{/* soft ground shadow */}
			<rect x={-50} y={-11} width={96} height={28} rx={5} fill="rgba(8,10,8,0.45)" style={{filter: 'blur(4px)'}} />
			{/* trailer: weathered container */}
			<rect x={-50} y={-13} width={70} height={26} rx={2} fill="#9C4A32" />
			{[-42, -32, -22, -12, -2, 8].map((x) => (
				<line key={x} x1={x} y1={-12} x2={x} y2={12} stroke="rgba(0,0,0,0.22)" strokeWidth={1.6} />
			))}
			<rect x={-50} y={-13} width={70} height={26} rx={2} fill="none" stroke="rgba(255,235,210,0.35)" strokeWidth={1.2} />
			{/* hitch */}
			<rect x={20} y={-4} width={6} height={8} fill="#2B2B2B" />
			{/* cab */}
			<rect x={25} y={-12} width={22} height={24} rx={4} fill="#ECE6DC" />
			<rect x={40} y={-10} width={6} height={20} rx={2} fill="#3C4A52" />
			<rect x={27} y={-12} width={10} height={24} rx={2} fill="rgba(0,0,0,0.08)" />
		</svg>
	</OnRoute>
);

/** Container ship seen from above with a soft wake, facing +x. */
export const Ship: React.FC<{view: View; route: Route; at: number; opacity: number; scale?: number; frame: number}> = ({
	scale = 1,
	frame,
	...p
}) => {
	const colors = ['#9C4A32', '#3F6378', '#B9893F', '#6F7F5A', '#8C3B2E', '#46616E', '#A7764A'];
	const shimmer = 0.85 + 0.15 * Math.sin(frame / 3);
	return (
		<OnRoute {...p}>
			<svg
				width={420}
				height={120}
				viewBox="-300 -60 420 120"
				style={{position: 'absolute', left: -300, top: -60, overflow: 'visible', transform: `scale(${scale})`, transformOrigin: '300px 60px'}}
			>
				<defs>
					<linearGradient id="wake" x1="0" x2="1">
						<stop offset="0" stopColor="#F4EFE6" stopOpacity="0" />
						<stop offset="1" stopColor="#F4EFE6" stopOpacity="0.55" />
					</linearGradient>
				</defs>
				{/* Wake: diverging V and a turbulent centre line */}
				<g opacity={shimmer} style={{filter: 'blur(2px)'}}>
					<path d="M-62 -10 L-280 -46" stroke="url(#wake)" strokeWidth={4} fill="none" />
					<path d="M-62 10 L-280 46" stroke="url(#wake)" strokeWidth={4} fill="none" />
					<path d="M-64 0 L-250 0" stroke="url(#wake)" strokeWidth={14} fill="none" opacity={0.7} />
				</g>
				{/* Hull shadow on the water */}
				<path d="M-66 -15 L46 -15 Q72 -14 82 0 Q72 14 46 15 L-66 15 Z" fill="rgba(4,14,20,0.5)" transform="translate(6 7)" style={{filter: 'blur(4px)'}} />
				{/* Hull */}
				<path d="M-66 -15 L46 -15 Q72 -14 82 0 Q72 14 46 15 L-66 15 Z" fill="#2E2B2A" />
				<path d="M-62 -12 L44 -12 Q66 -11 74 0 Q66 11 44 12 L-62 12 Z" fill="#5B5550" />
				{/* Container bays */}
				{Array.from({length: 7}, (_, i) => (
					<g key={i}>
						<rect x={-40 + i * 13} y={-11} width={11.5} height={10.5} fill={colors[i % colors.length]} />
						<rect x={-40 + i * 13} y={0.5} width={11.5} height={10.5} fill={colors[(i + 3) % colors.length]} />
					</g>
				))}
				{/* Bridge / superstructure aft */}
				<rect x={-60} y={-10} width={16} height={20} rx={2} fill="#E9E4DA" />
				<rect x={-56} y={-8} width={4} height={16} fill="#B9B2A6" />
			</svg>
		</OnRoute>
	);
};
