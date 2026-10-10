import {Img, interpolate, staticFile} from 'remotion';
import manifest from '../../public/basemap/manifest.json';
import {View} from '../geo/projection';

type Layer = (typeof manifest)['z6'];

// Feathered edges so a sharper layer blends into the one beneath it.
const feather = (pct: number) => {
	const edge = `transparent, black ${pct}%, black ${100 - pct}%, transparent`;
	return {
		maskImage: `linear-gradient(to right, ${edge}), linear-gradient(to bottom, ${edge})`,
		maskComposite: 'intersect',
		WebkitMaskImage: `linear-gradient(to right, ${edge}), linear-gradient(to bottom, ${edge})`,
		WebkitMaskComposite: 'source-in',
	} as React.CSSProperties;
};

const RasterLayer: React.FC<{layer: Layer; view: View; opacity?: number; featherPct?: number}> = ({
	layer,
	view,
	opacity = 1,
	featherPct,
}) => {
	if (opacity <= 0) return null;
	const [x, y] = view.flat([layer.x0, layer.y0]);
	const k = ((layer.x1 - layer.x0) * view.scale) / layer.width;
	return (
		<Img
			src={staticFile(layer.file)}
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: layer.width,
				height: layer.height,
				transformOrigin: '0 0',
				transform: `translate(${x}px, ${y}px) scale(${k})`,
				opacity,
				...(featherPct ? feather(featherPct) : {}),
			}}
		/>
	);
};

/** Pixels per degree at which each finer layer is fully faded in. */
export const Basemap: React.FC<{view: View; ppd: number}> = ({view, ppd}) => {
	const z9 = interpolate(ppd, [170, 230], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<>
			<RasterLayer layer={manifest.z6} view={view} />
			<RasterLayer layer={manifest.z8} view={view} featherPct={4} />
			<RasterLayer layer={manifest.z9} view={view} opacity={z9} featherPct={6} />
		</>
	);
};
