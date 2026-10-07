import {useId} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useVideoConfig} from 'remotion';
import {ASSET_GUIDES} from '../brand/guides';
import {ASSET_A, ASSET_HI, ASSET_LL, FLOWER_CROSS} from '../brand/paths';
import {StrokeReveal} from '../brand/StrokeReveal';
import {COLORS, SCENES, STAGGER, T} from '../constants';
import {FONTS} from '../fonts';
import {bboxOf, lerpPoint, placementTransform, type Placement} from '../lib/geometry';
import {EASE, progress, springAt, SPRINGS, useSceneFrame} from '../lib/motion';
import {FLOWER_QUADRANTS, PARTICLES, wedgePolygon, type AssetKey, type Particle, type Wedge} from './fragments';
import {ASSET_PLACEMENTS, FLOWER_CENTER, FLOWER_PLACEMENT, WORDS} from './layout';

const ASSETS: Record<AssetKey, {stroke: string; dot?: string; box: ReturnType<typeof bboxOf>}> = {
  ll: {stroke: ASSET_LL.parts.stroke, dot: ASSET_LL.parts.dot, box: bboxOf(ASSET_LL.parts.stroke)},
  hi: {stroke: ASSET_HI.parts.stroke, dot: ASSET_HI.parts.dot, box: bboxOf(ASSET_HI.parts.stroke)},
  a: {stroke: ASSET_A.parts.stroke, box: bboxOf(ASSET_A.parts.stroke)},
};
const ASSET_ORDER: AssetKey[] = ['ll', 'hi', 'a'];
const FLOWER_DOTS = ['dotTL', 'dotTR', 'dotBR', 'dotBL'] as const;
const WORD_LIST = ['Estrategas', 'Creativos', 'Coherentes'];

const useSvgId = (prefix: string) => `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

export const Scene3Assets: React.FC = () => {
  const frame = useSceneFrame(SCENES.assets);
  const {fps} = useVideoConfig();
  const broken = frame >= T.shatter;
  const irisR = 2300 * progress(frame, T.iris, T.irisDur, EASE.inOut);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.beyondBlue}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{position: 'absolute'}}>
        {!broken ? (
          <>
            {ASSET_ORDER.map((key, i) => (
              <WrittenAsset key={key} asset={key} start={T.assetsWrite + i * STAGGER} frame={frame} fps={fps} />
            ))}
            <AssemblingFlower frame={frame} fps={fps} />
          </>
        ) : null}
        {irisR > 0 ? <circle cx={FLOWER_CENTER.x} cy={FLOWER_CENTER.y} r={irisR} fill={COLORS.tolopea} /> : null}
        {broken ? PARTICLES.map((p) => <Fragment key={p.id} p={p} frame={frame} fps={fps} />) : null}
      </svg>
      <Words frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/** "ll", "hi" y "a" escritos con su trazo guía; el punto cae al terminar. */
const WrittenAsset: React.FC<{asset: AssetKey; start: number; frame: number; fps: number}> = ({
  asset,
  start,
  frame,
  fps,
}) => {
  const {stroke, dot, box} = ASSETS[asset];
  const draw = progress(frame, start, T.assetsWriteDur, EASE.write);
  const settle = springAt(frame, fps, start, SPRINGS.soft, 70);
  const s = interpolate(settle, [0, 1], [0.9, 1]);
  const dotIn = springAt(frame, fps, start + T.assetsWriteDur - 8, SPRINGS.pop, 26);
  const dotBox = dot ? bboxOf(dot) : null;
  return (
    <g transform={placementTransform(ASSET_PLACEMENTS[asset])}>
      <g transform={`translate(${box.cx} ${box.cy}) scale(${s}) translate(${-box.cx} ${-box.cy})`}>
        <StrokeReveal d={stroke} guide={ASSET_GUIDES[asset]} end={draw} fill={COLORS.tolopea} />
        {dot && dotBox && dotIn > 0 ? (
          <g
            transform={`translate(${dotBox.cx} ${dotBox.cy - (1 - dotIn) * 40}) scale(${dotIn}) translate(${-dotBox.cx} ${-dotBox.cy})`}
          >
            <path d={dot} fill={COLORS.tolopea} />
          </g>
        ) : null}
      </g>
    </g>
  );
};

/** Patrón flor: gira mientras sus cuatro pétalos dobles llegan uno a uno y se encajan. */
const AssemblingFlower: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const id = useSvgId('flower');
  const spin = springAt(frame, fps, T.flowerStart, SPRINGS.settle, T.flowerDur + 10);
  const rotation = interpolate(spin, [0, 1], [-150, 0]);
  const c = {x: FLOWER_CROSS.width / 2, y: FLOWER_CROSS.height / 2};
  return (
    <g transform={placementTransform(FLOWER_PLACEMENT)}>
      <g transform={`rotate(${rotation} ${c.x} ${c.y})`}>
        {FLOWER_QUADRANTS.map((q, i) => {
          const e = springAt(frame, fps, T.flowerStart + i * STAGGER, SPRINGS.pop, 40);
          if (e <= 0) return null;
          const axis = (((q.a0 + q.a1) / 2) * Math.PI) / 180;
          const away = (1 - e) * 220;
          const rot = (1 - e) * -70;
          const sc = interpolate(e, [0, 1], [0.55, 1]);
          return (
            <g
              key={i}
              transform={`translate(${Math.cos(axis) * away} ${Math.sin(axis) * away}) rotate(${rot} ${c.x} ${c.y}) translate(${c.x} ${c.y}) scale(${sc}) translate(${-c.x} ${-c.y})`}
            >
              <clipPath id={`${id}-${i}`}>
                <polygon points={wedgePolygon(q)} />
              </clipPath>
              <path d={FLOWER_CROSS.parts.body} fill={COLORS.tolopea} clipPath={`url(#${id}-${i})`} />
            </g>
          );
        })}
        {FLOWER_DOTS.map((k, i) => {
          const e = springAt(frame, fps, T.flowerStart + 18 + i * STAGGER, SPRINGS.pop, 26);
          if (e <= 0) return null;
          const b = bboxOf(FLOWER_CROSS.parts[k]);
          return (
            <g key={k} transform={`translate(${b.cx} ${b.cy}) scale(${e}) translate(${-b.cx} ${-b.cy})`}>
              <path d={FLOWER_CROSS.parts[k]} fill={COLORS.tolopea} />
            </g>
          );
        })}
      </g>
    </g>
  );
};

