/** Sections of the guide «Learn before playing», in reading order. */
export const GUIDE_SECTIONS = [
  'candles',
  'intervals',
  'directions',
  'orders',
  'exits',
  'leverage',
  'ema',
  'bollinger',
  'vwap',
  'profile',
  'levels',
  'fibonacci',
  'patterns',
  'glossary',
  'plans',
] as const;
export type GuideSection = (typeof GUIDE_SECTIONS)[number];

/**
 * Tabs of the panel «Learn before playing», in reading order, each with the sections it shows
 * one under the other.
 */
export const GUIDE_TABS = [
  { id: 'candles', sections: ['candles', 'intervals'] },
  { id: 'ema', sections: ['ema'] },
  { id: 'bands', sections: ['bollinger', 'vwap'] },
  { id: 'levels', sections: ['levels', 'fibonacci', 'profile'] },
  { id: 'patterns', sections: ['patterns'] },
  { id: 'directions', sections: ['directions'] },
  { id: 'orders', sections: ['orders', 'exits'] },
  { id: 'leverage', sections: ['leverage'] },
  { id: 'glossary', sections: ['glossary'] },
  { id: 'plans', sections: ['plans'] },
] as const satisfies readonly { id: string; sections: readonly GuideSection[] }[];
export type GuideTab = (typeof GUIDE_TABS)[number]['id'];

/** Sections made of paragraphs (the patterns, the words and the plans have their own layout). */
export type ParagraphSection = Exclude<GuideSection, 'patterns' | 'glossary' | 'plans'>;

/** Paragraphs of each section (`app.crypto.guide.<section>.p1` …). */
export const GUIDE_PARAGRAPHS: Record<ParagraphSection, number> = {
  candles: 4,
  intervals: 2,
  directions: 5,
  orders: 5,
  exits: 4,
  leverage: 4,
  ema: 4,
  bollinger: 3,
  vwap: 3,
  profile: 3,
  levels: 3,
  fibonacci: 3,
};

export const CANDLE_PATTERNS = [
  'doji',
  'hammer',
  'shootingStar',
  'bullishEngulfing',
  'bearishEngulfing',
] as const;
export const CHART_PATTERNS = [
  'doubleTop',
  'doubleBottom',
  'headShoulders',
  'triangle',
  'flag',
  'wedge',
  'range',
  'maCross',
] as const;

/** Words of the console (`app.crypto.glossary.<term>.term` and `.text`), in the guide's last section. */
export const GLOSSARY_TERMS = [
  'candle',
  'interval',
  'volume',
  'long',
  'short',
  'market',
  'limit',
  'stop',
  'takeProfit',
  'stopLoss',
  'fee',
  'reserved',
  'unrealized',
  'realized',
  'winRate',
  'pending',
] as const;
