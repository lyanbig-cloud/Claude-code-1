// Fragmentos y puntos: el elemento de marca que cruza de la escena 3 a la 4.
// Se calculan una sola vez (deterministas) y ambas escenas leen la misma lista:
// la escena 3 los rompe y dispersa, la escena 4 los recoge en el logo.
import {random} from 'remotion';
import {ASSET_GUIDES, LOGO_MAIN_GUIDES} from '../brand/guides';
import {ASSET_HI, ASSET_LL, FLOWER_CROSS, LOGO_MAIN} from '../brand/paths';
import {AGENCY_LETTERS, AGENCY_STAGGER, COLORS, LOGO_LETTERS, T} from '../constants';
import {bboxOf, pathLength, place, pointAt, type Placement, type Point} from '../lib/geometry';
import {EASE, invertEase} from '../lib/motion';
import {ASSET_PLACEMENTS, FLOWER_PLACEMENT, LOGO_PLACEMENT} from './layout';

export type AssetKey = keyof typeof ASSET_PLACEMENTS;

export type Wedge = {a0: number; a1: number; r0: number; r1: number};

type Source =
  | {kind: 'stroke'; asset: AssetKey; window: [number, number]}
  | {kind: 'flower'; wedge: Wedge}
  | {kind: 'dot'; d: string; placement: Placement}
  | {kind: 'spark'};

export type Particle = Source & {
  id: string;
  origin: Point; // centro del fragmento al romperse (pantalla)
  scatter: Point; // dónde queda el punto al final de la escena 3
  rotation: number;
  delay: number; // 0..4 frames
  radius: number;
  color: string;
  target: Point; // destino sobre el logo
  arrival: number; // frame en que llega (sincronizado con la punta del trazo)
  curve: number; // curvatura de la trayectoria
};

const BURST_CENTER = {x: 1330, y: 520};
const FLOWER_C_LOCAL = {x: FLOWER_CROSS.width / 2, y: FLOWER_CROSS.height / 2};
export const FLOWER_RING_SPLIT = 62;
export const FLOWER_OUTER_R = 230;

/** Polígono de un sector (anular) alrededor del centro de la flor, en unidades locales. */
export const wedgePolygon = ({a0, a1, r0, r1}: Wedge) => {
  const pts: string[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    pts.push(`${FLOWER_C_LOCAL.x + Math.cos(a) * r1},${FLOWER_C_LOCAL.y + Math.sin(a) * r1}`);
  }
  if (r0 <= 0) pts.push(`${FLOWER_C_LOCAL.x},${FLOWER_C_LOCAL.y}`);
  else
    for (let i = steps; i >= 0; i--) {
      const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
      pts.push(`${FLOWER_C_LOCAL.x + Math.cos(a) * r0},${FLOWER_C_LOCAL.y + Math.sin(a) * r0}`);
    }
  return pts.join(' ');
};

// Los pétalos apuntan a 0°, 90°, 180° y 270°: cada cuadrante es un pétalo doble completo.
export const FLOWER_QUADRANTS: Wedge[] = [0, 90, 180, 270].map((c) => ({
  a0: c - 45,
  a1: c + 45,
  r0: 0,
  r1: FLOWER_OUTER_R,
}));

const clampToFrame = (p: Point): Point => ({
  x: Math.min(1800, Math.max(120, p.x)),
  y: Math.min(980, Math.max(100, p.y)),
});

