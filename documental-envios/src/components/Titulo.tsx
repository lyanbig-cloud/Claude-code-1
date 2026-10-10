import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CURVA, progreso, visibilidad} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

type Props = {
	antetitulo?: string;
	titulo: string;
	subtitulo?: string;
	inicio?: number;
	salida?: number;
	y?: number;
	alineacion?: 'centro' | 'izquierda';
	tamano?: number;
};

/** Título de sección: antetítulo espaciado, título serif y filete dorado que se dibuja. */
export const Titulo: React.FC<Props> = ({
	antetitulo,
	titulo,
	subtitulo,
	inicio = 6,
	salida,
	y = SEGURO.superior,
	alineacion = 'centro',
	tamano = 200,
}) => {
	const frame = useCurrentFrame();
	const vis = salida === undefined ? 1 : 1 - progreso(frame, salida, 14, CURVA.entrada);
	const pAnte = progreso(frame, inicio, 26);
	const pTitulo = progreso(frame, inicio + 6, 34);
	const pFilete = progreso(frame, inicio + 16, 30, CURVA.suave);
	const pSub = visibilidad(frame, inicio + 24, 26);
	const centro = alineacion === 'centro';

	return (
		<div
			style={{
				position: 'absolute',
				top: y,
				left: SEGURO.lateral,
				right: SEGURO.lateral,
				textAlign: centro ? 'center' : 'left',
				opacity: vis,
			}}
		>
			{antetitulo && (
				<div
					style={{
						fontFamily: FUENTE.etiqueta,
						fontWeight: 500,
						fontSize: 58,
						letterSpacing: `${0.42 - pAnte * 0.08}em`,
						textTransform: 'uppercase',
						color: COLOR.dorado,
						opacity: pAnte,
						marginBottom: 34,
					}}
				>
					{antetitulo}
				</div>
			)}
			<div style={{overflow: 'hidden', paddingBottom: 18}}>
				<div
					style={{
						fontFamily: FUENTE.titulo,
						fontWeight: 600,
						fontSize: tamano,
						lineHeight: 0.98,
						color: COLOR.beige,
						transform: `translateY(${(1 - pTitulo) * 60}%)`,
						opacity: pTitulo,
						textShadow: '0 12px 40px rgba(0,0,0,0.45)',
					}}
				>
					{titulo}
				</div>
			</div>
			<div
				style={{
					height: 4,
					width: 520 * pFilete,
					margin: centro ? '34px auto 0' : '34px 0 0',
					background: `linear-gradient(90deg, rgba(217,183,110,0), ${COLOR.dorado} 30%, ${COLOR.doradoSuave} 50%, ${COLOR.dorado} 70%, rgba(217,183,110,0))`,
				}}
			/>
			{subtitulo && (
				<div
					style={{
						fontFamily: FUENTE.titulo,
						fontStyle: 'italic',
						fontWeight: 500,
						fontSize: 84,
						color: COLOR.beigeTenue,
						marginTop: 36,
						opacity: pSub,
						transform: `translateY(${(1 - pSub) * 20}px)`,
					}}
				>
					{subtitulo}
				</div>
			)}
		</div>
	);
};
