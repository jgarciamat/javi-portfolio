import { Cents } from '@domain/shared/money';
import { Summary } from './summary';

export const WARNING_RATIO = 0.8;

export type BudgetLevel = 'ok' | 'warning' | 'danger';

export interface BudgetLine {
  categoryId: string;
  categoryName: string;
  limitCents: Cents;
  spentCents: Cents;
  remainingCents: Cents;
  percentage: number;
  level: BudgetLevel;
}

export interface MonthAlert {
  kind: 'available' | 'category_budget';
  level: Exclude<BudgetLevel, 'ok'>;
  categoryName: string | null;
  spentCents: Cents;
  limitCents: Cents;
  percentage: number;
}

function levelFor(spent: Cents, limit: Cents): BudgetLevel {
  if (limit <= 0) return 'ok';
  if (spent >= limit) return 'danger';
  if (spent >= limit * WARNING_RATIO) return 'warning';
  return 'ok';
}

function pct(part: Cents, total: Cents): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export function computeBudgetLines(
  budgets: ReadonlyArray<{ categoryId: string; categoryName: string; amountCents: Cents }>,
  expensesByCategory: Record<string, Cents>
): BudgetLine[] {
  return budgets
    .map((b) => {
      const spent = expensesByCategory[b.categoryName] ?? 0;
      return {
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        limitCents: b.amountCents,
        spentCents: spent,
        remainingCents: b.amountCents - spent,
        percentage: pct(spent, b.amountCents),
        level: levelFor(spent, b.amountCents),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Alerts shown at the top of the month: spending against the money available
 * (carry-over + income) and every category budget at or above 80 %.
 */
export function computeMonthAlerts(
  summary: Summary,
  carryoverCents: Cents,
  budgetLines: BudgetLine[]
): MonthAlert[] {
  const alerts: MonthAlert[] = [];
  const available = carryoverCents + summary.incomeCents;
  const availableLevel = levelFor(summary.expenseCents, available);
  if (available > 0 && availableLevel !== 'ok') {
    alerts.push({
      kind: 'available',
      level: availableLevel,
      categoryName: null,
      spentCents: summary.expenseCents,
      limitCents: available,
      percentage: pct(summary.expenseCents, available),
    });
  }
  for (const line of budgetLines) {
    if (line.level === 'ok') continue;
    alerts.push({
      kind: 'category_budget',
      level: line.level,
      categoryName: line.categoryName,
      spentCents: line.spentCents,
      limitCents: line.limitCents,
      percentage: line.percentage,
    });
  }
  return alerts;
}
