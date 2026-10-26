import { importHighlights } from '@modules/finances/domain/importHighlights';
import type { ImportRowResult } from '@modules/finances/domain/types';

const row = (over: Partial<ImportRowResult>): ImportRowResult => ({
  index: 0,
  status: 'imported',
  date: '2026-03-02',
  description: 'X',
  amount: 10,
  type: 'EXPENSE',
  categoryName: 'Ocio',
  ...over,
});

describe('importHighlights', () => {
  it('finds the category with most expenses and a limit for an average month', () => {
    const result = importHighlights([
      row({ categoryName: 'Vivienda', amount: 650, date: '2026-02-01' }),
      row({ categoryName: 'Vivienda', amount: 650, date: '2026-03-01' }),
      row({ categoryName: 'Ocio', amount: 100, date: '2026-03-05' }),
      // Not expenses, not imported or without what is needed: left out.
      row({ type: 'INCOME', categoryName: 'Salario', amount: 1800 }),
      row({ status: 'duplicate', categoryName: 'Ocio', amount: 999 }),
      row({ categoryName: undefined }),
      row({ amount: 0 }),
      // Without a date it still counts, in a month already there.
      row({ categoryName: 'Ocio', amount: 5, date: undefined }),
    ]);
    expect(result.expenses).toBe(4);
    expect(result.top).toEqual({
      category: 'Vivienda',
      amount: 1300,
      share: 1300 / 1405,
      monthlyLimit: 650,
    });
  });

  it('rounds the limit up to the next 10 and has nothing to say without expenses', () => {
    expect(importHighlights([row({ amount: 54.32 })]).top?.monthlyLimit).toBe(60);
    expect(importHighlights([row({ amount: 12, date: undefined })]).top?.monthlyLimit).toBe(20);
    expect(importHighlights([row({ type: 'INCOME' })])).toEqual({ expenses: 0, top: null });
  });
});
