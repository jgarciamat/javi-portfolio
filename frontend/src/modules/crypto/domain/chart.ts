import type { Candle, CryptoInterval } from './types';

/** Candle sizes of the chart, as in the original console (5 minutes to one week). */
export const CHART_INTERVALS: CryptoInterval[] = ['5m', '15m', '30m', '1h', '4h', '1d', '1w'];
export const DEFAULT_INTERVAL: CryptoInterval = '1h';
/** Candles shown when a coin or size is opened (the rest is a scroll or a zoom away). */
export const RECENT_CANDLES = 70;

export interface CandleSummary {
  first: Candle;
  last: Candle;
  high: number;
  low: number;
  /** From the opening of the first candle to the close of the last (%). */
  changePercent: number;
}

/** What a stretch of candles did: for the text read out with the chart and the period change. */
export function summarize(
  candles: Candle[],
  from = 0,
  to = candles.length - 1
): CandleSummary | null {
  const start = Math.max(0, Math.ceil(from));
  const end = Math.min(candles.length - 1, Math.floor(to));
  if (end < start) return null;
  const part = candles.slice(start, end + 1);
  const first = part[0];
  const last = part[part.length - 1];
  return {
    first,
    last,
    high: Math.max(...part.map((c) => c.high)),
    low: Math.min(...part.map((c) => c.low)),
    changePercent: ((last.close - first.open) / first.open) * 100,
  };
}

/**
 * An empty candle: nobody traded during it (no volume, or one price for open, high, low and
 * close). The chart never fills them in; with many on screen it suggests a larger size.
 */
export const isFlat = (c: Candle): boolean =>
  c.volume === 0 || (c.open === c.high && c.high === c.low && c.low === c.close);

/** Above this share of empty candles on screen the chart shows the «little volume» note. */
export const THIN_SHARE = 0.3;
/** Fewer candles than this on screen say too little to judge. */
export const THIN_MIN_CANDLES = 10;

/** Share (0-1) of empty candles between two indexes; null with too few candles to judge. */
export function flatShare(candles: Candle[], from = 0, to = candles.length - 1): number | null {
  const part = candles.slice(Math.max(0, Math.ceil(from)), Math.max(0, Math.floor(to) + 1));
  if (part.length < THIN_MIN_CANDLES) return null;
  return part.filter(isFlat).length / part.length;
}

/** Up to two larger sizes of at least one hour to suggest when there is little volume. */
export function largerSizes(interval: CryptoInterval): CryptoInterval[] {
  const at = CHART_INTERVALS.indexOf(interval);
  return CHART_INTERVALS.slice(at + 1)
    .filter((i) => INTERVAL_MS[i] >= INTERVAL_MS['1h'])
    .slice(0, 2);
}

const MINUTE = 60_000;
export const INTERVAL_MS: Record<CryptoInterval, number> = {
  '1m': MINUTE,
  '5m': 5 * MINUTE,
  '15m': 15 * MINUTE,
  '30m': 30 * MINUTE,
  '1h': 60 * MINUTE,
  '4h': 240 * MINUTE,
  '1d': 1440 * MINUTE,
  '1w': 10_080 * MINUTE,
};

/** Time left until the candle that opened at `opened` closes (never below zero). */
export function untilClose(opened: number, interval: CryptoInterval, now: number): number {
  return Math.max(0, opened + INTERVAL_MS[interval] - now);
}

/** «04:59», «3 h 05 min» or «2 d 04 h»: a countdown that reads well at every size. */
export function formatCountdown(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days} d ${pad(hours)} h`;
  if (hours) return `${hours} h ${pad(minutes)} min`;
  return `${pad(minutes)}:${pad(seconds % 60)}`;
}
