import { ASSET_CLASSES_A } from './assetClassesA';
import { ASSET_CLASSES_B } from './assetClassesB';
import { ASSET_CLASSES_C } from './assetClassesC';
import { CHAPTERS_STOCKS } from './chaptersStocks';
import { CHAPTER_RISK } from './chapterRisk';
import { PREMIUM_CHAPTERS } from './premiumChapters';
import type {
  AssetClass,
  Chapter,
  ChapterContent,
  ChapterInfo,
  ChapterTerm,
  ChapterTopic,
  RiskLevel,
} from './types';

export const ASSET_CLASSES: AssetClass[] = [
  ...ASSET_CLASSES_A,
  ...ASSET_CLASSES_B,
  ...ASSET_CLASSES_C,
];

/** The free chapters (the first two), with their text. */
export const FREE_CHAPTERS: Chapter[] = [...CHAPTERS_STOCKS, CHAPTER_RISK];

/** Minutes needed to read a chapter (about 200 words per minute, at least one). */
export function chapterMinutes(chapter: Pick<Chapter, 'blocks'>): number {
  const words = chapter.blocks
    .map((b) => {
      if (b.k === 'ul') return b.items.join(' ');
      if (b.k === 'table') return [...b.head, ...b.rows.flat()].join(' ');
      if (b.k === 'chart' || b.k === 'calc' || b.k === 'markets') return '';
      return b.t;
    })
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const info = (c: Chapter): ChapterInfo => ({
  id: c.id,
  emoji: c.emoji,
  color: c.color,
  title: c.title,
  titleEn: c.titleEn,
  summary: c.summary,
  summaryEn: c.summaryEn,
  level: c.level,
  topic: c.topic,
  minutes: chapterMinutes(c),
  withCalc: c.blocks.some((b) => b.k === 'calc'),
  premium: false,
});

/** Chapters in reading order: from the basics to the most advanced topics. */
export const CHAPTERS: ChapterInfo[] = [...FREE_CHAPTERS.map(info), ...PREMIUM_CHAPTERS];

export const TOPICS: { id: ChapterTopic; label: string; labelEn: string; emoji: string }[] = [
  { id: 'basics', label: 'Lo básico', labelEn: 'Basics', emoji: '🎓' },
  { id: 'stocks', label: 'Acciones', labelEn: 'Shares', emoji: '🏢' },
  { id: 'funds', label: 'Fondos y ETF', labelEn: 'Funds and ETFs', emoji: '🧺' },
  { id: 'bonds', label: 'Renta fija', labelEn: 'Bonds', emoji: '🏛️' },
  { id: 'crypto', label: 'Criptomonedas', labelEn: 'Crypto', emoji: '🪙' },
  { id: 'tax', label: 'Impuestos', labelEn: 'Taxes', emoji: '🧾' },
];

export const findChapter = (id: string): ChapterInfo | undefined =>
  CHAPTERS.find((c) => c.id === id);

/** The text of a free chapter (Premium chapters come from the API). */
export const freeContent = (id: string): ChapterContent | undefined =>
  FREE_CHAPTERS.find((c) => c.id === id);

/**
 * The glossary terms of the free chapters plus `more` (those of the Premium chapters, for
 * Premium users), alphabetically and without repeats.
 */
export function allGlossaryTerms(more: ChapterTerm[] = []): ChapterTerm[] {
  const seen = new Set<string>();
  const out: ChapterTerm[] = [];
  const terms = [
    ...FREE_CHAPTERS.flatMap((c) => c.glossary.map((g) => ({ ...g, chapterId: c.id }))),
    ...more,
  ];
  for (const term of terms) {
    const key = term.term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  return out.sort((a, b) => a.term.localeCompare(b.term, 'es'));
}

export function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export type RiskBand = 'low' | 'mid' | 'high';

/** 1-2 low, 3-4 medium, 5-7 high. */
export function riskBand(level: RiskLevel): RiskBand {
  if (level <= 2) return 'low';
  return level <= 4 ? 'mid' : 'high';
}

/** Text an asset class is searched by. */
export function assetSearchText(a: AssetClass): string {
  return [a.name, a.nameEn, a.tagline, a.what, ...a.subtypes].join(' ');
}
