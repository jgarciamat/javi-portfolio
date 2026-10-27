import type { ImportRowResult } from './types';

/** The category where most money went in an import, and a monthly limit to offer for it. */
export interface ImportHighlights {
  /** Expenses imported (the rows the import kept). */
  expenses: number;
  top: {
    category: string;
    /** Total spent in it, in every month imported. */
    amount: number;
    /** Part of all the expenses, from 0 to 1. */
    share: number;
    /** What it takes in an average month, rounded up to the next 10 (a limit easy to read). */
    monthlyLimit: number;
  } | null;
}

const LIMIT_STEP = 10;

/**
 * What an import shows first: the category that takes most of the expenses and a limit in line
 * with what is already spent in it each month. Only facts of the movements, no promises.
 */
export function importHighlights(rows: ImportRowResult[]): ImportHighlights {
  const expenses = rows.filter(
    (r) => r.status === 'imported' && r.type === 'EXPENSE' && r.amount && r.categoryName
  );
  const byCategory = new Map<string, number>();
  const months = new Set<string>();
  let total = 0;
  for (const r of expenses) {
    const amount = Math.abs(r.amount as number);
    byCategory.set(
      r.categoryName as string,
      (byCategory.get(r.categoryName as string) ?? 0) + amount
    );
    if (r.date) months.add(r.date.slice(0, 7));
    total += amount;
  }
  const [category, amount] = [...byCategory].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!category) return { expenses: 0, top: null };
  const perMonth = amount / Math.max(months.size, 1);
  return {
    expenses: expenses.length,
    top: {
      category,
      amount,
      share: amount / total,
      monthlyLimit: Math.ceil(perMonth / LIMIT_STEP) * LIMIT_STEP,
    },
  };
}
