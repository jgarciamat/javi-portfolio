/** Shapes shared by the content files of the investing section. */

export type RiskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** 1 = weeks or months to get the money out, 5 = the same day. */
export type Liquidity = 1 | 2 | 3 | 4 | 5;
export type TaxKind = 'savings' | 'general' | 'mixed' | 'exempt';

export interface AssetClass {
  id: string;
  /** Chapter of the Learn section that explains this class in depth. */
  chapterId?: string;
  /** More chapters on the same class, shown as links under the main one. */
  moreChapters?: string[];
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

export type ChartId =
  'volatility' | 'drawdown' | 'horizon' | 'bondCurve' | 'leverage' | 'stockVsIndex';
export type CalcId = 'compound' | 'crypto' | 'bond' | 'tax' | 'stock' | 'letra';

export type Block =
  | { k: 'h'; t: string }
  | { k: 'sh'; t: string }
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

export type ChapterTopic = 'basics' | 'stocks' | 'funds' | 'bonds' | 'crypto' | 'tax';

/** A chapter with its text (the free chapters ship with the app). */
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

/** What the catalogue shows of a chapter; Premium chapters get their text from the API. */
export interface ChapterInfo extends Pick<
  Chapter,
  'id' | 'emoji' | 'color' | 'title' | 'titleEn' | 'summary' | 'summaryEn' | 'level' | 'topic'
> {
  minutes: number;
  withCalc: boolean;
  premium: boolean;
  /** Numbers of the Videoteca videos on the same topic (see `guides/domain/videos.ts`). */
  videos?: number[];
}

/** The text of a chapter: its blocks and its glossary. */
export type ChapterContent = Pick<Chapter, 'id' | 'blocks' | 'glossary'>;

/** A glossary term with the chapter that explains it. */
export type ChapterTerm = GlossaryTerm & { chapterId: string };
