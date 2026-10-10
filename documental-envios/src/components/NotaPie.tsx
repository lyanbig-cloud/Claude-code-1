import React from 'react';
import {useCurrentFrame} from 'remotion';
import {progreso} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

/** Nota discreta al pie (fuente de datos, aclaraciones). */
export const NotaPie: React.FC<{texto: string; inicio?: number}> = ({texto, inicio = 30}) => {
	const frame = useCurrentFrame();
	if (!texto) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: SEGURO.lateral,
				right: SEGURO.lateral,
				bottom: SEGURO.inferior - 180,
				textAlign: 'center',
				fontFamily: FUENTE.etiqueta,
				fontWeight: 400,
				fontSize: 38,
				letterSpacing: '0.18em',
				textTransform: 'uppercase',
				color: COLOR.beigeTenue,
				opacity: progreso(frame, inicio, 30) * 0.7,
			}}
		>
			{texto}
		</div>
	);
};
