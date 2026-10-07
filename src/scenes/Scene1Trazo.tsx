import {AbsoluteFill, interpolate, useVideoConfig} from 'remotion';
import {LOGO_MAIN_GUIDES} from '../brand/guides';
import {LOGO_MAIN} from '../brand/paths';
import {StrokeReveal} from '../brand/StrokeReveal';
import {COLORS, SCENES, T} from '../constants';
import {bboxOf, place, placementTransform, pointAt} from '../lib/geometry';
import {EASE, progress, springAt, SPRINGS, useSceneFrame} from '../lib/motion';
import {BIG_L} from './layout';

const L_BOX = bboxOf(LOGO_MAIN.parts.l);
const DOT_RADIUS = 30;

/** La "l" del logo a gran escala, revelada por su trazo guía en la ventana [start, end]. */
export const BigL: React.FC<{start?: number; end: number; scale?: number}> = ({
  start = 0,
  end,
  scale = 1,
}) => {
  const cx = L_BOX.cx;
  const cy = L_BOX.cy;
  return (
    <g transform={placementTransform(BIG_L)}>
      <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
        <StrokeReveal
          d={LOGO_MAIN.parts.l}
          guide={LOGO_MAIN_GUIDES.l}
          start={start}
          end={end}
          fill={COLORS.premiumOrange}
        />
      </g>
    </g>
  );
};

export const Scene1Trazo: React.FC = () => {
  const frame = useSceneFrame(SCENES.trazo);
  const {fps} = useVideoConfig();

  const draw = progress(frame, T.drawStart, T.drawDur, EASE.write);
  // La "l" crece apenas mientras se escribe y se asienta con un leve exceso.
  const grow = springAt(frame, fps, T.drawStart, SPRINGS.soft, 100);
  const lScale = interpolate(grow, [0, 1], [0.94, 1]);

  // Punto: cae con un rebote corto, se tensa y se convierte en la punta del trazo.
  const appear = springAt(frame, fps, T.dotIn, {damping: 12, stiffness: 220, mass: 0.6}, 24);
  const drop = springAt(frame, fps, T.dotIn, {damping: 7, stiffness: 160, mass: 0.7}, 34);
  const squash = Math.min(0.22, Math.max(0, drop - 1) * 0.7);
  const anticipation = progress(frame, T.drawStart - 10, 10, EASE.inOut);
  const toNib = progress(frame, T.drawStart, 14, EASE.out);
  const out = progress(frame, T.dotOut, 12, EASE.in);
  const r =
    DOT_RADIUS *
    appear *
    (1 + 0.16 * anticipation - 0.16 * toNib - 0.35 * toNib) *
    (1 - out);

  const head = place(BIG_L, scaleAround(pointAt(LOGO_MAIN_GUIDES.l.d, draw), lScale));
  const dropOffset = (1 - drop) * -170;

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.tolopea}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <BigL end={draw} scale={lScale} />
        {r > 0.1 ? (
          <ellipse
            cx={head.x}
            cy={head.y + dropOffset}
            rx={r * (1 + squash)}
            ry={r * (1 - squash)}
            fill={COLORS.doveWhite}
          />
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

const scaleAround = (p: {x: number; y: number}, s: number) => ({
  x: L_BOX.cx + (p.x - L_BOX.cx) * s,
  y: L_BOX.cy + (p.y - L_BOX.cy) * s,
});
