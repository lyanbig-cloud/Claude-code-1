import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import florida from './geo/florida.json';
import road from './geo/road_tampa_miami.json';
import {CameraState, LonLat, makeView} from './geo/projection';
import {makeRoute} from './geo/spline';
import {Atmosphere, CloudSpec, Clouds} from './layers/Atmosphere';
import {Basemap} from './layers/Basemap';
import {Borders} from './layers/Borders';
import {MapLabels} from './layers/MapLabels';
import {GroundRing, Pin} from './layers/Markers';
import {Head, RouteLayer, Stroke} from './layers/RouteLayer';
import {Ship, Truck} from './layers/Vehicles';
import {FloridaProps} from './floridaSchema';

const ORIGIN_Y = 0.52;
const PERSPECTIVE = 5200;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const prog = (f: number, a: number, b: number, easing: (t: number) => number = (t) => t) =>
	interpolate(f, [a, b], [0, 1], {...clamp, easing});

type Place = {coord: LonLat};
const places = florida.places as unknown as Record<'tampa' | 'miami' | 'laGuaira', Place>;
// Truck leg: Natural Earth interstates, closed onto the port coordinates.
const roadRoute = makeRoute([places.tampa.coord, ...(road.points as LonLat[]), places.miami.coord], 3);
const seaRoute = makeRoute(florida.routes.sea.points as LonLat[]);

const CLOUDS: CloudSpec[] = [
	{file: 'atmosphere/cloud0.png', coord: [-78.6, 27.6], sizeDeg: 2.6, opacity: 0.6, drift: -0.002},
	{file: 'atmosphere/cloud2.png', coord: [-84.4, 24.6], sizeDeg: 3.2, opacity: 0.55, drift: -0.002},
	{file: 'atmosphere/cloud1.png', coord: [-70.8, 23.6], sizeDeg: 5.0, opacity: 0.6, drift: -0.004},
	{file: 'atmosphere/cloud0.png', coord: [-62.8, 17.2], sizeDeg: 6.0, opacity: 0.55, drift: -0.004},
	{file: 'atmosphere/cloud2.png', coord: [-80.6, 13.2], sizeDeg: 5.5, opacity: 0.5, drift: -0.003},
	{file: 'atmosphere/cloud1.png', coord: [-62.5, 6.0], sizeDeg: 6.5, opacity: 0.6, drift: -0.003},
];

/**
 * One continuous move: a slow push on Florida, then a long pull-out. The focus
 * travels in proportion to the change of scale, so the pull-out reads as the
 * world widening around the shot instead of a pan that swings sideways.
 */
const cameraAt = (frame: number, p: FloridaProps): CameraState => {
	const {florida: k0, caribe: k1} = p.camara;
	const a = prog(frame, p.tiempos.alejamientoInicio, p.tiempos.alejamientoFin, Easing.bezier(0.45, 0, 0.22, 1));
	const ppd = Math.exp(Math.log(k0.pxPorGrado) * (1 - a) + Math.log(k1.pxPorGrado) * a);
	const b = (k0.pxPorGrado / ppd - 1) / (k0.pxPorGrado / k1.pxPorGrado - 1);
	const push = 1 + 0.05 * prog(frame, 0, p.tiempos.alejamientoInicio + 30, Easing.inOut(Easing.sin));
	return {
		focus: [k0.foco[0] + (k1.foco[0] - k0.foco[0]) * b, k0.foco[1] + (k1.foco[1] - k0.foco[1]) * b],
		ppd: ppd * push,
		tilt: k0.inclinacion + (k1.inclinacion - k0.inclinacion) * a,
	};
};

