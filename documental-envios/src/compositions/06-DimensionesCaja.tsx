import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {z} from 'zod';
import {Escena} from '../components/Escena';
import {PorConfirmar} from '../components/PorConfirmar';
import {Titulo} from '../components/Titulo';
import {CURVA, progreso} from '../lib/animacion';
import {COLOR, FUENTE, SEGURO} from '../lib/tema';

export const esquemaDimensionesCaja = z.object({
	duracionSegundos: z.number().min(5).max(60),
	fondoTransparente: z.boolean(),
	antetitulo: z.string(),
	titulo: z.string(),
	/** Medidas reales de la caja. Vacío (null) = dato por confirmar (se dibuja un cubo). */
	largo: z.number().positive().nullable(),
	ancho: z.number().positive().nullable(),
	alto: z.number().positive().nullable(),
	unidad: z.string(),
	textoLargo: z.string(),
	textoAncho: z.string(),
	textoAlto: z.string(),
});

export const propsDimensionesCaja: z.infer<typeof esquemaDimensionesCaja> = {
	duracionSegundos: 15,
	fondoTransparente: false,
	antetitulo: 'La caja',
	titulo: 'Dimensiones',
	largo: null,
	ancho: null,
	alto: null,
	unidad: 'pulg.',
	textoLargo: 'Largo',
	textoAncho: 'Ancho',
	textoAlto: 'Alto',
};

// --- Cámara compartida entre la escena 3D y la capa de cotas -----------------

const FOV = 28;
const DISTANCIA = 15.5;
const ELEVACION = (24 * Math.PI) / 180;
const OBJETIVO_Y = 1.75;

const poseCamara = (frame: number, D: number) => {
	const giro = (interpolate(frame, [0, D], [36, 26]) * Math.PI) / 180;
	const pos = new THREE.Vector3(
		DISTANCIA * Math.cos(ELEVACION) * Math.sin(giro),
		DISTANCIA * Math.sin(ELEVACION) + OBJETIVO_Y,
		DISTANCIA * Math.cos(ELEVACION) * Math.cos(giro),
	);
	return {pos, objetivo: new THREE.Vector3(0, OBJETIVO_Y, 0)};
};

const crearCamaraVirtual = (frame: number, D: number, ancho: number, alto: number) => {
	const cam = new THREE.PerspectiveCamera(FOV, ancho / alto, 0.1, 100);
	const {pos, objetivo} = poseCamara(frame, D);
	cam.position.copy(pos);
	cam.lookAt(objetivo);
	cam.updateProjectionMatrix();
	cam.updateMatrixWorld();
	return (v: THREE.Vector3): [number, number] => {
		const p = v.clone().project(cam);
		return [((p.x + 1) / 2) * ancho, ((1 - p.y) / 2) * alto];
	};
};

const ControlCamara: React.FC<{frame: number; D: number}> = ({frame, D}) => {
	const {camera} = useThree();
	useLayoutEffect(() => {
		const {pos, objetivo} = poseCamara(frame, D);
		camera.position.copy(pos);
		camera.lookAt(objetivo);
		(camera as THREE.PerspectiveCamera).fov = FOV;
		camera.updateProjectionMatrix();
	}, [camera, frame, D]);
	return null;
};

// --- Textura procedimental de cartón (determinista) ---------------------------

