import type { CategoryRule, Transaction, TransactionType } from './types';
import { parseAmount } from './importParsers';

/**
 * «Alta rápida»: a movement typed as one line, the way you would note it down: «café 1,50»,
 * «1,50 café», «taxi 12 €», «+1.200 nómina» (a plus makes it an income).
 */
export interface QuickEntry {
  description: string;
  amount: number;
  type: TransactionType;
}

/** An amount: an optional sign, digits with thousands and decimals, and an optional euro. */
const AMOUNT =
  /(^|\s)([+-]?)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)?(?=\s|$)/gi;

/** The line as a movement; null without a concept or an amount above zero. */
export function parseQuickEntry(text: string): QuickEntry | null {
  const matches = [...text.matchAll(AMOUNT)];
  // With several numbers («2 cafés 3,00»), the one with decimals, else the last one, is the amount.
  const match = matches.reverse().find((m) => /[.,]\d{1,2}$/.test(m[3])) ?? matches[0];
  if (!match) return null;
  const amount = parseAmount(match[3]);
  const description = (text.slice(0, match.index) + ' ' + text.slice(match.index + match[0].length))
    .replace(/\s+/g, ' ')
    .trim();
  if (!amount || !description) return null;
  return {
    description: description.charAt(0).toUpperCase() + description.slice(1),
    amount,
    type: match[2] === '+' ? 'INCOME' : 'EXPENSE',
  };
}

const normalize = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Up to `limit` categories last used for movements of a type, the most recent first. */
export function recentCategories(
  transactions: Transaction[],
  type: TransactionType,
  limit = 5
): string[] {
  const sorted = transactions
    .filter((tx) => tx.type === type)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return [...new Set(sorted.map((tx) => tx.category))].slice(0, limit);
}

/**
 * The category a concept suggests: a rule of the person whose text is in the concept (the longest
 * one), else the category of the last movement with the same concept, else the last one used for
 * that type. Null when there is nothing to go by.
 */
export function suggestCategory(
  entry: Pick<QuickEntry, 'description' | 'type'>,
  rules: CategoryRule[],
  transactions: Transaction[]
): string | null {
  const concept = normalize(entry.description);
  const rule = rules
    .filter((r) => concept.includes(normalize(r.pattern)))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];
  if (rule) return rule.categoryName;
  const same = transactions
    .filter((tx) => normalize(tx.description) === concept)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return same?.category ?? recentCategories(transactions, entry.type, 1)[0] ?? null;
}

/** The category for a quick movement: the suggested one, else «Otros». */
export function quickCategory(
  entry: QuickEntry,
  rules: CategoryRule[],
  transactions: Transaction[]
): string {
  return suggestCategory(entry, rules, transactions) ?? 'Otros';
}
