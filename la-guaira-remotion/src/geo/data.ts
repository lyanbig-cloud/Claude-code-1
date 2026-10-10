import geography from './geography.json';
import vectors from './vectors.json';
import {LonLat} from './projection';
import {locate, makeRoute} from './spline';

type Place = {coord: LonLat; source: string};

export const places = geography.places as unknown as Record<'laGuaira' | 'puertoCabello' | 'maracaibo', Place>;

const r = geography.routes;
export const routes = {
	main: makeRoute(r.main.points as LonLat[]),
	toPuertoCabello: makeRoute(r.toPuertoCabello.points as LonLat[]),
	toZulia: makeRoute(r.toZulia.points as LonLat[]),
};
export const cutPoint = r.main.cut as LonLat;
export const cutU = locate(routes.main, cutPoint);
export const branchPoint = r.toPuertoCabello.points[0] as LonLat;

export {vectors};
