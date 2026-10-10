import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CURVA, progreso} from '../lib/animacion';
import {type Camara, type LonLat, type Trazado, tramoVisible} from '../lib/mapa';
import {COLOR, FORMATO, FUENTE} from '../lib/tema';

type Lado = 'derecha' | 'izquierda' | 'arriba' | 'abajo';

/** Marcador de ciudad: punto dorado, anillo y pulso suave, con etiqueta. */
export const MarcadorLugar: React.FC<{
	camara: Camara;
	posicion: LonLat;
	nombre: string;
	detalle?: string;
	inicio: number;
	lado?: Lado;
	tamano?: number;
	principal?: boolean;
	opacidadTexto?: number;
}> = ({camara, posicion, nombre, detalle, inicio, lado = 'derecha', tamano = 1, principal = false, opacidadTexto = 1}) => {
	const frame = useCurrentFrame();
	const p = progreso(frame, inicio, 22);
	const pTexto = progreso(frame, inicio + 6, 26);
	if (p <= 0) return null;
	const [x, y] = camara.aPantalla(posicion);
	// Pulso cíclico determinista (periodo de 2,5 s).
	const ciclo = ((frame - inicio) % 60) / 60;
	const pulso = CURVA.salida(ciclo);
	const r = (principal ? 20 : 14) * tamano;
	const sep = r + 34;
	const pos: Record<Lado, React.CSSProperties> = {
		derecha: {left: x + sep, top: y, transform: 'translateY(-50%)', textAlign: 'left'},
		izquierda: {right: FORMATO.ancho - x + sep, top: y, transform: 'translateY(-50%)', textAlign: 'right'},
		arriba: {left: x, bottom: FORMATO.alto - y + sep, transform: 'translateX(-50%)', textAlign: 'center'},
		abajo: {left: x, top: y + sep, transform: 'translateX(-50%)', textAlign: 'center'},
	};
	const desplaz = (1 - pTexto) * 24;
	return (
		<>
			<svg width={2160} height={3840} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<circle cx={x} cy={y} r={r * (1.6 + pulso * 2.6)} fill="none" stroke={COLOR.dorado} strokeWidth={3} opacity={(1 - pulso) * 0.5 * p} />
				<circle cx={x} cy={y} r={r * 2.1 * p} fill="rgba(217,183,110,0.14)" stroke={COLOR.dorado} strokeOpacity={0.6} strokeWidth={2.5} />
				<circle cx={x} cy={y} r={r * p} fill={principal ? COLOR.ambarClaro : COLOR.doradoSuave} />
			</svg>
			<div
				style={{
					position: 'absolute',
					...pos[lado],
					opacity: pTexto * opacidadTexto,
					marginLeft: lado === 'derecha' ? -desplaz : undefined,
					whiteSpace: 'nowrap',
				}}
			>
				<div
					style={{
						fontFamily: FUENTE.etiqueta,
						fontWeight: 600,
						fontSize: (principal ? 78 : 58) * tamano,
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: COLOR.beige,
						textShadow: '0 4px 18px rgba(0,0,0,0.85)',
						lineHeight: 1,
					}}
				>
					{nombre}
				</div>
				{detalle && (
					<div
						style={{
							fontFamily: FUENTE.titulo,
							fontStyle: 'italic',
							fontWeight: 500,
							fontSize: (principal ? 50 : 40) * tamano,
							color: COLOR.dorado,
							marginTop: 8,
							textShadow: '0 4px 14px rgba(0,0,0,0.85)',
						}}
					>
						{detalle}
					</div>
				)}
			</div>
		</>
	);
};

/** Rótulo geográfico (mares, océanos, países). */
export const RotuloGeo: React.FC<{
	camara: Camara;
	posicion: LonLat;
	texto: string;
	inicio: number;
	estilo?: 'agua' | 'pais';
	tamano?: number;
}> = ({camara, posicion, texto, inicio, estilo = 'agua', tamano = 1}) => {
	const frame = useCurrentFrame();
	const p = progreso(frame, inicio, 40);
	if (p <= 0) return null;
	const [x, y] = camara.aPantalla(posicion);
	const agua = estilo === 'agua';
	return (
		<div
			style={{
				position: 'absolute',
				left: x,
				top: y,
				transform: 'translate(-50%, -50%)',
				opacity: p * (agua ? 0.75 : 0.6),
				fontFamily: agua ? FUENTE.titulo : FUENTE.etiqueta,
				fontStyle: agua ? 'italic' : 'normal',
				fontWeight: 500,
				fontSize: (agua ? 64 : 46) * tamano,
				letterSpacing: `${(agua ? 0.32 : 0.4) - p * 0.06}em`,
				textTransform: agua ? 'none' : 'uppercase',
				color: agua ? '#9fc3c2' : COLOR.beige,
				whiteSpace: 'nowrap',
				textShadow: '0 2px 12px rgba(0,0,0,0.6)',
			}}
		>
			{texto}
		</div>
	);
};

/** Ruta que se dibuja progresivamente, con estela luminosa y embarcación en la punta. */
export const RutaAnimada: React.FC<{
	camara: Camara;
	trazado: Trazado;
	progreso: number;
	estilo?: 'maritima' | 'terrestre';
	mostrarPunta?: boolean;
	grosor?: number;
}> = ({camara, trazado, progreso: t, estilo = 'maritima', mostrarPunta = true, grosor = 1}) => {
	if (t <= 0) return null;
	const {d, punta, rumbo} = tramoVisible(trazado, t, camara);
	const estela = tramoVisible(trazado, t, camara, Math.max(0, t - 0.12));
	const maritima = estilo === 'maritima';
	const enMovimiento = t < 0.999;
	return (
		<svg width={2160} height={3840} style={{position: 'absolute', inset: 0}}>
			<defs>
				<filter id="resplandorRuta" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="10" />
				</filter>
			</defs>
			<path d={d} fill="none" stroke={COLOR.ambar} strokeOpacity={0.35} strokeWidth={22 * grosor} strokeLinecap="round" strokeLinejoin="round" filter="url(#resplandorRuta)" />
			<path
				d={d}
				fill="none"
				stroke={maritima ? COLOR.ambarClaro : COLOR.doradoSuave}
				strokeWidth={(maritima ? 7 : 6) * grosor}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeDasharray={maritima ? undefined : `${22 * grosor} ${18 * grosor}`}
			/>
			{enMovimiento && estela.d && (
				<path d={estela.d} fill="none" stroke="#fff3d6" strokeOpacity={0.55} strokeWidth={10 * grosor} strokeLinecap="round" filter="url(#resplandorRuta)" />
			)}
			{mostrarPunta && enMovimiento && (
				<g transform={`translate(${punta[0]} ${punta[1]}) rotate(${rumbo})`}>
					<circle r={46 * grosor} fill={COLOR.ambar} opacity={0.25} filter="url(#resplandorRuta)" />
					{maritima ? (
						// Silueta de buque vista cenital
						<path
							d="M 46 0 L 26 -14 L -34 -14 L -40 -9 L -40 9 L -34 14 L 26 14 Z"
							transform={`scale(${grosor})`}
							fill={COLOR.beige}
							stroke={COLOR.carbon}
							strokeWidth={2.5}
						/>
					) : (
						<rect x={-18} y={-18} width={36} height={36} rx={4} transform={`scale(${grosor})`} fill={COLOR.doradoSuave} stroke={COLOR.carbon} strokeWidth={2.5} />
					)}
				</g>
			)}
		</svg>
	);
};
