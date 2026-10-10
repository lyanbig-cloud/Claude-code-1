// Route geometry: the same uniform Catmull-Rom spline that
// scripts/verify_routes.py checks against the Natural Earth coastline.
import {LonLat, toWorld, Vec} from './projection';

export type Route = {
	points: Vec[]; // world coordinates
	cumulative: number[]; // arc length, normalised 0..1
};

export const catmullRom = (pts: LonLat[], n = 60): LonLat[] => {
	const p = [pts[0], ...pts, pts[pts.length - 1]];
	const out: LonLat[] = [];
	for (let i = 1; i < p.length - 2; i++) {
		const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
		for (let k = 0; k < n; k++) {
			const t = k / n;
			const f = (j: 0 | 1) =>
				0.5 *
				(2 * p1[j] +
					(-p0[j] + p2[j]) * t +
					(2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t +
					(-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t * t * t);
			out.push([f(0), f(1)]);
		}
	}
	out.push(pts[pts.length - 1]);
	return out;
};

export const makeRoute = (waypoints: LonLat[], samplesPerSegment = 60): Route => {
	const points = catmullRom(waypoints, samplesPerSegment).map(toWorld);
	const lengths = [0];
	for (let i = 1; i < points.length; i++) {
		const [ax, ay] = points[i - 1];
		const [bx, by] = points[i];
		lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
	}
	const total = lengths[lengths.length - 1];
	return {points, cumulative: lengths.map((l) => l / total)};
};

const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Point at a normalised arc-length position. */
export const pointAt = (r: Route, u: number): Vec => {
	const c = r.cumulative;
	const t = Math.min(1, Math.max(0, u));
	let i = 1;
	while (i < c.length - 1 && c[i] < t) i++;
	const span = c[i] - c[i - 1] || 1;
	return lerp(r.points[i - 1], r.points[i], (t - c[i - 1]) / span);
};

/** Unit tangent at a normalised arc-length position. */
export const tangentAt = (r: Route, u: number): Vec => {
	const a = pointAt(r, Math.max(0, u - 0.002));
	const b = pointAt(r, Math.min(1, u + 0.002));
	const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
	return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

/** Sub-polyline between two normalised arc-length positions. */
export const slice = (r: Route, from: number, to: number): Vec[] => {
	if (to <= from) return [];
	const out: Vec[] = [pointAt(r, from)];
	for (let i = 0; i < r.points.length; i++) {
		if (r.cumulative[i] > from && r.cumulative[i] < to) out.push(r.points[i]);
	}
	out.push(pointAt(r, to));
	return out;
};

/** Normalised arc-length position of the sample closest to a coordinate. */
export const locate = (r: Route, ll: LonLat): number => {
	const [x, y] = toWorld(ll);
	let best = 0;
	let bestD = Infinity;
	r.points.forEach(([px, py], i) => {
		const d = (px - x) ** 2 + (py - y) ** 2;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	});
	return r.cumulative[best];
};
