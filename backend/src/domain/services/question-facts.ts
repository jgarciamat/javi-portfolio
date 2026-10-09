import { Cents, fromCents } from '@domain/shared/money';

/**
 * Aggregated figures the assistant answers questions from. Never descriptions, notes,
 * account names or anything that identifies a movement: only totals per month and category.
 */
export interface QuestionFacts {
  currency: string;
  /** YYYY-MM-DD */
  today: string;
  /** Money available right now. */
  available: number;
  /** Oldest to newest, the current month last. */
  months: { period: string; income: number; expenses: number; saving: number }[];
  /** Expenses of the most spent categories, per month (YYYY-MM). */
  expensesByCategory: Record<string, Record<string, number>>;
}

const MAX_CATEGORIES = 12;

const label = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`;

export interface QuestionFactsInput {
  currency: string;
  today: string;
  availableCents: Cents;
  months: {
    year: number;
    month: number;
    incomeCents: Cents;
    expenseCents: Cents;
    savingCents: Cents;
  }[];
  categoryTotals: { year: number; month: number; categoryName: string; cents: Cents }[];
}

export function buildQuestionFacts(input: QuestionFactsInput): QuestionFacts {
  const spentByCategory = new Map<string, Cents>();
  for (const row of input.categoryTotals) {
    spentByCategory.set(row.categoryName, (spentByCategory.get(row.categoryName) ?? 0) + row.cents);
  }
  const top = new Set(
    [...spentByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CATEGORIES)
      .map(([name]) => name)
  );
  const expensesByCategory: QuestionFacts['expensesByCategory'] = {};
  for (const row of input.categoryTotals) {
    if (!top.has(row.categoryName)) continue;
    const byMonth = (expensesByCategory[row.categoryName] ??= {});
    byMonth[label(row.year, row.month)] = fromCents(row.cents);
  }
  return {
    currency: input.currency,
    today: input.today,
    available: fromCents(input.availableCents),
    months: input.months.map((m) => ({
      period: label(m.year, m.month),
      income: fromCents(m.incomeCents),
      expenses: fromCents(m.expenseCents),
      saving: fromCents(m.savingCents),
    })),
    expensesByCategory,
  };
}
