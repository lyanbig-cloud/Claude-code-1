import {View} from '../geo/projection';
import {vectors} from '../geo/data';

const BLEED = 4000; // plane content extends well past the frame under tilt

/** Natural Earth borders and coastline, drawn in world units. */
export const Borders: React.FC<{view: View; borderColor: string}> = ({view, borderColor}) => {
	const [ox, oy] = view.flat([0, 0]);
	const s = view.scale / vectors.worldScale;
	const g = `translate(${ox} ${oy}) scale(${s})`;
	const svgBox = {
		position: 'absolute' as const,
		left: -BLEED,
		top: -BLEED,
		width: view.width + 2 * BLEED,
		height: view.height + 2 * BLEED,
		overflow: 'visible' as const,
	};
	const viewBox = `${-BLEED} ${-BLEED} ${view.width + 2 * BLEED} ${view.height + 2 * BLEED}`;
	const line = {fill: 'none', vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
	return (
		<>
			{/* Soft warm glow under the Venezuelan land border. */}
			<svg style={{...svgBox, filter: 'blur(9px)', opacity: 0.45}} viewBox={viewBox}>
				<g transform={g}>
					<path d={vectors.venezuelaBorder} stroke={borderColor} strokeWidth={12} {...line} />
				</g>
			</svg>
			<svg style={svgBox} viewBox={viewBox}>
				<g transform={g}>
					<path d={vectors.coastline} stroke="rgba(255,238,210,0.28)" strokeWidth={2} {...line} />
					<path d={vectors.usStates} stroke="rgba(255,232,196,0.2)" strokeWidth={2} strokeDasharray="10 9" {...line} />
					<path d={vectors.venezuelaStates} stroke="rgba(255,232,196,0.16)" strokeWidth={2} strokeDasharray="10 9" {...line} />
					<path d={vectors.otherBorders} stroke="rgba(244,224,192,0.38)" strokeWidth={2.6} {...line} />
					<path d={vectors.venezuelaBorder} stroke={borderColor} strokeWidth={4} opacity={0.88} {...line} />
				</g>
			</svg>
		</>
	);
};
