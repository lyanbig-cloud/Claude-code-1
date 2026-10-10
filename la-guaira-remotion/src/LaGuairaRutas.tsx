import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {branchPoint, cutPoint, cutU, places, routes} from './geo/data';
import {CameraState, LonLat, makeView, toWorld} from './geo/projection';
import {Atmosphere, CloudSpec, Clouds} from './layers/Atmosphere';
import {Basemap} from './layers/Basemap';
import {Borders} from './layers/Borders';
import {MapLabels} from './layers/MapLabels';
import {CutMark, GroundRing, Pin, formatCoord} from './layers/Markers';
import {Head, Node, RouteLayer, Stroke, flatLength} from './layers/RouteLayer';
import {Props} from './schema';

const ORIGIN_Y = 0.52; // focus row, as a fraction of the frame height
const PERSPECTIVE = 5200;

const ease = Easing.bezier(0.42, 0, 0.18, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const progress = (frame: number, from: number, to: number, easing = ease) =>
	interpolate(frame, [from, to], [0, 1], {...clamp, easing});

const CLOUDS: CloudSpec[] = [
	{file: 'atmosphere/cloud0.png', coord: [-64.2, 14.4], sizeDeg: 4.2, opacity: 0.75, drift: -0.004},
	{file: 'atmosphere/cloud2.png', coord: [-74.2, 13.9], sizeDeg: 3.6, opacity: 0.6, drift: -0.003},
	{file: 'atmosphere/cloud1.png', coord: [-64.4, 6.4], sizeDeg: 3.4, opacity: 0.55, drift: -0.004},
	{file: 'atmosphere/cloud0.png', coord: [-74.0, 5.4], sizeDeg: 3.8, opacity: 0.55, drift: -0.003},
	{file: 'atmosphere/cloud2.png', coord: [-62.5, 18.5], sizeDeg: 5.5, opacity: 0.5, drift: -0.005},
];

/** Camera: push in to La Guaira, then an overlapping reframe west towards Zulia. */
const cameraAt = (frame: number, c: Props['camara']): CameraState => {
	const a = progress(frame, 0, c.acercamientoFin);
	const b = progress(frame, c.reencuadreInicio, c.reencuadreFin);
	const [k0, k1, k2] = [c.inicio, c.laGuaira, c.final];
	const mix = (f: (k: typeof k0) => number) => f(k0) + (f(k1) - f(k0)) * a + (f(k2) - f(k1)) * b;
	const logPpd = mix((k) => Math.log(k.pxPorGrado));
	// A barely perceptible continuous push keeps the shot alive during holds.
	const drift = 1 + 0.018 * (frame / 168);
	return {
		focus: [mix((k) => k.foco[0]), mix((k) => k.foco[1])] as LonLat,
		ppd: Math.exp(logPpd) * drift,
		tilt: mix((k) => k.inclinacion),
	};
};

export const LaGuairaRutas: React.FC<Props> = (props) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const {tiempos: t, colores: col, etiquetas: et} = props;

	const cam = cameraAt(frame, props.camara);
	const view = makeView(cam, width, height, height * ORIGIN_Y, PERSPECTIVE);

	// ---- Main route and its interruption --------------------------------
	const draw = progress(frame, t.rutaInicio, t.rutaFin, Easing.bezier(0.33, 0, 0.25, 1));
	const k = progress(frame, t.interrupcionInicio, t.interrupcionFin, Easing.bezier(0.3, 0, 0.2, 1));
	const gap = 0.011 * k;
	const flow = -frame * 2.4;
	const mainDash: [number, number] = [38, 26];
	const before = Math.min(draw, cutU - gap);
	const phaseAtCut = flatLength(view, routes.main, 0, cutU + gap);
	// The blocked stretch freezes where it was when the interruption began.
	const frozenFlow = -Math.min(frame, t.interrupcionInicio) * 2.4;

	const strokes: Stroke[] = [
		{route: routes.main, from: 0, to: before, color: col.ruta, width: 10, dash: mainDash, offset: flow, opacity: 1},
		{
			route: routes.main,
			from: cutU + gap,
			to: draw,
			color: col.ruta,
			width: 10,
			dash: mainDash,
			offset: frozenFlow + phaseAtCut,
			opacity: 1 - k,
		},
		{
			route: routes.main,
			from: cutU + gap,
			to: draw,
			color: col.rutaInterrumpida,
			width: 9,
			dash: [16, 22],
			offset: frozenFlow + phaseAtCut,
			opacity: k * 0.85,
		},
	];

	// ---- Alternatives ----------------------------------------------------
	const pc = progress(frame, t.alternativaPCInicio, t.alternativaPCFin);
	const zu = progress(frame, t.alternativaZuliaInicio, t.alternativaZuliaFin);
	const altDash: [number, number] = [34, 22];
	strokes.push(
		{route: routes.toPuertoCabello, from: 0, to: pc, color: col.alternativa, width: 10, dash: altDash, offset: flow, opacity: 1},
		{route: routes.toZulia, from: 0, to: zu, color: col.alternativa, width: 10, dash: altDash, offset: flow, opacity: 1},
	);

	const headFade = (p: number, end: number) => (p > 0 ? interpolate(frame, [end, end + 8], [1, 0], clamp) : 0);
	const heads: Head[] = [
		{route: routes.main, at: draw, color: col.ruta, opacity: headFade(draw, t.rutaFin)},
		{route: routes.toPuertoCabello, at: pc, color: col.alternativa, opacity: headFade(pc, t.alternativaPCFin)},
		{route: routes.toZulia, at: zu, color: col.alternativa, opacity: headFade(zu, t.alternativaZuliaFin)},
	];
	const nodes: Node[] = [
		{
			point: toWorld(branchPoint),
			color: col.alternativa,
			radius: 17,
			opacity: interpolate(frame, [t.alternativaPCInicio - 8, t.alternativaPCInicio + 4], [0, 1], clamp),
		},
	];

	const coordLine = (c: LonLat) => (et.mostrarCoordenadas ? formatCoord(c) : undefined);
	const pinPC = t.alternativaPCFin - 6;
	const pinZU = t.alternativaZuliaFin - 6;

	return (
		<AbsoluteFill style={{backgroundColor: '#0B2533', overflow: 'hidden'}}>
			{/* ---- Tilted map plane ----
			    The outer wrapper flattens the 3D plane into its own stacking context;
			    without it Chromium depth-sorts the plane against the overlays and
			    hides pins that sit over the receding half of the map. */}
			<AbsoluteFill
				style={{transform: 'translateZ(0)', transformStyle: 'flat', isolation: 'isolate', zIndex: 0, filter: 'saturate(1.14) contrast(1.04)'}}
			>
			<AbsoluteFill style={{transform: view.planeTransform, transformOrigin: view.planeOrigin, overflow: 'visible'}}>
				<Basemap view={view} ppd={cam.ppd} />
				{props.atmosfera.nubes && <Clouds view={view} clouds={CLOUDS} frame={frame} layer="shadow" />}
				<Borders view={view} borderColor={col.fronteraVenezuela} />
				<MapLabels view={view} labels={props.rotulosMapa} color={col.texto} frame={frame} />
				<RouteLayer view={view} strokes={strokes} heads={heads} nodes={nodes} />
				<GroundRing view={view} coord={places.laGuaira.coord} color={col.marcadorPrincipal} t={frame - t.marcadorLaGuaira} />
				<GroundRing view={view} coord={places.puertoCabello.coord} color={col.marcadorAlternativo} t={frame - pinPC} />
				<GroundRing view={view} coord={places.maracaibo.coord} color={col.marcadorAlternativo} t={frame - pinZU} />
				{props.atmosfera.nubes && <Clouds view={view} clouds={CLOUDS} frame={frame} layer="cloud" />}
			</AbsoluteFill>
			</AbsoluteFill>

			{/* ---- Upright overlays, projected onto the plane ---- */}
			<AbsoluteFill style={{zIndex: 1}}>
				<CutMark view={view} coord={cutPoint} color={col.rutaInterrumpida} textColor={col.texto} label={et.interrupcion} k={k} />
				<Pin
					view={view}
					coord={places.laGuaira.coord}
					color={col.marcadorPrincipal}
					textColor={col.texto}
					title={et.laGuaira.titulo}
					subtitle={et.laGuaira.subtitulo}
					coordLine={coordLine(places.laGuaira.coord)}
					side={et.laGuaira.lado}
					stem={et.laGuaira.alturaMastil}
					t={frame - t.marcadorLaGuaira}
					dim={k}
				/>
				<Pin
					view={view}
					coord={places.puertoCabello.coord}
					color={col.marcadorAlternativo}
					textColor={col.texto}
					title={et.puertoCabello.titulo}
					subtitle={et.puertoCabello.subtitulo}
					coordLine={coordLine(places.puertoCabello.coord)}
					side={et.puertoCabello.lado}
					stem={et.puertoCabello.alturaMastil}
					t={frame - pinPC}
				/>
				<Pin
					view={view}
					coord={places.maracaibo.coord}
					color={col.marcadorAlternativo}
					textColor={col.texto}
					title={et.zulia.titulo}
					subtitle={et.zulia.subtitulo}
					coordLine={coordLine(places.maracaibo.coord)}
					side={et.zulia.lado}
					stem={et.zulia.alturaMastil}
					t={frame - pinZU}
				/>
			</AbsoluteFill>

			<AbsoluteFill style={{zIndex: 2}}>
			<Atmosphere
				frame={frame}
				haze={props.atmosfera.bruma}
				grain={props.atmosfera.grano}
				vignette={props.atmosfera.vineta}
			/>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