export const FloridaCaribe: React.FC<FloridaProps> = (props) => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const {tiempos: t, colores: col, marcadores: m} = props;

	const cam = cameraAt(frame, props);
	const view = makeView(cam, width, height, height * ORIGIN_Y, PERSPECTIVE);
	// Pins shrink a little as the world opens up, so labels never crowd.
	const pinScale = interpolate(cam.ppd, [108, 430], [0.72, 1], clamp);

	// ---- Truck leg ----------------------------------------------------------
	const drive = prog(frame, t.camionInicio, t.camionFin, Easing.bezier(0.4, 0, 0.3, 1));
	const truckOpacity =
		prog(frame, t.camionInicio - 4, t.camionInicio + 4) * (1 - prog(frame, t.camionFin + 2, t.camionFin + 12));

	// ---- Sea leg ------------------------------------------------------------
	const sail = prog(frame, t.rutaMarInicio, t.rutaMarFin, Easing.bezier(0.42, 0, 0.3, 1));
	// The ship eases into motion and keeps gliding through the last frame.
	const shipU = t.buqueAvanceFinal * prog(frame, t.buqueInicio, durationInFrames - 1, Easing.bezier(0.55, 0, 0.75, 0.85));
	const shipOpacity = prog(frame, t.buqueInicio - 2, t.buqueInicio + 10);

	const strokes: Stroke[] = [
		{route: roadRoute, from: 0, to: drive, color: col.rutaTerrestre, width: 11, dash: [1, 0], offset: 0, opacity: 1},
		{route: seaRoute, from: 0, to: sail, color: col.rutaMaritima, width: 10, dash: [38, 26], offset: -frame * 2.4, opacity: 1},
	];
	const heads: Head[] = [
		{route: seaRoute, at: sail, color: col.rutaMaritima, opacity: sail > 0 ? 1 - prog(frame, t.rutaMarFin, t.rutaMarFin + 8) : 0},
	];

	const pin = (key: 'tampa' | 'miami' | 'destino', coord: LonLat, color: string, start: number) => {
		const cfg = m[key];
		return (
			<Pin
				view={view}
				coord={coord}
				color={color}
				textColor={col.texto}
				title={cfg.titulo}
				subtitle={cfg.subtitulo}
				tag={cfg.etiqueta || undefined}
				tagColor={col.etiqueta}
				side={cfg.lado}
				stem={cfg.alturaMastil}
				t={frame - start}
				scale={pinScale}
			/>
		);
	};

	return (
		<AbsoluteFill style={{backgroundColor: '#0B2533', overflow: 'hidden'}}>
			{/* ---- Tilted map plane (isolated so overlays are never depth-sorted against it) ---- */}
			<AbsoluteFill
				style={{transform: 'translateZ(0)', transformStyle: 'flat', isolation: 'isolate', zIndex: 0, filter: 'saturate(1.14) contrast(1.04)'}}
			>
				<AbsoluteFill style={{transform: view.planeTransform, transformOrigin: view.planeOrigin, overflow: 'visible'}}>
					<Basemap view={view} ppd={cam.ppd} />
					{props.atmosfera.nubes && <Clouds view={view} clouds={CLOUDS} frame={frame} layer="shadow" />}
					<Borders view={view} borderColor={col.fronteras} />
					<MapLabels view={view} labels={props.rotulosMapa} color={col.texto} frame={frame} />
					<RouteLayer view={view} strokes={strokes} heads={heads} nodes={[]} />
					<Truck view={view} route={roadRoute} at={drive} opacity={truckOpacity} scale={1.3} />
					<Ship view={view} route={seaRoute} at={shipU} opacity={shipOpacity} frame={frame} scale={1.35} />
					<GroundRing view={view} coord={places.tampa.coord} color={col.marcadorOrigen} t={frame - t.marcadorTampa} />
					<GroundRing view={view} coord={places.miami.coord} color={col.marcadorOrigen} t={frame - t.marcadorMiami} />
					{m.mostrarDestino && (
						<GroundRing view={view} coord={places.laGuaira.coord} color={col.marcadorDestino} t={frame - t.marcadorDestino} />
					)}
					{props.atmosfera.nubes && <Clouds view={view} clouds={CLOUDS} frame={frame} layer="cloud" />}
				</AbsoluteFill>
			</AbsoluteFill>

			{/* ---- Upright pins and labels ---- */}
			<AbsoluteFill style={{zIndex: 1}}>
				{pin('tampa', places.tampa.coord, col.marcadorOrigen, t.marcadorTampa)}
				{pin('miami', places.miami.coord, col.marcadorOrigen, t.marcadorMiami)}
				{m.mostrarDestino && pin('destino', places.laGuaira.coord, col.marcadorDestino, t.marcadorDestino)}
			</AbsoluteFill>

			<AbsoluteFill style={{zIndex: 2}}>
				<Atmosphere frame={frame} haze={props.atmosfera.bruma} grain={props.atmosfera.grano} vignette={props.atmosfera.vineta} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
