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
  if (rate >= 20) return '#10b981';
  if (rate >= 10) return '#f59e0b';
  return '#ef4444';
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
      icon: '📊',
      value: money(summary.balance),
      sub: t('app.summary.monthBalance.sub', { count: summary.transactionCount }),
      accent: '#6b7280',
    },
    {
      key: 'income',
      title: t('app.summary.income'),
      icon: '💸',
      value: money(summary.totalIncome),
      sub: t('app.summary.income.sub'),
      accent: '#10b981',
    },
    {
      key: 'expenses',
      title: t('app.summary.expenses'),
      icon: '🧾',
      value: money(summary.totalExpenses),
      sub: t('app.summary.expenses.sub'),
      accent: '#ef4444',
    },
    {
      key: 'saving',
      title: t('app.summary.saving'),
      icon: '💰',
      value: money(summary.totalSaving),
      sub: t('app.summary.saving.sub'),
      accent: '#f59e0b',
    },
    {
      key: 'rate',
      title: t('app.summary.savingsRate'),
      icon: '📈',
      value: hasIncome ? percent(rate) : t('app.summary.savingsRate.noIncome'),
      sub: hasIncome
        ? t('app.summary.savingsRate.sub', { amount: money(summary.totalIncome) })
        : '',
      accent: savingsRateAccent(rate),
    },
  ];
}
