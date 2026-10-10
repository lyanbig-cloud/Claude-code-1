import React from 'react';
import {AbsoluteFill} from 'remotion';

/** Degradados superior e inferior que integran el mapa con el fondo y protegen la legibilidad de los textos. */
export const VeloMapa: React.FC<{superior?: number; inferior?: number; transparente?: boolean}> = ({superior = 1500, inferior = 1100, transparente = false}) => {
	if (transparente) return null;
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div style={{position: 'absolute', top: 0, left: 0, right: 0, height: superior, background: 'linear-gradient(180deg, rgba(14,13,12,0.96) 0%, rgba(14,13,12,0.82) 45%, rgba(14,13,12,0) 100%)'}} />
			<div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: inferior, background: 'linear-gradient(0deg, rgba(14,13,12,0.95) 0%, rgba(14,13,12,0.75) 45%, rgba(14,13,12,0) 100%)'}} />
		</AbsoluteFill>
	);
};