const texturaCarton = () => {
	const c = document.createElement('canvas');
	c.width = 1024;
	c.height = 1024;
	const g = c.getContext('2d')!;
	g.fillStyle = '#b58653';
	g.fillRect(0, 0, 1024, 1024);
	// Variaciones amplias del papel kraft
	for (let i = 0; i < 70; i++) {
		const x = random(`m${i}x`) * 1024;
		const y = random(`m${i}y`) * 1024;
		const r = 80 + random(`m${i}r`) * 220;
		const grad = g.createRadialGradient(x, y, 0, x, y, r);
		const claro = random(`m${i}c`) > 0.5;
		grad.addColorStop(0, claro ? 'rgba(214,170,118,0.18)' : 'rgba(120,80,45,0.16)');
		grad.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = grad;
		g.fillRect(0, 0, 1024, 1024);
	}
	// Corrugado interior apenas perceptible
	for (let x = 0; x < 1024; x += 16) {
		g.fillStyle = 'rgba(90,60,30,0.035)';
		g.fillRect(x, 0, 7, 1024);
	}
	// Fibras
	for (let i = 0; i < 9000; i++) {
		const x = random(`f${i}x`) * 1024;
		const y = random(`f${i}y`) * 1024;
		const l = 2 + random(`f${i}l`) * 9;
		const a = random(`f${i}a`) * Math.PI;
		g.strokeStyle = random(`f${i}c`) > 0.5 ? 'rgba(80,52,28,0.22)' : 'rgba(230,196,150,0.2)';
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		g.stroke();
	}
	// Bordes ligeramente gastados
	const borde = g.createLinearGradient(0, 0, 1024, 0);
	borde.addColorStop(0, 'rgba(70,45,25,0.22)');
	borde.addColorStop(0.04, 'rgba(70,45,25,0)');
	borde.addColorStop(0.96, 'rgba(70,45,25,0)');
	borde.addColorStop(1, 'rgba(70,45,25,0.22)');
	g.fillStyle = borde;
	g.fillRect(0, 0, 1024, 1024);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
};

// --- Caja 3D ------------------------------------------------------------------

const Caja: React.FC<{L: number; A: number; H: number; elevacion: number}> = ({L, A, H, elevacion}) => {
	const textura = useMemo(() => texturaCarton(), []);
	const anchoCinta = Math.min(L, A) * 0.2;
	const caida = H * 0.28;
	const cinta = (
		<meshPhysicalMaterial color="#d8b47c" roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.25} transparent opacity={0.82} />
	);
	return (
		<group position={[0, elevacion, 0]}>
			<mesh position={[0, H / 2, 0]} castShadow receiveShadow>
				<boxGeometry args={[L, H, A]} />
				<meshStandardMaterial map={textura} roughness={0.88} metalness={0} />
			</mesh>
			{/* Junta de las solapas superiores */}
			<mesh position={[0, H + 0.002, 0]}>
				<boxGeometry args={[L, 0.002, 0.012]} />
				<meshStandardMaterial color="#5a3b20" roughness={1} />
			</mesh>
			{/* Cinta adhesiva sobre la junta y cayendo por los extremos */}
			<mesh position={[0, H + 0.006, 0]} castShadow>
				<boxGeometry args={[L + 0.012, 0.006, anchoCinta]} />
				{cinta}
			</mesh>
			{[-1, 1].map((s) => (
				<mesh key={s} position={[s * (L / 2 + 0.004), H - caida / 2, 0]}>
					<boxGeometry args={[0.006, caida, anchoCinta]} />
					{cinta}
				</mesh>
			))}
		</group>
	);
};

// --- Cotas (capa SVG sincronizada con la cámara 3D) ---------------------------

type Cota = {a: THREE.Vector3; b: THREE.Vector3; ea: THREE.Vector3; eb: THREE.Vector3; progreso: number};

const LineaCota: React.FC<{cota: Cota; proyectar: (v: THREE.Vector3) => [number, number]}> = ({cota, proyectar}) => {
	const t = cota.progreso;
	if (t <= 0) return null;
	const [ax, ay] = proyectar(cota.a);
	const [bx, by] = proyectar(cota.b);
	const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
	// Crece desde el centro hacia los extremos
	const p1: [number, number] = [mx + (ax - mx) * t, my + (ay - my) * t];
	const p2: [number, number] = [mx + (bx - mx) * t, my + (by - my) * t];
	const [eax, eay] = proyectar(cota.ea);
	const [ebx, eby] = proyectar(cota.eb);
	const ang = Math.atan2(by - ay, bx - ax);
	const tick = (x: number, y: number) => {
		const l = 22;
		const n = ang + Math.PI / 4;
		return <line x1={x - Math.cos(n) * l} y1={y - Math.sin(n) * l} x2={x + Math.cos(n) * l} y2={y + Math.sin(n) * l} stroke={COLOR.doradoSuave} strokeWidth={5} strokeLinecap="round" />;
	};
	return (
		<g>
			<line x1={eax} y1={eay} x2={ax} y2={ay} stroke={COLOR.dorado} strokeOpacity={0.55 * t} strokeWidth={3} strokeDasharray="10 10" />
			<line x1={ebx} y1={eby} x2={bx} y2={by} stroke={COLOR.dorado} strokeOpacity={0.55 * t} strokeWidth={3} strokeDasharray="10 10" />
			<line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={COLOR.ambar} strokeOpacity={0.4} strokeWidth={16} strokeLinecap="round" />
			<line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={COLOR.doradoSuave} strokeWidth={5} strokeLinecap="round" />
			{t > 0.98 && (
				<>
					{tick(ax, ay)}
					{tick(bx, by)}
				</>
			)}
		</g>
	);
};

