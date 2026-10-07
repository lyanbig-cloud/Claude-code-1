import {getLength, getPointAtLength, getTangentAtLength} from '@remotion/paths';
import {clamp01} from './motion';

export type Point = {x: number; y: number};
/** Colocación de un grupo de marca en pantalla: traslación + escala uniforme. */
export type Placement = {x: number; y: number; s: number};

const lengthCache = new Map<string, number>();

export const pathLength = (d: string) => {
  let len = lengthCache.get(d);
  if (len === undefined) {
    len = getLength(d);
    lengthCache.set(d, len);
  }
  return len;
};

/** Punto a una fracción (0..1) del largo del path. */
export const pointAt = (d: string, frac: number): Point =>
  getPointAtLength(d, pathLength(d) * clamp01(frac)) ?? {x: 0, y: 0};

export const tangentAt = (d: string, frac: number): Point =>
  getTangentAtLength(d, pathLength(d) * clamp01(frac)) ?? {x: 1, y: 0};

export const place = (p: Placement, pt: Point): Point => ({
  x: p.x + pt.x * p.s,
  y: p.y + pt.y * p.s,
});

export const placementTransform = (p: Placement) =>
  `translate(${p.x} ${p.y}) scale(${p.s})`;

/** Caja aproximada (por puntos de control) de un path absoluto M/L/C/Z. */
export const bboxOf = (d: string) => {
  const nums = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return {x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2};
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

/** Punto sobre una curva cuadrática a→c→b. */
export const quadPoint = (a: Point, c: Point, b: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
};
