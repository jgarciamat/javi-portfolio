/**
 * Drawings of the crypto console's chart (trend lines, horizontal lines, zones and notes), kept
 * per person and coin so they follow the person to any device. Each point is anchored to data,
 * never to the screen: a time (ms, UTC) and a price in euros, the currency every price of the
 * console comes in (dollars are only a conversion for display, so a drawing sits on the same
 * candles in both). A reading aid with no effect on the simulator.
 */

/** Drawings per coin: enough for a careful analysis, small enough to stay light. */
export const DRAWINGS_MAX = 50;
/** Characters of a note on the chart. */
export const DRAWING_TEXT_MAX = 60;
/** Characters of a drawing's id (made by the app). */
export const DRAWING_ID_MAX = 40;
/** Earliest and latest times a point can have: before Bitcoin and far in the future. */
export const DRAWING_TIME_MIN = Date.UTC(2009, 0, 1);
export const DRAWING_TIME_MAX = Date.UTC(2100, 0, 1);

export const DRAWING_KINDS = ['trend', 'horizontal', 'rect', 'text'] as const;
export type DrawingKind = (typeof DRAWING_KINDS)[number];

/** Colours of the small palette (names, never free CSS): the app picks the tone of each one. */
export const DRAWING_COLORS = ['yellow', 'cyan', 'pink', 'orange', 'white'] as const;
export type DrawingColor = (typeof DRAWING_COLORS)[number];

/**
 * Thickness of the stroke of lines and zones, in screen pixels (it does not grow with the zoom):
 * fine, normal, thick and very thick. Notes have none; a drawing saved before there was a choice
 * has none either and is drawn with the normal one.
 */
export const DRAWING_WIDTHS = [1, 2, 4, 6] as const;
export type DrawingWidth = (typeof DRAWING_WIDTHS)[number];
export const DRAWING_WIDTH_DEFAULT: DrawingWidth = 2;

/** Two points for a trend line or a zone; one for a horizontal line or a note. */
export const DRAWING_POINTS: Record<DrawingKind, number> = {
  trend: 2,
  rect: 2,
  horizontal: 1,
  text: 1,
};

export interface DrawingPoint {
  /** Milliseconds since 1970, UTC. */
  time: number;
  /** Euros. */
  price: number;
}

export interface CryptoDrawing {
  id: string;
  kind: DrawingKind;
  color: DrawingColor;
  points: DrawingPoint[];
  /** Only on notes. */
  text?: string;
  /** Px of the stroke (lines and zones; absent: DRAWING_WIDTH_DEFAULT). */
  width?: DrawingWidth;
}
