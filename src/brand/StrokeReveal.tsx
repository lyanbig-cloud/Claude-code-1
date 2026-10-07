import {useId} from 'react';
import {pathLength, pointAt} from '../lib/geometry';
import {clamp01} from '../lib/motion';
import type {Guide} from './guides';

const useSvgId = (prefix: string) => `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

type Props = {
  /** Forma rellena original del manual (no se modifica). */
  d: string;
  /** Path guía por el centro de la letra, usado sólo como máscara. */
  guide: Guide;
  /** Ventana visible del trazo, en fracción del largo de la guía (0..1). */
  start?: number;
  end: number;
  fill: string;
};

/**
 * Técnica del trazo: la forma real se enmascara con su path guía dibujado con stroke ancho.
 * Animando la ventana del dash (stroke-dasharray + stroke-dashoffset) la letra aparece en el
 * orden en que se escribiría, nunca como un wipe. Con la ventana completa se pinta la forma
 * tal cual, sin máscara, para que el resultado final sea exactamente el vector del manual.
 */
export const StrokeReveal: React.FC<Props> = ({d, guide, start = 0, end, fill}) => {
  const id = useSvgId('reveal');
  const a = clamp01(start);
  const b = clamp01(end);
  if (b <= a) return null;
  if (a <= 0 && b >= 1) return <path d={d} fill={fill} />;

  const len = pathLength(guide.d);
  const head = pointAt(guide.d, b);
  const width = a > 0 ? (guide.trimWidth ?? guide.maskWidth) : guide.maskWidth;
  return (
    <>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-5000} y={-5000} width={10000} height={10000}>
          <path
            d={guide.d}
            fill="none"
            stroke="#fff"
            strokeWidth={width}
            // Si la cola también avanza (des-escritura, fragmentos) se corta recta para no revelar
            // trozos del trazo que se cruza; la punta siempre es redonda (círculo de abajo).
            strokeLinecap={a > 0 ? 'butt' : 'round'}
            strokeLinejoin="round"
            strokeDasharray={`${(b - a) * len} ${len * 2}`}
            strokeDashoffset={-a * len}
          />
          {a > 0 ? <circle cx={head.x} cy={head.y} r={guide.maskWidth / 2} fill="#fff" /> : null}
        </mask>
      </defs>
      <path d={d} fill={fill} mask={`url(#${id})`} />
    </>
  );
};
