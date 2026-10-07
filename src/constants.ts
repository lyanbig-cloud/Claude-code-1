// Paleta oficial LOVA Agency (manual de marca, pág. 7). Usar sólo estos códigos.
export const COLORS = {
  tolopea: '#18014D', // fondo principal
  madeline: '#452ABC', // secundario, profundidad
  beyondBlue: '#7235F5', // movimiento y energía
  premiumOrange: '#FF6633', // acento: trazo de la "l"
  doveWhite: '#FEFBFA', // texto sobre oscuro / fondo limpio
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 60,
  durationInFrames: 600,
} as const;

// Rango de cada escena en frames absolutos [from, to).
export const SCENES = {
  trazo: {from: 0, to: 150},
  lineas: {from: 150, to: 300},
  assets: {from: 300, to: 450},
  logo: {from: 450, to: 600},
} as const;

// Retraso entre elementos que entran juntos (regla: 3 a 5 frames).
export const STAGGER = 4;

// Golpes de tiempo (frames absolutos). Todo lo que se mueve cuelga de aquí.
export const T = {
  // Escena 1: punto + "l" escrita
  dotIn: 6,
  drawStart: 40,
  drawDur: 78,
  dotOut: 114,
  // Escena 2: la "l" se estira, sale, vuelve multiplicada y barre a Beyond Blue
  stretchStart: 156,
  stretchDur: 34,
  streaksStart: 178,
  streakDur: 38,
  sweepStart: 214,
  sweepStagger: 4,
  sweepDur: 44,
  // Escena 3: brand assets + flor + palabras + ruptura
  assetsWrite: 300,
  assetsWriteDur: 52,
  flowerStart: 318,
  flowerDur: 56,
  words: [334, 346, 358],
  wordsOut: 404,
  shatter: 416,
  shatterDur: 28,
  iris: 418,
  irisDur: 32,
  // Escena 4: los puntos forman el logo
  logoWrite: 462,
  agency: 494,
  agencyDur: 26,
  tagline: 512,
  taglineDur: 24,
  hold: 540, // desde aquí, todo quieto hasta el frame 600
} as const;

// Escritura del logo final: cada letra arranca STAGGER frames después de la anterior.
export const LOGO_LETTERS = [
  {key: 'l', start: T.logoWrite, dur: 46},
  {key: 'o', start: T.logoWrite + STAGGER, dur: 40},
  {key: 'v', start: T.logoWrite + STAGGER * 2, dur: 32},
  {key: 'a', start: T.logoWrite + STAGGER * 3, dur: 40},
] as const;

export const AGENCY_LETTERS = ['agA', 'agG', 'agE', 'agN', 'agC', 'agY'] as const;
export const AGENCY_STAGGER = 3;
