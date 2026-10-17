import { useId } from 'react';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';

export type Point = [number, number];

/**
 * Line patterns, so series stay apart without relying on the hue alone (WCAG 1.4.1). The
 * colours are theme tokens (`var(--green-400)`…): set through `style`, since SVG presentation
 * attributes do not resolve CSS variables.
 */
export const DASHES = {
  dashed: '5 4',
  dotted: '0.1 4.5',
  dashDot: '8 4 0.1 4',
};

export type Dash = keyof typeof DASHES;

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: Point[];
  dash?: Dash;
}

export interface ChartBand {
  id: string;
  color: string;
  lower: Point[];
  upper: Point[];
}

export interface ChartLine {
  y: number;
  label: string;
  color: string;
}

interface Props {
  title: string;
  description: string;
  series: ChartSeries[];
  bands?: ChartBand[];
  lines?: ChartLine[];
  /** Plot the vertical axis on a logarithmic scale (for series that diverge a lot). */
  logY?: boolean;
  xFormat: (x: number) => string;
  yFormat: (y: number) => string;
  xTicks: number[];
  yTicks: number[];
}

/** Phones get a narrower drawing so the text stays readable once it is scaled down. */
const SIZES = {
  wide: { W: 640, H: 300, M: { top: 14, right: 16, bottom: 30, left: 56 } },
  compact: { W: 340, H: 270, M: { top: 12, right: 10, bottom: 28, left: 46 } },
};

const path = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/** A small dependency-free SVG chart: lines, shaded bands and reference lines. */
export function LineChart({
  title,
  description,
  series,
  bands = [],
  lines = [],
  logY = false,
  xFormat,
  yFormat,
  xTicks,
  yTicks,
}: Props) {
  const uid = useId();
  const compact = useMediaQuery('(max-width: 600px)');
  const { W, H, M } = compact ? SIZES.compact : SIZES.wide;
  const tx = logY ? Math.log : (v: number) => v;
  const allPoints = [
    ...series.flatMap((s) => s.points),
    ...bands.flatMap((b) => [...b.lower, ...b.upper]),
  ];
  const xs = allPoints.map((p) => p[0]);
  const ysAll = [...allPoints.map((p) => p[1]), ...yTicks];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = tx(Math.min(...ysAll));
  const yMax = tx(Math.max(...ysAll));
  const sx = (x: number) => M.left + ((x - xMin) / (xMax - xMin)) * (W - M.left - M.right);
  const sy = (y: number) =>
    H - M.bottom - ((tx(y) - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
  const map = (pts: Point[]) => pts.map(([x, y]) => ({ x: sx(x), y: sy(y) }));

  return (
    <figure className="inv-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${uid}-t ${uid}-d`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={`${uid}-t`}>{title}</title>
        <desc id={`${uid}-d`}>{description}</desc>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line className="inv-grid" x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} />
            <text className="inv-tick" x={M.left - 6} y={sy(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} className="inv-tick" x={sx(t)} y={H - 10} textAnchor="middle">
            {xFormat(t)}
          </text>
        ))}
        {bands.map((b) => (
          <path
            key={b.id}
            d={`${path(map(b.upper))} ${path(map([...b.lower].reverse())).replace('M', 'L')} Z`}
            style={{ fill: b.color }}
            opacity={0.18}
          />
        ))}
        {lines.map((l) => (
          <g key={l.label}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={sy(l.y)}
              y2={sy(l.y)}
              style={{ stroke: l.color }}
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text
              className="inv-tick"
              x={W - M.right - 4}
              y={sy(l.y) - 5}
              textAnchor="end"
              style={{ fill: l.color }}
            >
              {l.label}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <path
            key={s.id}
            data-series={s.id}
            d={path(map(s.points))}
            fill="none"
            style={{ stroke: s.color }}
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dash && DASHES[s.dash]}
          />
        ))}
      </svg>
      <figcaption>
        <ul className="inv-legend">
          {series.map((s) => (
            <li key={s.id}>
              <svg className="inv-legend-line" viewBox="0 0 22 6" aria-hidden="true">
                <line
                  x1="2"
                  x2="20"
                  y1="3"
                  y2="3"
                  style={{ stroke: s.color }}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray={s.dash && DASHES[s.dash]}
                />
              </svg>
              {s.label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