/** Un pedazo de marca que sale despedido y se convierte en punto. */
const Fragment: React.FC<{p: Particle; frame: number; fps: number}> = ({p, frame, fps}) => {
  const start = T.shatter + p.delay;
  const t = progress(frame, start, T.shatterDur, EASE.out);
  const pos = lerpPoint(p.origin, p.scatter, t);
  const shrink = progress(frame, start + 8, 18, EASE.in);
  const dotIn = springAt(frame, fps, start + 12, SPRINGS.pop, 16);
  const color = interpolateColors(progress(frame, start, 8, EASE.out), [0, 1], [COLORS.tolopea, p.color]);
  const shapeScale = 1 - shrink;
  const transform = `translate(${pos.x} ${pos.y}) rotate(${p.rotation * t}) scale(${shapeScale}) translate(${-p.origin.x} ${-p.origin.y})`;
  return (
    <>
      {p.kind !== 'spark' && shapeScale > 0.01 ? (
        <g transform={transform}>
          <FragmentShape p={p} color={color} />
        </g>
      ) : null}
      {dotIn > 0 ? <circle cx={pos.x} cy={pos.y} r={p.radius * dotIn} fill={p.color} /> : null}
    </>
  );
};

const FragmentShape: React.FC<{p: Particle; color: string}> = ({p, color}) => {
  if (p.kind === 'stroke') {
    return (
      <g transform={placementTransform(ASSET_PLACEMENTS[p.asset])}>
        <StrokeReveal
          d={ASSETS[p.asset].stroke}
          guide={ASSET_GUIDES[p.asset]}
          start={p.window[0]}
          end={p.window[1]}
          fill={color}
        />
      </g>
    );
  }
  if (p.kind === 'flower') return <FlowerWedge wedge={p.wedge} placement={FLOWER_PLACEMENT} color={color} />;
  if (p.kind === 'dot') {
    return (
      <g transform={placementTransform(p.placement)}>
        <path d={p.d} fill={color} />
      </g>
    );
  }
  return null;
};

const FlowerWedge: React.FC<{wedge: Wedge; placement: Placement; color: string}> = ({wedge, placement, color}) => {
  const id = useSvgId('wedge');
  return (
    <g transform={placementTransform(placement)}>
      <clipPath id={id}>
        <polygon points={wedgePolygon(wedge)} />
      </clipPath>
      <path d={FLOWER_CROSS.parts.body} fill={color} clipPath={`url(#${id})`} />
    </g>
  );
};

/** Palabras con entrada por máscara desde abajo, una por una; salen hacia abajo antes de la ruptura. */
const Words: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const lineH = WORDS.fontSize * WORDS.lineHeight;
  const top = WORDS.centerY - (lineH * WORD_LIST.length) / 2;
  return (
    <>
      {WORD_LIST.map((word, i) => {
        const enter = springAt(frame, fps, T.words[i], SPRINGS.settle, 34);
        const exit = progress(frame, T.wordsOut + i * STAGGER, 14, EASE.in);
        const y = (1 - enter) * 115 + exit * 115;
        const numIn = springAt(frame, fps, T.words[i] + STAGGER, SPRINGS.settle, 30);
        const numY = (1 - numIn) * 130 + exit * 130;
        return (
          <div
            key={word}
            style={{
              position: 'absolute',
              left: WORDS.x,
              top: top + i * lineH,
              height: lineH,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
            }}
          >
            <div style={{overflow: 'hidden', marginTop: 16, height: 34}}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  fontSize: 26,
                  lineHeight: '34px',
                  color: COLORS.tolopea,
                  transform: `translateY(${numY}%)`,
                }}
              >
                {`0${i + 1}/`}
              </div>
            </div>
            <div style={{overflow: 'hidden', height: lineH}}>
              <div
                style={{
                  fontFamily: FONTS.title,
                  fontWeight: 600,
                  fontSize: WORDS.fontSize,
                  lineHeight: WORDS.lineHeight,
                  letterSpacing: '-0.02em',
                  color: COLORS.doveWhite,
                  transform: `translateY(${y}%)`,
                  whiteSpace: 'nowrap',
                }}
              >
                {word}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
