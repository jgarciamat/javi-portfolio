/** Shapes shared by the content files of the investing section. */

export type RiskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** 1 = weeks or months to get the money out, 5 = the same day. */
export type Liquidity = 1 | 2 | 3 | 4 | 5;
export type TaxKind = 'savings' | 'general' | 'mixed' | 'exempt';

export interface AssetClass {
  id: string;
  num: string;
  emoji: string;
  color: string;
  name: string;
  nameEn: string;
  tagline: string;
  /** What it is. */
  what: string;
  /** How it makes money. */
  earns: string;
  risk: RiskLevel;
  liquidity: Liquidity;
  liquidityNote: string;
  horizon: string;
  subtypes: string[];
  pros: string[];
  cons: string[];
  example: string;
  /** Spanish taxation. */
  taxKind: TaxKind;
  taxShort: string;
  tax: string[];
  /** Extra short lesson shown inside the card (commodities, property, derivatives...). */
  lesson?: { title: string; text: string };
}

export type ChartId = 'volatility' | 'drawdown' | 'horizon' | 'bondCurve' | 'leverage';
export type CalcId = 'compound' | 'crypto' | 'bond' | 'tax';

export type Block =
  | { k: 'h'; t: string }
  | { k: 'p'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'key' | 'warn' | 'tip' | 'ex'; title?: string; t: string }
  | { k: 'table'; head: string[]; rows: string[][] }
  | { k: 'chart'; id: ChartId }
  | { k: 'calc'; id: CalcId }
  | { k: 'markets' };

export interface GlossaryTerm {
  term: string;
  def: string;
}

export type ChapterTopic = 'basics' | 'funds' | 'markets' | 'bonds' | 'crypto' | 'tax';

export interface Chapter {
  id: string;
  emoji: string;
  color: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  /** Level of the reader: 1 starter, 2 intermediate, 3 advanced. */
  level: 1 | 2 | 3;
  topic: ChapterTopic;
  blocks: Block[];
  glossary: GlossaryTerm[];
}
