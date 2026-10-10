import {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, random, staticFile} from 'remotion';
import {LonLat, View} from '../geo/projection';

export type CloudSpec = {file: string; coord: LonLat; sizeDeg: number; opacity: number; drift: number};

/**
 * Cloud banks anchored to geographic positions but floating above the
 * ground: a parallax factor pushes them towards the camera, and a faint
 * shadow is cast on the terrain below.
 */
export const Clouds: React.FC<{view: View; clouds: CloudSpec[]; frame: number; layer: 'shadow' | 'cloud'}> = ({
	view,
	clouds,
	frame,
	layer,
}) => {
	const ox = view.width / 2;
	const oy = view.originY;
	const parallax = layer === 'cloud' ? 1.12 : 1;
	return (
		<>
			{clouds.map((c, i) => {
				const [fx, fy] = view.screenFlat([c.coord[0] + c.drift * frame, c.coord[1]]);
				const x = ox + (fx - ox) * parallax + (layer === 'shadow' ? -60 : 0);
				const y = oy + (fy - oy) * parallax + (layer === 'shadow' ? 70 : 0);
				const size = c.sizeDeg * (view.scale * 256) / 360 * parallax;
				return (
					<Img
						key={i}
						src={staticFile(c.file)}
						style={{
							position: 'absolute',
							left: x - size / 2,
							top: y - size / 2,
							width: size,
							height: size,
							opacity: layer === 'shadow' ? c.opacity * 0.35 : c.opacity,
							filter: layer === 'shadow' ? 'brightness(0) blur(18px)' : 'blur(1.5px)',
						}}
					/>
				);
			})}
		</>
	);
};

const GRAIN = [0, 1, 2, 3, 4, 5].map((i) => staticFile(`atmosphere/grain${i}.png`));

/** Screen-space light: warm aerial haze, low sun, vignette and film grain. */
export const Atmosphere: React.FC<{frame: number; haze: number; grain: number; vignette: number}> = ({
	frame,
	haze,
	grain,
	vignette,
}) => {
	// CSS background images are not tracked by Remotion: preload them explicitly.
	const [handle] = useState(() => delayRender('grain textures'));
	useEffect(() => {
		Promise.all(
			GRAIN.map(
				(src) =>
					new Promise((resolve) => {
						const img = new Image();
						img.onload = img.onerror = resolve;
						img.src = src;
					}),
			),
		).then(() => continueRender(handle));
	}, [handle]);
	const g = Math.floor(frame / 2) % 6; // grain refreshes at 12 fps, like film
	const gx = Math.floor(random(`gx${frame}`) * 512);
	const gy = Math.floor(random(`gy${frame}`) * 512);
	const sunBreath = 1 + Math.sin(frame / 30) * 0.03;
	return (
		<>
			{/* Aerial perspective: distant sea dissolves into luminous warm haze (adds light, never mud). */}
			<AbsoluteFill
				style={{
					background: `linear-gradient(to bottom, rgba(236,170,96,${0.62 * haze}) 0%, rgba(214,146,80,${0.34 * haze}) 14%, rgba(160,110,70,${0.08 * haze}) 32%, rgba(0,0,0,0) 46%)`,
					mixBlendMode: 'screen',
				}}
			/>
			{/* Low amber sun, top right, with its glare spreading over the water. */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 70% 42% at 96% 0%, rgba(255,214,150,${0.85 * sunBreath}) 0%, rgba(255,178,96,0.42) 24%, rgba(230,140,70,0.12) 48%, rgba(0,0,0,0) 70%)`,
					mixBlendMode: 'screen',
				}}
			/>
			{/* Specular glint on the sea surface beneath the sun. */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 34% 9% at 80% 13%, rgba(255,226,170,${0.38 * sunBreath}) 0%, rgba(255,200,130,0.10) 50%, rgba(0,0,0,0) 100%)`,
					mixBlendMode: 'screen',
				}}
			/>
			{/* Overall warm grade, kept gentle. */}
			<AbsoluteFill style={{background: 'rgba(255,170,90,0.10)', mixBlendMode: 'soft-light'}} />
			{/* Cool, slightly darker foreground for depth. */}
			<AbsoluteFill
				style={{background: 'linear-gradient(to top, rgba(8,20,26,0.38) 0%, rgba(8,20,26,0) 26%)'}}
			/>
			{/* Vignette */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 78% 62% at 50% 52%, rgba(0,0,0,0) 55%, rgba(4,9,12,${vignette}) 100%)`,
				}}
			/>
			{/* Film grain */}
			<AbsoluteFill
				style={{
					backgroundImage: `url(${GRAIN[g]})`,
					backgroundSize: '512px 512px',
					backgroundPosition: `${gx}px ${gy}px`,
					mixBlendMode: 'overlay',
					opacity: grain * 2.2,
				}}
			/>
		</>
	);
};
