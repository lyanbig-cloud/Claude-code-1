import {useId} from 'react';
import {AbsoluteFill, interpolate, useVideoConfig} from 'remotion';
import {LOGO_MAIN_GUIDES} from '../brand/guides';
import {LOGO_MAIN} from '../brand/paths';
import {StrokeReveal} from '../brand/StrokeReveal';
import {AGENCY_LETTERS, AGENCY_STAGGER, COLORS, LOGO_LETTERS, SCENES, STAGGER, T} from '../constants';
import {FONTS} from '../fonts';
import {bboxOf, placementTransform, quadPoint, type Point} from '../lib/geometry';
import {EASE, progress, springAt, SPRINGS, useSceneFrame} from '../lib/motion';
import {PARTICLES, type Particle} from './fragments';
import {LOGO_PLACEMENT, TAGLINE, TAGLINE_TOP} from './layout';

const AGENCY_BOXES = AGENCY_LETTERS.map((k) => bboxOf(LOGO_MAIN.parts[k]));
const AGENCY_TOP = Math.min(...AGENCY_BOXES.map((b) => b.y0));
const AGENCY_BOTTOM = Math.max(...AGENCY_BOXES.map((b) => b.y1));
const AGENCY_DROP = AGENCY_BOTTOM - AGENCY_TOP + 6;
const TAGLINE_WORDS = ['Creative Ideas,', 'Meaningful Impact'];

const useSvgId = (prefix: string) => `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

export const Scene4Logo: React.FC = () => {
  const frame = useSceneFrame(SCENES.logo);
  const {fps} = useVideoConfig();
  const clipId = useSvgId('agency');

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.tolopea}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{position: 'absolute'}}>
        <g transform={placementTransform(LOGO_PLACEMENT)}>
          {/* "lova": cada letra se escribe con su trazo guía, 4 frames después de la anterior */}
          {LOGO_LETTERS.map(({key, start, dur}) => {
            const draw = progress(frame, start, dur, EASE.write);
            const settle = springAt(frame, fps, start, SPRINGS.settle, 44);
            const s = interpolate(settle, [0, 1], [0.9, 1]);
            const b = bboxOf(LOGO_MAIN.parts[key]);
            return (
              <g key={key} transform={`translate(${b.cx} ${b.cy}) scale(${s}) translate(${-b.cx} ${-b.cy})`}>
                <StrokeReveal
                  d={LOGO_MAIN.parts[key]}
                  guide={LOGO_MAIN_GUIDES[key]}
                  end={draw}
                  fill={key === 'l' ? COLORS.premiumOrange : COLORS.doveWhite}
                />
              </g>
            );
          })}

          {/* "agency": sube por máscara desde la línea base, letra por letra */}
          <clipPath id={clipId}>
            <rect x={-20} y={AGENCY_TOP - 8} width={LOGO_MAIN.width + 40} height={AGENCY_DROP + 10} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            {AGENCY_LETTERS.map((key, j) => {
              const e = springAt(frame, fps, T.agency + j * AGENCY_STAGGER, SPRINGS.settle, T.agencyDur);
              if (e <= 0) return null;
              return (
                <path
                  key={key}
                  d={LOGO_MAIN.parts[key]}
                  fill={COLORS.doveWhite}
                  transform={`translate(0 ${(1 - e) * AGENCY_DROP})`}
                />
              );
            })}
          </g>
        </g>

        {PARTICLES.map((p) => (
          <Gathering key={p.id} p={p} frame={frame} />
        ))}
      </svg>

      <Tagline frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/** Punto que viaja desde donde quedó en la escena 3 hasta la punta del trazo y se funde en ella. */
const Gathering: React.FC<{p: Particle; frame: number}> = ({p, frame}) => {
  const depart = Math.max(SCENES.logo.from, p.arrival - 40);
  const t = progress(frame, depart, p.arrival - depart, EASE.inOut);
  const absorb = progress(frame, p.arrival, 6, EASE.in);
  if (absorb >= 1) return null;
  const mid: Point = {x: (p.scatter.x + p.target.x) / 2, y: (p.scatter.y + p.target.y) / 2};
  const dx = p.target.x - p.scatter.x;
  const dy = p.target.y - p.scatter.y;
  const len = Math.hypot(dx, dy) || 1;
  const control = {x: mid.x - (dy / len) * p.curve, y: mid.y + (dx / len) * p.curve};
  // Mientras espera su turno, el punto flota apenas (sin quedarse congelado).
  const wait = 1 - progress(frame, depart, 10, EASE.out);
  const idle = Math.sin((frame - SCENES.logo.from) / 9 + p.curve) * 5 * wait * progress(frame, SCENES.logo.from, 12, EASE.inOut);
  const pos = quadPoint(p.scatter, control, p.target, t);
  return <circle cx={pos.x} cy={pos.y + idle} r={p.radius * (1 - absorb) * interpolate(t, [0, 1], [1, 0.75])} fill={p.color} />;
};

/** "Creative Ideas, Meaningful Impact" en Manrope SemiBold, entra por máscara desde abajo. */
const Tagline: React.FC<{frame: number; fps: number}> = ({frame, fps}) => (
  <div
    style={{
      position: 'absolute',
      top: TAGLINE_TOP,
      left: 0,
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      gap: '0.3em',
      fontFamily: FONTS.body,
      fontWeight: 600,
      fontSize: TAGLINE.fontSize,
      lineHeight: 1.2,
      letterSpacing: '0.01em',
      color: COLORS.doveWhite,
    }}
  >
    {TAGLINE_WORDS.map((w, i) => {
      const e = springAt(frame, fps, T.tagline + i * STAGGER, SPRINGS.settle, T.taglineDur);
      return (
        <span key={w} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: 4}}>
          <span style={{display: 'inline-block', transform: `translateY(${(1 - e) * 120}%)`}}>{w}</span>
        </span>
      );
    })}
  </div>
);
