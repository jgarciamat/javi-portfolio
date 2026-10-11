import type { FinancialSummary } from './types';

type T = (key: string, vars?: Record<string, string | number>) => string;

export interface SummaryCard {
  key: string;
  title: string;
  icon: string;
  value: string;
  sub: string;
  accent: string;
}

/** Savings rate thresholds: ≥ 20 % good, ≥ 10 % fair. */
export function savingsRateAccent(rate: number): string {
  if (rate >= 20) return 'var(--green-400)';
  if (rate >= 10) return 'var(--amber-400)';
  return 'var(--red-400)';
}

/** The month figures shown as cards (the available balance card is rendered apart). */
export function buildSummaryCards(
  summary: FinancialSummary,
  t: T,
  money: (n: number) => string,
  percent: (n: number) => string
): SummaryCard[] {
  const hasIncome = summary.totalIncome > 0;
  const rate = hasIncome ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
  return [
    {
      key: 'balance',
      title: t('app.summary.monthBalance'),
      icon: 'chart',
      value: money(summary.balance),
      sub: t('app.summary.monthBalance.sub', { count: summary.transactionCount }),
      accent: 'var(--slate-400)',
    },
    {
      key: 'income',
      title: t('app.summary.income'),
      icon: 'wallet',
      value: money(summary.totalIncome),
      sub: t('app.summary.income.sub'),
      accent: 'var(--green-400)',
    },
    {
      key: 'expenses',
      title: t('app.summary.expenses'),
      icon: 'receipt',
      value: money(summary.totalExpenses),
      sub: t('app.summary.expenses.sub'),
      accent: 'var(--red-400)',
    },
    {
      key: 'saving',
      title: t('app.summary.saving'),
      icon: 'piggy',
      value: money(summary.totalSaving),
      sub: t('app.summary.saving.sub'),
      accent: 'var(--accent-400)',
    },
    {
      key: 'rate',
      title: t('app.summary.savingsRate'),
      icon: 'trend',
      value: hasIncome ? percent(rate) : t('app.summary.savingsRate.noIncome'),
      sub: hasIncome
        ? t('app.summary.savingsRate.sub', { amount: money(summary.totalIncome) })
        : '',
      accent: savingsRateAccent(rate),
    },
  ];
}
