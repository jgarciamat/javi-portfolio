/**
 * Drawings on the chart (trend lines, horizontal lines, zones and notes), kept per coin on the
 * server (backend/src/domain/services/crypto-drawings.ts has the same limits). Every point is
 * anchored to data, never to the screen: a time (ms, UTC) and a price in euros, the currency all
 * prices of the console come in. Dollars are only a display conversion with the rate of the day,
 * the same one the candles go through, so a drawing sits on the same candles in both currencies
 * and stays in place when the chart is zoomed, moved or shown with other candle sizes.
 */
import type { Candle } from './types';

export const DRAWINGS_MAX = 50;
export const DRAWING_TEXT_MAX = 60;
const TIME_MIN = Date.UTC(2009, 0, 1);
const TIME_MAX = Date.UTC(2100, 0, 1);
/** Prices below this (a zone dragged under zero) are kept just above it. */
const PRICE_MIN = 1e-12;

export type DrawingKind = 'trend' | 'horizontal' | 'rect' | 'text';
export type DrawingColor = 'yellow' | 'cyan' | 'pink' | 'orange' | 'white';
export type DrawTool = DrawingKind | 'eraser';

export const DRAW_TOOLS: DrawTool[] = ['trend', 'horizontal', 'rect', 'text', 'eraser'];
export const DRAWING_COLORS: DrawingColor[] = ['yellow', 'cyan', 'pink', 'orange', 'white'];

/**
 * Tones of the palette (CSS variables of Drawings.css, one set per theme): far from the green and
 * red of the candles, and each with a contrast of at least 4.5:1 on the chart's background in
 * the light and the dark theme. «white» is the neutral one: white on dark, near black on light.
 */
export const COLOR_TONES: Record<DrawingColor, string> = {
  yellow: 'var(--cc-draw-yellow)',
  cyan: 'var(--cc-draw-cyan)',
  pink: 'var(--cc-draw-pink)',
  orange: 'var(--cc-draw-orange)',
  white: 'var(--cc-draw-white)',
};

/**
 * Thickness of the stroke of lines and zones, in screen pixels (the zoom never changes it): fine,
 * normal, thick and very thick. Notes have none; a drawing saved before there was a choice has
 * none either and is drawn with the normal one.
 */
export type DrawingWidth = 1 | 2 | 4 | 6;
export const DRAWING_WIDTHS: DrawingWidth[] = [1, 2, 4, 6];
export const DEFAULT_WIDTH: DrawingWidth = 2;

/** The stroke of a drawing (the normal one when it has none). */
export const widthOf = (drawing: Pick<Drawing, 'width'>): DrawingWidth =>
  drawing.width ?? DEFAULT_WIDTH;

/** A thickness kept on this device, if it is one of those offered. */
export const savedWidth = (value: string | null): DrawingWidth =>
  DRAWING_WIDTHS.find((w) => String(w) === value) ?? DEFAULT_WIDTH;

export interface DrawingPoint {
  /** Milliseconds since 1970, UTC. */
  time: number;
  /** Euros. */
  price: number;
}

export interface Drawing {
  id: string;
  kind: DrawingKind;
  color: DrawingColor;
  points: DrawingPoint[];
  /** Only on notes. */
  text?: string;
  /** Px of the stroke, on lines and zones (absent: DEFAULT_WIDTH). */
  width?: DrawingWidth;
}

/** The answer of the API for a coin. */
export interface CryptoDrawings {
  symbol: string;
  drawings: Drawing[];
  max: number;
  updatedAt: string | null;
}

/** Trend lines and zones take two points; horizontal lines and notes one. */
export const twoPoints = (kind: DrawingKind): boolean => kind === 'trend' || kind === 'rect';

/** A short id, unique enough for the drawings of one coin (letters and figures only). */
export const newDrawingId = (): string =>
  `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A point the server accepts: a whole millisecond in range and a price above zero. */
export const anchor = (time: number, price: number): DrawingPoint => ({
  time: Math.min(TIME_MAX, Math.max(TIME_MIN, Math.round(time))),
  price: Math.max(PRICE_MIN, price),
});

/** Milliseconds between candles: the last two, or a minute when there are not two. */
const step = (candles: Candle[]): number => {
  const n = candles.length;
  return n > 1 ? candles[n - 1].time - candles[n - 2].time : 60_000;
};

/**
 * Where a time falls among the candles, as the chart's logical index (0 is the first candle,
 * fractions in between): the anchor survives candle sizes, gaps and times beyond the data.
 */
export function timeToLogical(candles: Candle[], time: number): number | null {
  const n = candles.length;
  if (!n) return null;
  const first = candles[0].time;
  const last = candles[n - 1].time;
  if (time <= first) return (time - first) / step(candles);
  if (time >= last) return n - 1 + (time - last) / step(candles);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].time <= time) lo = mid;
    else hi = mid;
  }
  return lo + (time - candles[lo].time) / (candles[hi].time - candles[lo].time);
}

/** The time of a logical index of the chart (the inverse of timeToLogical). */
export function logicalToTime(candles: Candle[], logical: number): number | null {
  const n = candles.length;
  if (!n) return null;
  if (logical <= 0) return candles[0].time + logical * step(candles);
  if (logical >= n - 1) return candles[n - 1].time + (logical - (n - 1)) * step(candles);
  const i = Math.floor(logical);
  return candles[i].time + (logical - i) * (candles[i + 1].time - candles[i].time);
}

/** Candles back from the last one that a drawing placed with the keyboard covers. */
const KEYBOARD_SPAN = 10;

/**
 * Points of a drawing placed with the keyboard (Enter): on the last candle, and for a line or a
 * zone over the last few. Prices of the candles in the display currency, given back in euros.
 */
export function keyboardPoints(
  kind: DrawingKind,
  candles: Candle[],
  rate: number
): DrawingPoint[] | null {
  const n = candles.length;
  if (!n) return null;
  const last = candles[n - 1];
  const from = candles[Math.max(0, n - 1 - KEYBOARD_SPAN)];
  const euros = (shown: number) => shown / rate;
  if (kind === 'trend') {
    return [anchor(from.time, euros(from.close)), anchor(last.time, euros(last.close))];
  }
  if (kind === 'rect') {
    const part = candles.slice(-KEYBOARD_SPAN - 1);
    return [
      anchor(from.time, euros(Math.max(...part.map((c) => c.high)))),
      anchor(last.time, euros(Math.min(...part.map((c) => c.low)))),
    ];
  }
  return [anchor(last.time, euros(last.close))];
}
