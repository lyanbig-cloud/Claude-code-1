import {AbsoluteFill, interpolate} from 'remotion';
import {LOGO_MAIN_GUIDES} from '../brand/guides';
import {COLORS, SCENES, T} from '../constants';
import {pathLength, place, placementTransform, type Point} from '../lib/geometry';
import {EASE, progress, useSceneFrame} from '../lib/motion';
import {BigL} from './Scene1Trazo';
import {BIG_L, L_TAIL} from './layout';

const GUIDE = LOGO_MAIN_GUIDES.l.d;
const L_LEN = pathLength(GUIDE);
// Dirección de salida del remate de la "l": eje de todas las líneas de la escena.
const U = L_TAIL.dir;
const N = {x: -U.y, y: U.x};
const TIP = place(BIG_L, L_TAIL.tip);
const CENTER = {x: 960, y: 540};
// Prolongación recta del remate hasta salir de cuadro (unidades locales de la "l").
// Arranca unas unidades dentro del remate para que la unión no se vea.
const EXT_OVERLAP = 8;
const EXT_LEN = 2600 / BIG_L.s;
const TOTAL = L_LEN + EXT_LEN;

const along = (base: Point, s: number): Point => ({x: base.x - U.x * s, y: base.y - U.y * s});
const offsetFromCenter = (o: number): Point => ({x: CENTER.x + N.x * o, y: CENTER.y + N.y * o});
const EXIT_OFFSET = (TIP.x - CENTER.x) * N.x + (TIP.y - CENTER.y) * N.y;

// La línea vuelve multiplicada: 5 trazos naranjas paralelos, el central sobre la misma salida.
const STREAKS = [0, -150, 150, -300, 300].map((o, i) => ({
  offset: EXIT_OFFSET + o,
  start: T.streaksStart + i * 4,
}));
// Barrido: 12 líneas Beyond Blue que engordan hasta cubrir el cuadro, de un lado al otro.
const SWEEP = Array.from({length: 12}, (_, i) => ({
  offset: (i - 5.5) * 200,
  start: T.sweepStart + i * T.sweepStagger,
}));
// Líneas Madeline finas entre medio, para dar profundidad.
const DEPTH = Array.from({length: 6}, (_, i) => ({
  offset: (i * 2 - 5) * 200 + 100,
  start: T.sweepStart + 2 + i * 5,
}));
const SWEEP_DONE = SWEEP[SWEEP.length - 1].start + T.sweepDur + 6;

/** Tramo [sMin, sMax] del eje en que una línea paralela está dentro del cuadro (sMin = abajo a la derecha). */
const screenSpan = (base: Point): [number, number] => {
  const sx: [number, number] = [(base.x - 1920) / U.x, base.x / U.x];
  const sy: [number, number] = [(base.y - 1080) / U.y, base.y / U.y];
  const lo = Math.max(sx[0], sy[0]);
  const hi = Math.min(sx[1], sy[1]);
  return lo < hi ? [lo, hi] : [lo, lo];
};

export const Scene2Lineas: React.FC = () => {
  const frame = useSceneFrame(SCENES.lineas);

  // 1) La "l" se des-escribe desde su inicio mientras el remate se estira y sale de cuadro.
  const headU = L_LEN + EXT_LEN * progress(frame, T.stretchStart, 30, EASE.in);
  const tailU = Math.min(headU, TOTAL * progress(frame, T.stretchStart + 4, T.stretchDur, EASE.inOut));
  const extFrom = Math.max(-EXT_OVERLAP, tailU - L_LEN);
  const extTo = headU - L_LEN;
  const extPoint = (s: number) => ({x: L_TAIL.tip.x + U.x * s, y: L_TAIL.tip.y + U.y * s});

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.tolopea}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <BigL start={tailU / L_LEN} end={headU / L_LEN} />
        {headU > L_LEN + 0.5 ? (
          <g transform={placementTransform(BIG_L)}>
            <line
              x1={extPoint(extFrom).x}
              y1={extPoint(extFrom).y}
              x2={extPoint(extTo).x}
              y2={extPoint(extTo).y}
              stroke={COLORS.premiumOrange}
              strokeWidth={L_TAIL.thickness}
              strokeLinecap="butt"
            />
          </g>
        ) : null}

        {/* 2) Vuelve multiplicada en líneas paralelas */}
        {STREAKS.map((s, i) => (
          <Streak
            key={`streak-${i}`}
            frame={frame}
            offset={s.offset}
            start={s.start}
            duration={T.streakDur}
            length={900}
            width={L_TAIL.thickness * BIG_L.s}
            color={COLORS.premiumOrange}
          />
        ))}

        {/* 3) Barrido hacia Beyond Blue */}
        {SWEEP.map((s, i) => {
          const t = progress(frame, s.start, T.sweepDur, EASE.inOut);
          if (t <= 0) return null;
          const width = interpolate(progress(frame, s.start + 4, T.sweepDur, EASE.inOut), [0, 1], [16, 224]);
          const base = offsetFromCenter(s.offset);
          const span = screenSpan(offsetFromCenter(Math.max(-1000, Math.min(1000, s.offset))));
          const s0 = span[0] - 140;
          const s1 = span[1] + 140;
          const from = along(base, s0);
          const to = along(base, s0 + (s1 - s0) * t);
          return (
            <line
              key={`sweep-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={COLORS.beyondBlue}
              strokeWidth={width}
              strokeLinecap="round"
            />
          );
        })}
        {DEPTH.map((s, i) => (
          <Streak
            key={`depth-${i}`}
            frame={frame}
            offset={s.offset}
            start={s.start}
            duration={30}
            length={620}
            width={14}
            color={COLORS.madeline}
          />
        ))}
        {frame >= SWEEP_DONE ? <rect width={1920} height={1080} fill={COLORS.beyondBlue} /> : null}
      </svg>
    </AbsoluteFill>
  );
};

/** Trazo de paso: entra por abajo a la derecha y sale arriba a la izquierda. */
const Streak: React.FC<{
  frame: number;
  offset: number;
  start: number;
  duration: number;
  length: number;
  width: number;
  color: string;
}> = ({frame, offset, start, duration, length, width, color}) => {
  const t = progress(frame, start, duration, EASE.inOut);
  if (t <= 0 || t >= 1) return null;
  const base = offsetFromCenter(offset);
  const [sMin, sMax] = screenSpan(base);
  const from = sMin - width;
  const head = from + (sMax + length + width - from) * t;
  const tail = Math.max(from, head - length);
  const a = along(base, tail);
  const b = along(base, head);
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
};
