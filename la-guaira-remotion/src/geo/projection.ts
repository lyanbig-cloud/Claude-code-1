// Web Mercator + a perspective "camera" that matches the CSS transform used
// on the map plane, so upright overlays (pins, labels) land exactly on the
// tilted map.

export type LonLat = [number, number];
export type Vec = [number, number];

/** Web Mercator world coordinates; the whole globe spans 0..256. */
export const toWorld = ([lon, lat]: LonLat): Vec => {
	const s = Math.sin((lat * Math.PI) / 180);
	return [
		((lon + 180) / 360) * 256,
		(0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256,
	];
};

export type CameraState = {
	/** Point of the map that sits at the screen focus (horizontal centre, `originY`). */
	focus: LonLat;
	/** Screen pixels per degree of longitude at the focus row. */
	ppd: number;
	/** Map plane tilt in degrees (0 = straight down). */
	tilt: number;
};

export type View = {
	width: number;
	height: number;
	originY: number;
	perspective: number;
	tilt: number;
	/** Screen px per world unit on the (untilted) plane. */
	scale: number;
	/** World -> plane coordinates (before the tilt). */
	flat: (w: Vec) => Vec;
	/** Plane coordinates -> final screen coordinates (after the tilt). */
	project: (p: Vec) => {x: number; y: number; depth: number};
	/** Geographic -> plane coordinates (for layers inside the tilted plane). */
	screenFlat: (ll: LonLat) => Vec;
	/** Geographic -> final screen coordinates. */
	screen: (ll: LonLat) => {x: number; y: number; depth: number};
	/** CSS transform for the plane. */
	planeTransform: string;
	planeOrigin: string;
};

export const makeView = (
	cam: CameraState,
	width: number,
	height: number,
	originY: number,
	perspective: number,
): View => {
	const scale = (cam.ppd * 360) / 256;
	const [fx, fy] = toWorld(cam.focus);
	const ox = width / 2;
	const a = (cam.tilt * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);

	const flat = ([x, y]: Vec): Vec => [ox + (x - fx) * scale, originY + (y - fy) * scale];
	// Same maths as CSS `perspective(P) rotateX(a)` around (ox, originY).
	const project = ([x, y]: Vec) => {
		const dx = x - ox;
		const dy = y - originY;
		const w = 1 - (dy * sin) / perspective;
		return {x: ox + dx / w, y: originY + (dy * cos) / w, depth: 1 / w};
	};
	return {
		width,
		height,
		originY,
		perspective,
		tilt: cam.tilt,
		scale,
		flat,
		project,
		screenFlat: (ll) => flat(toWorld(ll)),
		screen: (ll) => project(flat(toWorld(ll))),
		planeTransform: `perspective(${perspective}px) rotateX(${cam.tilt}deg)`,
		planeOrigin: `${ox}px ${originY}px`,
	};
};