const RotuloCota: React.FC<{x: number; y: number; titulo: string; valor: string; opacidad: number; alin: 'centro' | 'derecha'}> = ({x, y, titulo, valor, opacidad, alin}) => (
	<div
		style={{
			position: 'absolute',
			left: alin === 'centro' ? x : undefined,
			right: alin === 'derecha' ? 2160 - x : undefined,
			top: y,
			transform: `translate(${alin === 'centro' ? '-50%' : '0'}, -50%) translateY(${(1 - opacidad) * 20}px)`,
			textAlign: alin === 'centro' ? 'center' : 'right',
			opacity: opacidad,
			whiteSpace: 'nowrap',
		}}
	>
		<div style={{fontFamily: FUENTE.etiqueta, fontWeight: 600, fontSize: 46, letterSpacing: '0.3em', textTransform: 'uppercase', color: COLOR.dorado}}>{titulo}</div>
		<div style={{fontFamily: FUENTE.titulo, fontWeight: 600, fontSize: 110, lineHeight: 1, color: COLOR.beige, textShadow: '0 6px 24px rgba(0,0,0,0.7)'}}>{valor}</div>
	</div>
);

export const DimensionesCaja: React.FC<z.infer<typeof esquemaDimensionesCaja>> = (p) => {
	const frame = useCurrentFrame();
	const {durationInFrames: D, width, height} = useVideoConfig();
	const T = (f: number) => Math.round(f * D);

	// Proporciones de la caja normalizadas (la mayor medida = 3,2 unidades).
	const medidas = [p.largo ?? 1, p.ancho ?? 1, p.alto ?? 1];
	const k = 3.2 / Math.max(...medidas);
	const [L, A, H] = medidas.map((m) => m * k);
	const pendiente = p.largo === null || p.ancho === null || p.alto === null;
	const fmt = (n: number | null) => (n === null ? '00' : Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

	const pCaja = progreso(frame, T(0.04), T(0.22), CURVA.salida);
	const elevacion = (1 - pCaja) * 2.4;
	const proyectar = crearCamaraVirtual(frame, D, width, height);

	const off = 0.55;
	const cotas: Record<'largo' | 'ancho' | 'alto', Cota> = {
		largo: {
			a: new THREE.Vector3(-L / 2, 0, A / 2 + off),
			b: new THREE.Vector3(L / 2, 0, A / 2 + off),
			ea: new THREE.Vector3(-L / 2, 0, A / 2),
			eb: new THREE.Vector3(L / 2, 0, A / 2),
			progreso: progreso(frame, T(0.32), T(0.12), CURVA.suave),
		},
		ancho: {
			a: new THREE.Vector3(L / 2 + off, 0, A / 2),
			b: new THREE.Vector3(L / 2 + off, 0, -A / 2),
			ea: new THREE.Vector3(L / 2, 0, A / 2),
			eb: new THREE.Vector3(L / 2, 0, -A / 2),
			progreso: progreso(frame, T(0.42), T(0.12), CURVA.suave),
		},
		alto: {
			a: new THREE.Vector3(-L / 2 - off, 0, A / 2),
			b: new THREE.Vector3(-L / 2 - off, H, A / 2),
			ea: new THREE.Vector3(-L / 2, 0, A / 2),
			eb: new THREE.Vector3(-L / 2, H, A / 2),
			progreso: progreso(frame, T(0.52), T(0.12), CURVA.suave),
		},
	};
	const medio = (c: Cota) => proyectar(c.a.clone().add(c.b).multiplyScalar(0.5));
	const [lx, ly] = medio(cotas.largo);
	const [ax, ay] = medio(cotas.ancho);
	const [hx, hy] = medio(cotas.alto);
	const pResumen = progreso(frame, T(0.68), T(0.12));

	return (
		<Escena fondoTransparente={p.fondoTransparente} luzY={0.5}>
			{!p.fondoTransparente && (
				<AbsoluteFill style={{background: 'radial-gradient(45% 18% at 50% 63%, rgba(217,183,110,0.10), rgba(0,0,0,0) 100%)'}} />
			)}
			<AbsoluteFill style={{opacity: progreso(frame, T(0.02), T(0.12))}}>
				<ThreeCanvas width={width} height={height} shadows gl={{antialias: true, alpha: true}} camera={{fov: FOV, near: 0.1, far: 100}}>
					<ControlCamara frame={frame} D={D} />
					<ambientLight intensity={0.55} color="#ffe6c4" />
					<hemisphereLight args={['#ffe9c9', '#2b1f17', 0.5]} />
					<directionalLight
						position={[-5, 9, 6]}
						intensity={2.6}
						color="#ffd8a3"
						castShadow
						shadow-mapSize-width={2048}
						shadow-mapSize-height={2048}
						shadow-camera-left={-6}
						shadow-camera-right={6}
						shadow-camera-top={6}
						shadow-camera-bottom={-6}
						shadow-bias={-0.0004}
						shadow-radius={6}
					/>
					<directionalLight position={[6, 4, 3]} intensity={0.7} color="#ffcf99" />
					<directionalLight position={[2, 5, -7]} intensity={1.4} color="#e8c38a" />
					<Caja L={L} A={A} H={H} elevacion={elevacion} />
					<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
						<planeGeometry args={[40, 40]} />
						<shadowMaterial opacity={0.55} />
					</mesh>
				</ThreeCanvas>
			</AbsoluteFill>

			<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
				{Object.values(cotas).map((c, i) => (
					<LineaCota key={i} cota={c} proyectar={proyectar} />
				))}
			</svg>
			<RotuloCota x={lx} y={ly + 130} titulo={p.textoLargo} valor={`${fmt(p.largo)} ${p.unidad}`} opacidad={progreso(frame, T(0.38), T(0.08))} alin="centro" />
			<RotuloCota x={ax + 40} y={ay + 150} titulo={p.textoAncho} valor={`${fmt(p.ancho)} ${p.unidad}`} opacidad={progreso(frame, T(0.48), T(0.08))} alin="centro" />
			<RotuloCota x={hx - 50} y={hy} titulo={p.textoAlto} valor={`${fmt(p.alto)} ${p.unidad}`} opacidad={progreso(frame, T(0.58), T(0.08))} alin="derecha" />

			<Titulo antetitulo={p.antetitulo} titulo={p.titulo} />

			<div style={{position: 'absolute', left: SEGURO.lateral, right: SEGURO.lateral, top: 2930, textAlign: 'center', opacity: pResumen}}>
				<div style={{fontFamily: FUENTE.titulo, fontWeight: 600, fontSize: 120, color: COLOR.beige, fontVariantNumeric: 'lining-nums'}}>
					{fmt(p.largo)} × {fmt(p.ancho)} × {fmt(p.alto)} <span style={{fontSize: 80, color: COLOR.dorado}}>{p.unidad}</span>
				</div>
				<div style={{fontFamily: FUENTE.etiqueta, fontWeight: 500, fontSize: 44, letterSpacing: '0.3em', textTransform: 'uppercase', color: COLOR.beigeTenue, marginTop: 10}}>
					{p.textoLargo} × {p.textoAncho} × {p.textoAlto}
				</div>
				{pendiente && (
					<div style={{marginTop: 34}}>
						<PorConfirmar tamano={34} />
					</div>
				)}
			</div>
		</Escena>
	);
};
