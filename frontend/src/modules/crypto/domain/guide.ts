import type { LayerId } from './indicators';

/** Sections of the guide «What is each thing?», in reading order. */
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

/** Where the «?» of each layer opens the guide. */
export const LAYER_SECTION: Record<LayerId, GuideSection> = {
  ema20: 'ema',
  ema50: 'ema',
  ema200: 'ema',
  bollinger: 'bollinger',
  vwap: 'vwap',
  profile: 'profile',
  levels: 'levels',
  fibonacci: 'fibonacci',
};

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
