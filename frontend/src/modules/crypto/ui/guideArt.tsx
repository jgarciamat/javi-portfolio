/**
 * Drawings of the guide («Learn before playing»): candles, lines and levels drawn with the
 * theme's colours. They are decorative (the text next to them says the same), so screen readers
 * skip them.
 */
import type { ReactElement, ReactNode } from 'react';

type Ohlc = [open: number, high: number, low: number, close: number];

const W = 160;
const H = 90;

/** Candles on a 0-100 price scale, spread over the width. */
function Candles({ data, x0 = 10, width = W - 20 }: { data: Ohlc[]; x0?: number; width?: number }) {
  const step = width / data.length;
  const y = (v: number) => H - 8 - (v / 100) * (H - 16);
  return (
    <>
      {data.map(([o, h, l, c], i) => {
        const x = x0 + step * i + step / 2;
        const up = c >= o;
        return (
          <g key={i} className={up ? 'cc-art-up' : 'cc-art-down'}>
            <line x1={x} x2={x} y1={y(h)} y2={y(l)} strokeWidth="1.5" />
            <rect
              x={x - step * 0.3}
              width={step * 0.6}
              y={y(Math.max(o, c))}
              height={Math.max(1.5, Math.abs(y(o) - y(c)))}
              rx="1"
            />
          </g>
        );
      })}
    </>
  );
}

