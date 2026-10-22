import type { Candle, CryptoInterval } from './types';

/** Candle sizes of the chart, as in the original console (5 minutes to one week). */
export const CHART_INTERVALS: CryptoInterval[] = ['5m', '15m', '30m', '1h', '4h', '1d', '1w'];
export const DEFAULT_INTERVAL: CryptoInterval = '1h';
/** Candles shown when a coin or size is opened (the rest is a scroll or a zoom away). */
export const RECENT_CANDLES = 90;

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
