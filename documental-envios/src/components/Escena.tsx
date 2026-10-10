import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CURVA} from '../lib/animacion';
import {cargarFuentes} from '../lib/fuentes';
import {COLOR} from '../lib/tema';
import {Grano} from './Grano';

cargarFuentes();

type Props = {
	children: React.ReactNode;
	/** Sin fondo, grano ni viñeta: para exportar con canal alfa. */
	fondoTransparente?: boolean;
	/** Fotogramas de fundido de entrada y salida (0 = corte). */
	fundido?: number;
	/** Posición vertical (0–1) del foco de luz cálida. */
	luzY?: number;
};

/** Contenedor común: fondo cinematográfico, luz cálida, grano de película y viñeta. */
export const Escena: React.FC<Props> = ({children, fondoTransparente = false, fundido = 12, luzY = 0.28}) => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const opacidad =
		fundido > 0
			? interpolate(frame, [0, fundido, durationInFrames - fundido, durationInFrames - 1], [0, 1, 1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: CURVA.suave,
				})
			: 1;
	// Deriva muy lenta del foco de luz (determinista, ligada al fotograma).
	const deriva = Math.sin(frame / 90) * 3;

	return (
		<AbsoluteFill style={{backgroundColor: fondoTransparente ? 'transparent' : COLOR.carbon}}>
			{!fondoTransparente && (
				<AbsoluteFill
					style={{
						background: `radial-gradient(120% 70% at ${50 + deriva}% ${luzY * 100}%, ${COLOR.marronOscuro} 0%, #1b1511 45%, ${COLOR.carbon} 100%)`,
					}}
				/>
			)}
			<AbsoluteFill style={{opacity: opacidad}}>{children}</AbsoluteFill>
			{!fondoTransparente && (
				<>
					<AbsoluteFill
						style={{
							background: `radial-gradient(60% 40% at ${30 + deriva}% ${luzY * 100 - 8}%, rgba(230,169,79,0.10), rgba(230,169,79,0) 70%)`,
							mixBlendMode: 'screen',
						}}
					/>
					<AbsoluteFill
						style={{
							background: 'radial-gradient(85% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(5,4,3,0.55) 100%)',
						}}
					/>
					<Grano />
				</>
			)}
		</AbsoluteFill>
	);
};
