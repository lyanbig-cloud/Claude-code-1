import React from 'react';
import {COLOR, FUENTE} from '../lib/tema';

/** Sello visible para datos comerciales aún no suministrados. Solo aparece cuando falta el dato. */
export const PorConfirmar: React.FC<{opacidad?: number; tamano?: number}> = ({opacidad = 1, tamano = 40}) => (
	<span
		style={{
			display: 'inline-block',
			fontFamily: FUENTE.etiqueta,
			fontWeight: 600,
			fontSize: tamano,
			letterSpacing: '0.24em',
			textTransform: 'uppercase',
			color: COLOR.ambarClaro,
			border: `2px dashed ${COLOR.ambar}`,
			borderRadius: 8,
			padding: `${tamano * 0.25}px ${tamano * 0.6}px`,
			opacity: opacidad,
			whiteSpace: 'nowrap',
		}}
	>
		Dato por confirmar
	</span>
);
