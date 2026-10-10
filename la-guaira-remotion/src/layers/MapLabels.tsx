import {interpolate} from 'remotion';
import {View, toWorld} from '../geo/projection';
import {BODY_FONT, TITLE_FONT} from '../fonts';
import {Props} from '../schema';

/**
 * Place names painted onto the map plane: they tilt and recede with the
 * terrain, like printed cartography, and fade with distance.
 */
export const MapLabels: React.FC<{view: View; labels: Props['rotulosMapa']; color: string; frame: number}> = ({
	view,
	labels,
	color,
	frame,
}) => {
	const fadeIn = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: 'clamp'});
	return (
		<>
			{labels.map((l) => {
				const [x, y] = view.flat(toWorld(l.coord));
				const italic = l.estilo === 'accidente';
				const font = l.estilo === 'accidente' || l.estilo === 'isla' ? BODY_FONT : TITLE_FONT;
				return (
					<div
						key={l.texto}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							transform: 'translate(-50%, -50%)',
							whiteSpace: 'nowrap',
							fontFamily: font,
							fontWeight: l.estilo === 'pais' ? 500 : 400,
							fontStyle: italic ? 'italic' : 'normal',
							fontSize: l.tamano,
							letterSpacing: `${l.espaciado}em`,
							color,
							opacity: l.opacidad * fadeIn,
							textShadow: '0 2px 14px rgba(10,14,16,0.55)',
							mixBlendMode: l.estilo === 'pais' || l.estilo === 'mar' ? 'soft-light' : 'normal',
						}}
					>
						{l.texto}
					</div>
				);
			})}
		</>
	);
};