/** A line through points given as [x 0-100, price 0-100]. */
function Line({
  points,
  className,
  dashed,
}: {
  points: number[][];
  className: string;
  dashed?: boolean;
}) {
  const d = points
    .map(([x, v]) => `${10 + (x / 100) * (W - 20)},${H - 8 - (v / 100) * (H - 16)}`)
    .join(' ');
  return (
    <polyline
      points={d}
      className={className}
      fill="none"
      strokeWidth="2.5"
      strokeDasharray={dashed ? '5 4' : undefined}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/**
 * A dashed level with its name above the line, or (`side`) at its right end, for levels too close
 * together to have their names above.
 */
function Level({
  v,
  className,
  label,
  side,
}: {
  v: number;
  className: string;
  label?: string;
  side?: boolean;
}) {
  const y = H - 8 - (v / 100) * (H - 16);
  return (
    <g className={className}>
      <line
        x1="6"
        x2={side ? W - 36 : W - 6}
        y1={y}
        y2={y}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {label && (
        <text
          x={W - 4}
          y={side ? y + 2.5 : y - 3}
          textAnchor="end"
          className={side ? 'cc-art-label cc-art-label--side' : 'cc-art-label'}
        >
          {label}
        </text>
      )}
    </g>
  );
}

const Frame = ({ children }: { children: ReactNode }) => (
  <svg className="cc-art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const WAVE: Ohlc[] = [
  [40, 48, 35, 46],
  [46, 55, 44, 52],
  [52, 58, 45, 47],
  [47, 50, 38, 40],
  [40, 52, 39, 50],
  [50, 64, 49, 62],
  [62, 70, 58, 60],
  [60, 72, 57, 70],
];

/** One candle with its four prices named. */
export function CandleArt({ labels }: { labels: [string, string, string, string] }) {
  return (
    <Frame>
      <Candles data={[[30, 85, 15, 70]]} x0={20} width={40} />
      <g className="cc-art-label">
        <text x="70" y="17">
          {labels[0]}
        </text>
        <text x="70" y="36">
          {labels[1]}
        </text>
        <text x="70" y="58">
          {labels[2]}
        </text>
        <text x="70" y="82">
          {labels[3]}
        </text>
      </g>
    </Frame>
  );
}

export function VolumeArt() {
  const bars = [30, 45, 25, 60, 35, 80, 50, 40];
  return (
    <Frame>
      <Candles data={WAVE} />
      <g className="cc-art-muted">
        {bars.map((b, i) => (
          <rect key={i} x={14 + i * 17.5} width="10" y={H - 4 - b / 5} height={b / 5} />
        ))}
      </g>
    </Frame>
  );
}

export function IntervalsArt() {
  return (
    <Frame>
      <Candles data={WAVE} width={70} />
      <Candles
        data={[
          [40, 58, 35, 47],
          [47, 72, 38, 70],
        ]}
        x0={95}
        width={50}
      />
    </Frame>
  );
}

export function EmaArt() {
  return (
    <Frame>
      <Candles data={WAVE} />
      <Line
        points={[
          [0, 42],
          [30, 48],
          [55, 46],
          [80, 55],
          [100, 64],
        ]}
        className="cc-art-ema"
      />
    </Frame>
  );
}

export function BollingerArt() {
  return (
    <Frame>
      <Line
        points={[
          [0, 62],
          [30, 66],
          [60, 70],
          [100, 86],
        ]}
        className="cc-art-band"
        dashed
      />
      <Line
        points={[
          [0, 45],
          [30, 48],
          [60, 50],
          [100, 64],
        ]}
        className="cc-art-band"
      />
      <Line
        points={[
          [0, 28],
          [30, 30],
          [60, 30],
          [100, 42],
        ]}
        className="cc-art-band"
        dashed
      />
      <Line
        points={[
          [0, 44],
          [15, 55],
          [30, 40],
          [45, 52],
          [60, 48],
          [75, 72],
          [100, 70],
        ]}
        className="cc-art-price"
      />
    </Frame>
  );
}

export function VwapArt() {
  return (
    <Frame>
      <Candles data={WAVE} />
      <Line
        points={[
          [0, 44],
          [40, 48],
          [70, 52],
          [100, 56],
        ]}
        className="cc-art-vwap"
      />
    </Frame>
  );
}

export function ProfileArt({ labels }: { labels: [string, string, string] }) {
  const bars = [8, 14, 22, 34, 48, 40, 26, 16, 10, 6];
  return (
    <Frame>
      <g className="cc-art-profile">
        {bars.map((b, i) => (
          <rect key={i} x={W - 8 - b * 1.6} width={b * 1.6} y={8 + i * 7.6} height="6" rx="1" />
        ))}
      </g>
      <Level v={66} className="cc-art-level" label={labels[0]} />
      <Level v={50} className="cc-art-poc" label={labels[1]} />
      <Level v={34} className="cc-art-level" label={labels[2]} />
    </Frame>
  );
}

export function LevelsArt({ labels }: { labels: [string, string] }) {
  return (
    <Frame>
      <Level v={78} className="cc-art-resistance" label={labels[0]} />
      <Level v={22} className="cc-art-support" label={labels[1]} />
      <Line
        points={[
          [0, 40],
          [15, 76],
          [30, 30],
          [45, 24],
          [60, 70],
          [75, 78],
          [90, 35],
          [100, 50],
        ]}
        className="cc-art-price"
      />
    </Frame>
  );
}

/** The seven Fibonacci levels, `labels` from 0 % to 100 %. */
export function FibonacciArt({ labels }: { labels: string[] }) {
  const heights = [88, 69, 57, 48, 39, 26, 8];
  return (
    <Frame>
      {heights.map((v, i) => (
        <Level key={v} v={v} className="cc-art-fib" label={labels[i]} side />
      ))}
      <Line
        points={[
          [0, 8],
          [35, 88],
          [60, 50],
        ]}
        className="cc-art-price"
      />
    </Frame>
  );
}

/** Drawings of the patterns, by name. */
export const PATTERN_ART: Record<string, () => ReactElement> = {
  doji: () => (
    <Frame>
      <Candles data={[[50, 75, 25, 50.5]]} x0={60} width={40} />
    </Frame>
  ),
  hammer: () => (
    <Frame>
      <Candles
        data={[
          [70, 82, 72, 66],
          [64, 66, 52, 54],
          [52, 56, 15, 56],
        ]}
        x0={30}
        width={100}
      />
    </Frame>
  ),
  shootingStar: () => (
    <Frame>
      <Candles
        data={[
          [30, 42, 28, 40],
          [40, 54, 38, 52],
          [52, 88, 50, 48],
        ]}
        x0={30}
        width={100}
      />
    </Frame>
  ),
  bullishEngulfing: () => (
    <Frame>
      <Candles
        data={[
          [60, 62, 48, 50],
          [46, 72, 44, 70],
        ]}
        x0={45}
        width={70}
      />
    </Frame>
  ),
  bearishEngulfing: () => (
    <Frame>
      <Candles
        data={[
          [40, 52, 38, 50],
          [54, 56, 28, 30],
        ]}
        x0={45}
        width={70}
      />
    </Frame>
  ),
  doubleTop: () => (
    <Frame>
      <Level v={80} className="cc-art-resistance" />
      <Line
        points={[
          [0, 20],
          [25, 80],
          [45, 50],
          [65, 80],
          [100, 25],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  doubleBottom: () => (
    <Frame>
      <Level v={20} className="cc-art-support" />
      <Line
        points={[
          [0, 80],
          [25, 20],
          [45, 50],
          [65, 20],
          [100, 75],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  headShoulders: () => (
    <Frame>
      <Level v={40} className="cc-art-level" />
      <Line
        points={[
          [0, 20],
          [15, 62],
          [28, 40],
          [45, 85],
          [62, 40],
          [75, 62],
          [88, 40],
          [100, 18],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  triangle: () => (
    <Frame>
      <Line
        points={[
          [0, 85],
          [90, 52],
        ]}
        className="cc-art-level"
        dashed
      />
      <Line
        points={[
          [0, 15],
          [90, 48],
        ]}
        className="cc-art-level"
        dashed
      />
      <Line
        points={[
          [0, 80],
          [15, 22],
          [32, 74],
          [48, 32],
          [64, 64],
          [78, 42],
          [90, 52],
          [100, 70],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  flag: () => (
    <Frame>
      <Line
        points={[
          [0, 10],
          [30, 75],
        ]}
        className="cc-art-price"
      />
      <Line
        points={[
          [30, 75],
          [42, 66],
          [50, 72],
          [62, 62],
          [70, 68],
          [82, 58],
          [100, 90],
        ]}
        className="cc-art-price"
      />
      <Line
        points={[
          [30, 78],
          [82, 64],
        ]}
        className="cc-art-level"
        dashed
      />
      <Line
        points={[
          [30, 62],
          [82, 52],
        ]}
        className="cc-art-level"
        dashed
      />
    </Frame>
  ),
  wedge: () => (
    <Frame>
      <Line
        points={[
          [0, 40],
          [90, 82],
        ]}
        className="cc-art-level"
        dashed
      />
      <Line
        points={[
          [0, 10],
          [90, 72],
        ]}
        className="cc-art-level"
        dashed
      />
      <Line
        points={[
          [0, 15],
          [20, 50],
          [35, 35],
          [55, 68],
          [70, 58],
          [88, 80],
          [100, 45],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  range: () => (
    <Frame>
      <Level v={75} className="cc-art-resistance" />
      <Level v={30} className="cc-art-support" />
      <Line
        points={[
          [0, 50],
          [15, 74],
          [32, 31],
          [50, 73],
          [68, 32],
          [85, 72],
          [100, 50],
        ]}
        className="cc-art-price"
      />
    </Frame>
  ),
  maCross: () => (
    <Frame>
      <Line
        points={[
          [0, 70],
          [40, 50],
          [70, 40],
          [100, 45],
        ]}
        className="cc-art-ema-slow"
      />
      <Line
        points={[
          [0, 40],
          [40, 42],
          [70, 60],
          [100, 78],
        ]}
        className="cc-art-ema"
      />
    </Frame>
  ),
};

/** Bulls push the price up with their horns; bears pull it down with their paws. */
export function BullsBearsArt({ labels }: { labels: [string, string] }) {
  return (
    <Frame>
      <g className="cc-art-up" strokeWidth="2.5" fill="none">
        <path d="M14 40 q6 -14 16 -6 M46 40 q-6 -14 -16 -6" />
        <ellipse cx="30" cy="48" rx="12" ry="9" />
      </g>
      <g className="cc-art-down" strokeWidth="2.5" fill="none">
        <circle cx="106" cy="38" r="4" />
        <circle cx="126" cy="38" r="4" />
        <ellipse cx="116" cy="50" rx="13" ry="10" />
      </g>
      <Line
        points={[
          [0, 10],
          [22, 35],
          [35, 30],
          [45, 55],
        ]}
        className="cc-art-up"
      />
      <Line
        points={[
          [55, 55],
          [70, 40],
          [82, 45],
          [100, 10],
        ]}
        className="cc-art-down"
      />
      <g className="cc-art-label">
        <text x="12" y="86">
          {labels[0]}
        </text>
        <text x="100" y="86">
          {labels[1]}
        </text>
      </g>
    </Frame>
  );
}

/** Long gains when the price rises; short gains when it falls. */
export function LongShortArt({ labels }: { labels: [string, string] }) {
  return (
    <Frame>
      <Level v={50} className="cc-art-level" />
      <Line
        points={[
          [0, 50],
          [45, 85],
        ]}
        className="cc-art-up"
      />
      <Line
        points={[
          [55, 50],
          [100, 15],
        ]}
        className="cc-art-down"
      />
      <g className="cc-art-label">
        <text x="12" y="20">
          {labels[0]}
        </text>
        <text x="96" y="20">
          {labels[1]}
        </text>
      </g>
    </Frame>
  );
}

/** Where the market, limit and stop orders sit around the price. */
export function OrdersArt({ labels }: { labels: [string, string, string] }) {
  return (
    <Frame>
      <Line
        points={[
          [0, 45],
          [20, 55],
          [40, 48],
          [60, 52],
        ]}
        className="cc-art-price"
      />
      <Level v={80} className="cc-art-resistance" label={labels[2]} />
      <Level v={52} className="cc-art-level" label={labels[0]} />
      <Level v={22} className="cc-art-support" label={labels[1]} />
    </Frame>
  );
}

/** Take profit and stop loss around the entry, for a long and for a short. */
export function ExitsArt({ labels }: { labels: [string, string, string] }) {
  return (
    <Frame>
      <Level v={82} className="cc-art-support" label={labels[1]} />
      <Level v={50} className="cc-art-level" label={labels[0]} />
      <Level v={20} className="cc-art-resistance" label={labels[2]} />
      <Line
        points={[
          [0, 50],
          [25, 60],
          [45, 52],
          [70, 72],
          [90, 82],
        ]}
        className="cc-art-price"
      />
    </Frame>
  );
}

/** With leverage the same move of the price makes a much bigger result, both ways. */
export function LeverageArt({ labels }: { labels: [string, string] }) {
  return (
    <Frame>
      <g className="cc-art-muted">
        <rect x="30" y="38" width="22" height="14" rx="2" />
      </g>
      <g className="cc-art-down">
        <rect x="95" y="20" width="22" height="50" rx="2" />
      </g>
      <g className="cc-art-label">
        <text x="20" y="86">
          {labels[0]}
        </text>
        <text x="88" y="86">
          {labels[1]}
        </text>
      </g>
    </Frame>
  );
}
