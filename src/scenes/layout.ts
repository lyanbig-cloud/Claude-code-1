import {ASSET_A, ASSET_HI, ASSET_LL, FLOWER_CROSS, LOGO_MAIN} from '../brand/paths';
import {bboxOf, type Placement} from '../lib/geometry';

const W = 1920;
const H = 1080;

// --- Escena 1 y 2: la "l" grande, casi a toda altura --------------------------------
const lBox = bboxOf(LOGO_MAIN.parts.l);
const BIG_L_SCALE = 4.4; // ~940 px de alto sobre 1080
export const BIG_L: Placement = {
  x: W / 2 - lBox.cx * BIG_L_SCALE,
  y: H / 2 - lBox.cy * BIG_L_SCALE,
  s: BIG_L_SCALE,
};
// Remate de la "l" medido sobre el vector del manual (unidades del logo): centro del corte,
// dirección de los bordes y grosor. La línea que se estira en la escena 2 nace exactamente de ahí.
export const L_TAIL = {tip: {x: 65.45, y: 207.97}, dir: {x: 0.554, y: 0.832}, thickness: 19.2};

// --- Escena 3: brand assets (pág. 17) -------------------------------------------------
// Zona derecha (x 860–1840): fila "ll" "hi" "a" arriba, flor debajo. Palabras a la izquierda.
const ZONE = {x0: 860, x1: 1840};
const GAP = 40;
const assetScale =
  (ZONE.x1 - ZONE.x0 - GAP * 2) / (ASSET_LL.width + ASSET_HI.width + ASSET_A.width);
const ROW_TOP = 120;
const ROW_BOTTOM = ROW_TOP + ASSET_LL.height * assetScale;
const llX = ZONE.x0;
const hiX = llX + ASSET_LL.width * assetScale + GAP;
const aX = hiX + ASSET_HI.width * assetScale + GAP;

export const ASSET_PLACEMENTS = {
  ll: {x: llX, y: ROW_TOP, s: assetScale},
  hi: {x: hiX, y: ROW_BOTTOM - ASSET_HI.height * assetScale, s: assetScale},
  a: {x: aX, y: ROW_BOTTOM - ASSET_A.height * assetScale, s: assetScale},
} satisfies Record<string, Placement>;

const FLOWER_SIZE = 380;
const flowerScale = FLOWER_SIZE / FLOWER_CROSS.width;
export const FLOWER_CENTER = {x: (ZONE.x0 + ZONE.x1) / 2, y: 790};
export const FLOWER_PLACEMENT: Placement = {
  x: FLOWER_CENTER.x - (FLOWER_CROSS.width / 2) * flowerScale,
  y: FLOWER_CENTER.y - (FLOWER_CROSS.height / 2) * flowerScale,
  s: flowerScale,
};

export const WORDS = {
  x: 120,
  fontSize: 112,
  lineHeight: 1.08,
  centerY: H / 2,
} as const;

// --- Escena 4: logo principal centrado con su área de protección ---------------------
// Área de protección (manual pág. 13): x = altura de la "e" de "agency".
const LOGO_WIDTH = 760;
export const LOGO_SCALE = LOGO_WIDTH / LOGO_MAIN.width;
export const PROTECTION_X = bboxOf(LOGO_MAIN.parts.agE).h * LOGO_SCALE;
export const TAGLINE = {fontSize: 40, gap: PROTECTION_X * 1.25};
const blockHeight = LOGO_MAIN.height * LOGO_SCALE + TAGLINE.gap + TAGLINE.fontSize * 1.2;
export const LOGO_PLACEMENT: Placement = {
  x: W / 2 - (LOGO_MAIN.width / 2) * LOGO_SCALE,
  y: (H - blockHeight) / 2,
  s: LOGO_SCALE,
};
export const TAGLINE_TOP = LOGO_PLACEMENT.y + LOGO_MAIN.height * LOGO_SCALE + TAGLINE.gap;
