import {CW, PAPER_TEXTURE, PH} from './PageFace';

const STRIPS = 12;
const SH = PH / STRIPS;
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * A page hinged at its top edge that turns over the binding.
 *
 * The sheet is split into horizontal strips chained in 3D; each strip adds a
 * little rotation to the one above it, so the page curls like real paper
 * instead of rotating as a rigid card. `angle` is the rotation of the top
 * strip around the binding, `bend` the total extra curl spread down the sheet
 * (negative: the free edge trails behind).
 */
export const FlipPage: React.FC<{face: React.ReactNode; angle: number; bend: number; backColor: string}> = ({
	face,
	angle,
	bend,
	backColor,
}) => {
	const strip = (i: number, absolute: number): React.ReactNode => {
		const local = i === 0 ? angle : bend / (STRIPS - 1);
		const abs = absolute + local;
		// Light falls off as the sheet turns away from the warm key light.
		const frontShade = Math.min(0.55, 0.5 * (1 - Math.cos(rad(abs))) * 0.55);
		const backShade = 0.12 + 0.3 * Math.abs(Math.sin(rad(abs)));
		return (
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: i === 0 ? 0 : SH,
					width: CW,
					height: SH + 1.5, // overlap hides hairline seams
					transformOrigin: '50% 0',
					transform: `rotateX(${local}deg)`,
					transformStyle: 'preserve-3d',
				}}
			>
				<div style={{position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden'}}>
					<div style={{position: 'absolute', left: 0, top: -i * SH, width: CW, height: PH}}>{face}</div>
					<div style={{position: 'absolute', inset: 0, background: `rgba(40,22,8,${frontShade})`}} />
				</div>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						backfaceVisibility: 'hidden',
						transform: 'rotateY(180deg)',
						background: backColor,
						backgroundImage: `linear-gradient(rgba(40,22,8,${backShade}), rgba(40,22,8,${backShade})), url(${PAPER_TEXTURE})`,
						backgroundBlendMode: 'normal, multiply',
						backgroundSize: '100% 100%, 1024px 1024px',
						backgroundPosition: `0 0, 0 ${-i * SH}px`,
					}}
				/>
				{i < STRIPS - 1 && strip(i + 1, abs)}
			</div>
		);
	};
	return <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: PH, transformStyle: 'preserve-3d'}}>{strip(0, 0)}</div>;
};
