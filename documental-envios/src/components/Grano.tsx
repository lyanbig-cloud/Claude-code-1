import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Grano de película determinista: ruido fractal cuya semilla depende del fotograma.
 * Se genera a media resolución y se escala, como el grano analógico.
 */
export const Grano: React.FC<{intensidad?: number}> = ({intensidad = 0.07}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const w = Math.round(width / 2);
	const h = Math.round(height / 2);
	const semilla = (frame % 48) + 1;
	return (
		<AbsoluteFill style={{opacity: intensidad, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
			<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{width, height}}>
				<filter id={`grano-${semilla}`} x="0" y="0" width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={semilla} stitchTiles="stitch" />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width={w} height={h} filter={`url(#grano-${semilla})`} />
			</svg>
		</AbsoluteFill>
	);
};
