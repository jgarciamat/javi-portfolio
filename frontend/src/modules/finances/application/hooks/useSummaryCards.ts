import type { FinancialSummary } from '@modules/finances/domain/types';
import { formatCurrency } from '../../ui/types/SummaryCards.types';

type TFn = (key: string, vars?: Record<string, string>) => string;

export function useSummaryCards(summary: FinancialSummary, carryover: number | null, t: TFn) {
  const carryoverAmount = carryover ?? 0;
  const saldoTotal = carryoverAmount + summary.balance;

  const monthBalanceCard = {
    title: t('app.summary.monthBalance'),
    icon: '📊',
    value: formatCurrency(summary.balance),
    sub: t('app.summary.monthBalance.sub', { count: String(summary.transactionCount) }),
    accent: '#6b7280',
  };

  const incomeCard = {
    title: t('app.summary.income'),
    icon: '💸',
    value: formatCurrency(summary.totalIncome),
    sub: t('app.summary.income.sub'),
    accent: '#10b981',
  };

  const expensesCard = {
    title: t('app.summary.expenses'),
    icon: '🧾',
    value: formatCurrency(summary.totalExpenses),
    sub: t('app.summary.expenses.sub'),
    accent: '#ef4444',
  };

  const savingCard = {
    title: t('app.summary.saving'),
    icon: '💰',
    value: formatCurrency(summary.totalSaving),
    sub: t('app.summary.saving.sub'),
    accent: '#f59e0b',
  };

  const savingsRate =
    summary.totalIncome > 0 ? (summary.totalSaving / summary.totalIncome) * 100 : 0;
  const savingsRateValue =
    summary.totalIncome > 0 ? `${savingsRate.toFixed(1)}%` : t('app.summary.savingsRate.noIncome');
  const savingsRateSub =
    summary.totalIncome > 0
      ? t('app.summary.savingsRate.sub', { amount: formatCurrency(summary.totalIncome) })
      : '';

  const savingsRateCard = {
    title: t('app.summary.savingsRate'),
    icon: '📈',
    value: savingsRateValue,
    sub: savingsRateSub,
    accent: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444',
  };

  const cards = [monthBalanceCard, incomeCard, expensesCard, savingCard, savingsRateCard];

  return { saldoTotal, carryoverAmount, cards };
}
