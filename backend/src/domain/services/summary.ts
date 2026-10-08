import { Cents } from '@domain/shared/money';
import { TransactionType } from '@domain/model/TransactionType';

export interface SummaryItem {
  type: TransactionType;
  amountCents: Cents;
  categoryName: string;
}

export interface Summary {
  incomeCents: Cents;
  expenseCents: Cents;
  savingCents: Cents;
  /** income − expenses − saving */
  balanceCents: Cents;
  incomeByCategory: Record<string, Cents>;
  expensesByCategory: Record<string, Cents>;
  savingByCategory: Record<string, Cents>;
  count: number;
}

export function emptySummary(): Summary {
  return {
    incomeCents: 0,
    expenseCents: 0,
    savingCents: 0,
    balanceCents: 0,
    incomeByCategory: {},
    expensesByCategory: {},
    savingByCategory: {},
    count: 0,
  };
}

/** The single place where movements are aggregated into totals. */
export function summarize(items: Iterable<SummaryItem>): Summary {
  const s = emptySummary();
  for (const item of items) {
    s.count++;
    const bucket =
      item.type === 'INCOME'
        ? s.incomeByCategory
        : item.type === 'EXPENSE'
        ? s.expensesByCategory
        : s.savingByCategory;
    bucket[item.categoryName] = (bucket[item.categoryName] ?? 0) + item.amountCents;
    if (item.type === 'INCOME') s.incomeCents += item.amountCents;
    else if (item.type === 'EXPENSE') s.expenseCents += item.amountCents;
    else s.savingCents += item.amountCents;
  }
  s.balanceCents = s.incomeCents - s.expenseCents - s.savingCents;
  return s;
}

/** Share of income that was not spent: explicit savings plus any positive balance. */
export function savingsRate(s: Summary): number {
  if (s.incomeCents <= 0) return 0;
  return ((s.savingCents + Math.max(0, s.balanceCents)) / s.incomeCents) * 100;
}
