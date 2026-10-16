import { ASSET_CLASSES_A } from './assetClassesA';
import { ASSET_CLASSES_B } from './assetClassesB';
import { ASSET_CLASSES_C } from './assetClassesC';
import { CHAPTERS_FUNDS } from './chaptersFunds';
import { CHAPTERS_MARKETS } from './chaptersMarkets';
import { CHAPTERS_CRYPTO_A } from './chaptersCrypto';
import { CHAPTERS_CRYPTO_B } from './chaptersCrypto2';
import type { AssetClass, Chapter, ChapterTopic, GlossaryTerm, RiskLevel } from './types';

export const ASSET_CLASSES: AssetClass[] = [
  ...ASSET_CLASSES_A,
  ...ASSET_CLASSES_B,
  ...ASSET_CLASSES_C,
];

/** Chapters in reading order: from the basics to the most advanced topics. */
export const CHAPTERS: Chapter[] = [
  CHAPTERS_MARKETS[0],
  ...CHAPTERS_FUNDS,
  CHAPTERS_MARKETS[1],
  CHAPTERS_MARKETS[2],
  CHAPTERS_MARKETS[3],
  CHAPTERS_MARKETS[4],
  ...CHAPTERS_CRYPTO_A,
  ...CHAPTERS_CRYPTO_B,
];

export const TOPICS: { id: ChapterTopic; label: string; labelEn: string; emoji: string }[] = [
  { id: 'basics', label: 'Lo básico', labelEn: 'Basics', emoji: '🎓' },
  { id: 'funds', label: 'Fondos y ETF', labelEn: 'Funds and ETFs', emoji: '🧺' },
  { id: 'markets', label: 'Bolsa y mercados', labelEn: 'Stock markets', emoji: '🌍' },
  { id: 'bonds', label: 'Renta fija', labelEn: 'Bonds', emoji: '🏛️' },
  { id: 'crypto', label: 'Criptomonedas', labelEn: 'Crypto', emoji: '🪙' },
  { id: 'tax', label: 'Impuestos', labelEn: 'Taxes', emoji: '🧾' },
];

export const findChapter = (id: string): Chapter | undefined => CHAPTERS.find((c) => c.id === id);

/** Every glossary term of every chapter, alphabetically, without repeats. */
export function allGlossaryTerms(): (GlossaryTerm & { chapterId: string })[] {
  const seen = new Set<string>();
  const out: (GlossaryTerm & { chapterId: string })[] = [];
  for (const chapter of CHAPTERS) {
    for (const term of chapter.glossary) {
      const key = term.term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...term, chapterId: chapter.id });
    }
  }
  return out.sort((a, b) => a.term.localeCompare(b.term, 'es'));
}

/** Minutes needed to read a chapter (about 200 words per minute, at least one). */
export function chapterMinutes(chapter: Chapter): number {
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
