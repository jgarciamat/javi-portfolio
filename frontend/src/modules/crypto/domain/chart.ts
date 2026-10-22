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
