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

const ramp = (ppd: number, a: number, b: number) =>
	interpolate(ppd, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/**
 * All baked layers from the manifest, coarse to fine. Finer layers fade in
 * once the camera is close enough to need them (pixels per degree).
 */
export const Basemap: React.FC<{view: View; ppd: number}> = ({view, ppd}) => {
	const layers = (Object.values(manifest) as Layer[]).sort((a, b) => a.zoom - b.zoom);
	return (
		<>
			{layers.map((layer) => {
				const opacity = layer.zoom <= 8 ? 1 : layer.zoom === 9 ? ramp(ppd, 170, 230) : ramp(ppd, 330, 420);
				const featherPct = layer.zoom === 6 ? undefined : layer.zoom === 8 ? 4 : 6;
				return <RasterLayer key={layer.file} layer={layer} view={view} opacity={opacity} featherPct={featherPct} />;
			})}
		</>
	);
};
