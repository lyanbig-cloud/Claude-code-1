import {Easing, interpolate, spring, useCurrentFrame, type SpringConfig} from 'remotion';

// Curvas con aceleración y frenado marcados. Nada lineal.
export const EASE = {
  inOut: Easing.bezier(0.7, 0, 0.3, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  // Ritmo de mano: arranca con decisión y frena al cerrar el trazo.
  write: Easing.bezier(0.55, 0.05, 0.25, 1),
} as const;

// Muelles con un pequeño exceso antes de asentarse.
export const SPRINGS = {
  pop: {damping: 10, stiffness: 170, mass: 0.7},
  settle: {damping: 13, stiffness: 120, mass: 0.8},
  soft: {damping: 15, stiffness: 70, mass: 1},
} satisfies Record<string, Partial<SpringConfig>>;

/** 0→1 entre `start` y `start + duration`, con easing y fijado en los extremos. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE.inOut,
) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/**
 * Spring que termina exactamente en `start + duration`: después devuelve 1 exacto,
 * así el tramo final del video queda completamente quieto.
 */
export const springAt = (
  frame: number,
  fps: number,
  start: number,
  config: Partial<SpringConfig>,
  duration: number,
) => {
  if (frame <= start) return 0;
  if (frame >= start + duration) return 1;
  return spring({frame: frame - start, fps, config, durationInFrames: duration});
};

/** Inversa numérica de una curva de easing monótona (para sincronizar llegadas con el trazo). */
export const invertEase = (ease: (t: number) => number, y: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Frame absoluto de la composición dentro de una escena montada en <Sequence from={scene.from}>. */
export const useSceneFrame = (scene: {from: number}) => useCurrentFrame() + scene.from;
