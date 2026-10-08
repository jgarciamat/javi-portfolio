import type { AnnualSummary, MonthData } from './types';

export interface AnnualMonthEntry extends MonthData {
  month: number;
}

export interface AnnualChartData {
  months: AnnualMonthEntry[];
  /** Largest bar (at least 1, so empty years do not divide by zero). */
  maxVal: number;
  totals: { income: number; expenses: number; saving: number; balance: number };
}

/** Chart-ready data of an annual summary, months in calendar order. */
export function buildAnnualChartData(data: AnnualSummary | null): AnnualChartData {
  const months = data
    ? Object.entries(data.months)
        .map(([k, v]) => ({ ...v, month: Number(k) }))
        .sort((a, b) => a.month - b.month)
    : [];
  const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses, m.saving]));
  const totals = months.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      saving: acc.saving + m.saving,
      balance: acc.balance + m.income - m.expenses - m.saving,
    }),
    { income: 0, expenses: 0, saving: 0, balance: 0 }
  );
  return { months, maxVal, totals };
}