const build = (): Particle[] => {
  type Raw = Source & {origin: Point; radius: number; spread: number};
  const raw: Raw[] = [];

  // Trazos "ll", "hi", "a": se parten en tramos a lo largo de su propia guía.
  (Object.keys(ASSET_PLACEMENTS) as AssetKey[]).forEach((asset) => {
    const guide = ASSET_GUIDES[asset];
    const n = Math.max(6, Math.round(pathLength(guide.d) / 80));
    for (let i = 0; i < n; i++) {
      const w: [number, number] = [i / n, (i + 1) / n];
      raw.push({
        kind: 'stroke',
        asset,
        window: w,
        origin: place(ASSET_PLACEMENTS[asset], pointAt(guide.d, (w[0] + w[1]) / 2)),
        radius: 9,
        spread: 1,
      });
    }
  });

  // Flor: 4 sectores x 2 anillos.
  FLOWER_QUADRANTS.forEach((q) => {
    [
      {r0: 0, r1: FLOWER_RING_SPLIT, rm: FLOWER_RING_SPLIT * 0.55},
      {r0: FLOWER_RING_SPLIT, r1: FLOWER_OUTER_R, rm: 110},
    ].forEach(({r0, r1, rm}) => {
      const am = (((q.a0 + q.a1) / 2) * Math.PI) / 180;
      raw.push({
        kind: 'flower',
        wedge: {...q, r0, r1},
        origin: place(FLOWER_PLACEMENT, {
          x: FLOWER_C_LOCAL.x + Math.cos(am) * rm,
          y: FLOWER_C_LOCAL.y + Math.sin(am) * rm,
        }),
        radius: 10,
        spread: 1,
      });
    });
  });

  // Puntos propios de los assets (ya son puntos: sólo viajan).
  const dots: {d: string; placement: Placement}[] = [
    {d: ASSET_LL.parts.dot, placement: ASSET_PLACEMENTS.ll},
    {d: ASSET_HI.parts.dot, placement: ASSET_PLACEMENTS.hi},
    ...(['dotTL', 'dotTR', 'dotBL', 'dotBR'] as const).map((k) => ({
      d: FLOWER_CROSS.parts[k],
      placement: FLOWER_PLACEMENT,
    })),
  ];
  dots.forEach(({d, placement}) => {
    const b = bboxOf(d);
    raw.push({kind: 'dot', d, placement, origin: place(placement, {x: b.cx, y: b.cy}), radius: 11, spread: 0.8});
  });

  // Chispas: puntos sueltos que salen despedidos más lejos.
  const sources = raw.slice();
  for (let i = 0; i < 26; i++) {
    const src = sources[Math.floor(random(`spark-src-${i}`) * sources.length)];
    raw.push({kind: 'spark', origin: src.origin, radius: 4 + random(`spark-r-${i}`) * 3.5, spread: 1.9});
  }

  // Dispersión.
  const scattered = raw.map((r, i) => {
    const dx = r.origin.x - BURST_CENTER.x;
    const dy = r.origin.y - BURST_CENTER.y;
    const base = Math.atan2(dy, dx) + (random(`ang-${i}`) - 0.5) * 0.9;
    const dist = (150 + random(`dist-${i}`) * 230) * r.spread;
    // Mezcla del impulso radial con un punto libre del cuadro: los puntos ocupan toda la
    // pantalla en lugar de amontonarse contra los bordes.
    const free = {x: 200 + random(`fx-${i}`) * 1520, y: 150 + random(`fy-${i}`) * 780};
    const burst = {x: r.origin.x + Math.cos(base) * dist, y: r.origin.y + Math.sin(base) * dist};
    return {
      ...r,
      id: `p${i}`,
      scatter: clampToFrame({x: burst.x * 0.55 + free.x * 0.45, y: burst.y * 0.55 + free.y * 0.45}),
      rotation: (random(`rot-${i}`) - 0.5) * 300,
      delay: Math.floor(random(`delay-${i}`) * 5),
      curve: (random(`curve-${i}`) - 0.5) * 380,
    };
  });

  // Destinos sobre el logo final, sincronizados con la punta de cada letra.
  const targets: {pos: Point; arrival: number; letter: string}[] = [];
  const agencyCount = AGENCY_LETTERS.length * 2;
  const strokeCount = scattered.length - agencyCount;
  const lens = LOGO_LETTERS.map((l) => pathLength(LOGO_MAIN_GUIDES[l.key].d));
  const totalLen = lens.reduce((a, b) => a + b, 0);
  let assigned = 0;
  LOGO_LETTERS.forEach((letter, k) => {
    const n =
      k === LOGO_LETTERS.length - 1 ? strokeCount - assigned : Math.round((strokeCount * lens[k]) / totalLen);
    assigned += n;
    for (let j = 0; j < n; j++) {
      const t = 0.04 + (0.93 * (j + 0.5)) / n;
      targets.push({
        pos: place(LOGO_PLACEMENT, pointAt(LOGO_MAIN_GUIDES[letter.key].d, t)),
        arrival: letter.start + letter.dur * invertEase(EASE.write, t),
        letter: letter.key,
      });
    }
  });
  AGENCY_LETTERS.forEach((key, j) => {
    const b = bboxOf(LOGO_MAIN.parts[key]);
    [0.35, 0.7].forEach((fy) => {
      targets.push({
        pos: place(LOGO_PLACEMENT, {x: b.cx, y: b.y0 + b.h * fy}),
        arrival: T.agency + j * AGENCY_STAGGER + 6,
        letter: key,
      });
    });
  });

  // Emparejar por posición horizontal: los puntos se juntan sin cruzarse de más.
  const byX = scattered.map((p, i) => ({p, i})).sort((a, b) => a.p.scatter.x - b.p.scatter.x);
  const targetsByX = targets.slice().sort((a, b) => a.pos.x - b.pos.x);
  const result: Particle[] = new Array(scattered.length);
  byX.forEach(({p, i}, rank) => {
    const tg = targetsByX[rank];
    result[i] = {
      ...p,
      target: tg.pos,
      arrival: tg.arrival,
      color: tg.letter === 'l' ? COLORS.premiumOrange : COLORS.doveWhite,
    } as Particle;
  });
  return result;
};

export const PARTICLES: Particle[] = build();
