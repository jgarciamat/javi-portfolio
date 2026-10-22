/**
 * Visual layers of the crypto chart, calculated from the candles already loaded. They are reading
 * aids for learning, nothing more: they never say when to buy or sell and predict nothing.
 * Pure functions, so they can be tested with made-up candles.
 */
import type { Candle } from './types';

export const LAYERS = [
  'ema20',
  'ema50',
  'ema200',
  'bollinger',
  'vwap',
  'profile',
  'levels',
  'fibonacci',
] as const;
export type LayerId = (typeof LAYERS)[number];

/** One colour per layer, the same in the buttons, the legend and the chart. */
export const LAYER_COLORS: Record<LayerId, string> = {
  ema20: '#f59e0b',
  ema50: '#3b82f6',
  ema200: '#d946ef',
  bollinger: '#14b8a6',
  vwap: '#ec4899',
  profile: '#eab308',
  levels: '#0ea5e9',
  fibonacci: '#8b5cf6',
};

export const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** Exponential moving average: starts with the simple average of the first `period` values. */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = current;
  for (let i = period; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
    out[i] = current;
  }
  return out;
}

export interface Bands {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/** Bollinger bands: simple average of `period` closes ± `width` standard deviations. */
export function bollinger(closes: number[], period = 20, width = 2): Bands {
  const bands: Bands = { middle: [], upper: [], lower: [] };
  closes.forEach((_, i) => {
    if (i < period - 1) {
      bands.middle.push(null);
      bands.upper.push(null);
      bands.lower.push(null);
      return;
    }
    const part = closes.slice(i - period + 1, i + 1);
    const mean = part.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(part.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    bands.middle.push(mean);
    bands.upper.push(mean + width * sd);
    bands.lower.push(mean - width * sd);
  });
  return bands;
}

const typical = (c: Candle) => (c.high + c.low + c.close) / 3;

/** Average price weighted by volume since the first loaded candle (VWAP). */
export function vwap(candles: Candle[]): number[] {
  let money = 0;
  let volume = 0;
  return candles.map((c) => {
    money += typical(c) * c.volume;
    volume += c.volume;
    return volume > 0 ? money / volume : typical(c);
  });
}

export interface VolumeProfile {
  /** Price with the most volume (point of control). */
  poc: number;
  /** Top and bottom of the zone with 70 % of the volume (value area). */
  vah: number;
  val: number;
}

/**
 * Where the volume was traded: the candles' volume spread over `bins` price bands between the
 * lowest low and the highest high. The value area grows from the busiest band towards the busier
 * neighbour until it holds `area` of the volume.
 */
export function volumeProfile(candles: Candle[], bins = 24, area = 0.7): VolumeProfile | null {
  if (!candles.length) return null;
  const low = Math.min(...candles.map((c) => c.low));
  const high = Math.max(...candles.map((c) => c.high));
  if (high === low) return { poc: low, vah: low, val: low };
  const size = (high - low) / bins;
  const volume = new Array<number>(bins).fill(0);
  const band = (price: number) => Math.min(bins - 1, Math.floor((price - low) / size));
  for (const c of candles) {
    const from = band(c.low);
    const to = band(c.high);
    for (let b = from; b <= to; b++) volume[b] += c.volume / (to - from + 1);
  }
  const poc = volume.indexOf(Math.max(...volume));
  const { bottom, top } = valueArea(volume, poc, area);
  return { poc: low + (poc + 0.5) * size, vah: low + (top + 1) * size, val: low + bottom * size };
}

/** Bands around `poc` holding `area` of the volume, growing towards the busier neighbour. */
function valueArea(volume: number[], poc: number, area: number) {
  const total = volume.reduce((a, b) => a + b, 0);
  const last = volume.length - 1;
  let bottom = poc;
  let top = poc;
  let inside = volume[poc];
  while (inside < total * area && (bottom > 0 || top < last)) {
    const below = bottom > 0 ? volume[bottom - 1] : -1;
    const above = top < last ? volume[top + 1] : -1;
    if (above >= below) inside += volume[++top];
    else inside += volume[--bottom];
  }
  return { bottom, top };
}

export interface Level {
  price: number;
  kind: 'support' | 'resistance';
  /** How many turning points are close to this price. */
  touches: number;
}

/**
 * Supports and resistances from turning points: a high (or low) higher (or lower) than the
 * `window` candles on each side. Close points (within `tolerance`, a share of the price) count as
 * one level. Up to `max` of each, the nearest to the last close first.
 */
export function supportResistance(
  candles: Candle[],
  window = 3,
  max = 3,
  tolerance = 0.005
): Level[] {
  if (candles.length < window * 2 + 1) return [];
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = window; i < candles.length - window; i++) {
    const around = candles.slice(i - window, i + window + 1);
    if (around.every((c, j) => j === window || c.high < candles[i].high))
      highs.push(candles[i].high);
    if (around.every((c, j) => j === window || c.low > candles[i].low)) lows.push(candles[i].low);
  }
  const last = candles[candles.length - 1].close;
  const cluster = (prices: number[], kind: Level['kind']): Level[] => {
    const groups: { sum: number; count: number }[] = [];
    for (const price of [...prices].sort((a, b) => a - b)) {
      const group = groups[groups.length - 1];
      if (group && Math.abs(price - group.sum / group.count) <= price * tolerance) {
        group.sum += price;
        group.count += 1;
      } else groups.push({ sum: price, count: 1 });
    }
    return groups
      .map((g) => ({ price: g.sum / g.count, kind, touches: g.count }))
      .filter((l) => (kind === 'support' ? l.price < last : l.price > last))
      .sort((a, b) => Math.abs(a.price - last) - Math.abs(b.price - last))
      .slice(0, max);
  };
  return [...cluster(lows, 'support'), ...cluster(highs, 'resistance')];
}

export interface Fibonacci {
  /** `up`: the last stretch went from the low to the high (levels measured down from the high). */
  direction: 'up' | 'down';
  high: number;
  low: number;
  levels: { ratio: number; price: number }[];
}

/** Fibonacci retracements of the last high-low stretch among the candles `from`..`to`. */
export function fibonacci(candles: Candle[], from = 0, to = candles.length - 1): Fibonacci | null {
  const start = Math.max(0, Math.ceil(from));
  const part = candles.slice(start, Math.min(candles.length - 1, Math.floor(to)) + 1);
  if (part.length < 2) return null;
  const highAt = part.reduce((best, c, i) => (c.high > part[best].high ? i : best), 0);
  const lowAt = part.reduce((best, c, i) => (c.low < part[best].low ? i : best), 0);
  const high = part[highAt].high;
  const low = part[lowAt].low;
  if (high === low) return null;
  const direction = highAt >= lowAt ? 'up' : 'down';
  return {
    direction,
    high,
    low,
    levels: FIB_RATIOS.map((ratio) => ({
      ratio,
      price: direction === 'up' ? high - (high - low) * ratio : low + (high - low) * ratio,
    })),
  };
}

/** Last value of a series that has one (for the legend). */
export const lastValue = (series: (number | null)[]): number | null =>
  [...series].reverse().find((v): v is number => v !== null) ?? null;
