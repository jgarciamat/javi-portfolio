import { TransactionView, TransferView, BudgetView } from '@domain/ports/repositories';
import { BudgetLine, MonthAlert } from '@domain/services/budget-status';
import { Summary } from '@domain/services/summary';
import { CategoryTrend } from '@domain/services/trends';
import { Cents, fromCents } from '@domain/shared/money';
import { AccountWithBalance } from '@application/accounts/AccountService';
import { ProjectedMonth } from '@domain/services/forecast';
import { ForecastResult, NetWorthPoint } from '@application/insights/InsightsServices';
import { AlertView, GoalView } from '@application/planning/PlanningServices';
import { RuleView } from '@application/recurring/RecurringService';
import { AnnualOverview, MonthOverview } from '@application/transactions/TransactionService';
import { TransactionSearchResult } from '@domain/ports/repositories';

/** The API speaks decimal amounts (12.34); the domain works in integer cents. */
const m = (cents: Cents): number => fromCents(cents);
const mapRecord = (r: Record<string, Cents>): Record<string, number> =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, m(v)]));

export function presentTransaction(t: TransactionView) {
  return {
    id: t.id,
    description: t.description,
    amount: m(t.amountCents),
    type: t.type,
    category: t.categoryName,
    categoryId: t.categoryId,
    categoryColor: t.categoryColor,
    categoryIcon: t.categoryIcon,
    accountId: t.accountId,
    accountName: t.accountName,
    date: t.date,
    year: t.year,
    month: t.month,
    notes: t.notes,
    recurringRuleId: t.recurringRuleId,
    createdAt: t.createdAt,
  };
}

export function presentSummary(s: Summary, period?: { year: number; month: number }) {
  return {
    totalIncome: m(s.incomeCents),
    totalExpenses: m(s.expenseCents),
    totalSaving: m(s.savingCents),
    balance: m(s.balanceCents),
    expensesByCategory: mapRecord(s.expensesByCategory),
    incomeByCategory: mapRecord(s.incomeByCategory),
    savingByCategory: mapRecord(s.savingByCategory),
    transactionCount: s.count,
    ...(period ?? {}),
  };
}

export function presentBudgetLine(b: BudgetLine) {
  return {
    categoryId: b.categoryId,
    categoryName: b.categoryName,
    limit: m(b.limitCents),
    spent: m(b.spentCents),
    remaining: m(b.remainingCents),
    percentage: b.percentage,
    level: b.level,
  };
}

export function presentMonthAlert(a: MonthAlert) {
  return {
    kind: a.kind,
    level: a.level,
    categoryName: a.categoryName,
    spent: m(a.spentCents),
    limit: m(a.limitCents),
    percentage: a.percentage,
  };
}

export function presentMonth(o: MonthOverview) {
  return {
    year: o.year,
    month: o.month,
    start: o.start,
    end: o.end,
    isCurrent: o.isCurrent,
    transactions: o.transactions.map(presentTransaction),
    summary: presentSummary(o.summary, o),
    carryover: m(o.carryoverCents),
    available: m(o.availableCents),
    budgets: o.budgets.map(presentBudgetLine),
    alerts: o.alerts.map(presentMonthAlert),
  };
}

export function presentAnnual(a: AnnualOverview) {
  const months: Record<
    number,
    { income: number; expenses: number; saving: number; balance: number }
  > = {};
  for (const [key, v] of Object.entries(a.months)) {
    months[Number(key)] = {
      income: m(v.incomeCents),
      expenses: m(v.expenseCents),
      saving: m(v.savingCents),
      balance: m(v.balanceCents),
    };
  }
  return { year: a.year, openingBalance: m(a.openingBalanceCents), months };
}

export function presentSearch(r: TransactionSearchResult) {
  return {
    items: r.items.map(presentTransaction),
    total: r.total,
    totals: {
      income: m(r.totals.incomeCents),
      expenses: m(r.totals.expenseCents),
      saving: m(r.totals.savingCents),
    },
  };
}

export function presentRule(r: RuleView) {
  return {
    id: r.id,
    userId: r.userId,
    description: r.description,
    amount: m(r.amountCents),
    type: r.type,
    category: r.categoryName,
    categoryId: r.categoryId,
    accountId: r.accountId,
    startYear: r.start.year,
    startMonth: r.start.month,
    endYear: r.end?.year ?? null,
    endMonth: r.end?.month ?? null,
    frequency: r.frequency,
    active: r.active,
    createdAt: r.createdAt,
  };
}

export function presentAlert(a: AlertView) {
  return {
    id: a.id,
    userId: a.userId,
    name: a.name,
    metric: a.metric,
    operator: a.operator,
    threshold: a.threshold,
    category: a.categoryName,
    categoryId: a.categoryId,
    color: a.color,
    active: a.active,
    createdAt: a.createdAt,
  };
}

export function presentAccount(a: AccountWithBalance) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    initialBalance: m(a.initialBalanceCents),
    balance: m(a.balanceCents),
    color: a.color,
    icon: a.icon,
    archived: a.archived,
    isDefault: a.isDefault,
    createdAt: a.createdAt,
  };
}

export function presentTransfer(t: TransferView) {
  return {
    id: t.id,
    fromAccountId: t.fromAccountId,
    fromAccountName: t.fromAccountName,
    toAccountId: t.toAccountId,
    toAccountName: t.toAccountName,
    amount: m(t.amountCents),
    date: t.date,
    description: t.description,
    createdAt: t.createdAt,
  };
}

export function presentBudget(b: BudgetView) {
  return {
    id: b.id,
    categoryId: b.categoryId,
    categoryName: b.categoryName,
    amount: m(b.amountCents),
  };
}

export function presentGoal(g: GoalView) {
  return {
    id: g.id,
    name: g.name,
    target: m(g.targetCents),
    targetDate: g.targetDate,
    categoryId: g.categoryId,
    categoryName: g.categoryName,
    icon: g.icon,
    color: g.color,
    archived: g.archived,
    createdAt: g.createdAt,
    progress: {
      saved: m(g.progress.savedCents),
      remaining: m(g.progress.remainingCents),
      percentage: g.progress.percentage,
      monthsLeft: g.progress.monthsLeft,
      monthlyNeeded:
        g.progress.monthlyNeededCents === null ? null : m(g.progress.monthlyNeededCents),
      completed: g.progress.completed,
    },
  };
}

export function presentTrend(t: CategoryTrend) {
  return {
    categoryName: t.categoryName,
    current: m(t.currentCents),
    previous: m(t.previousCents),
    average3: m(t.average3Cents),
    changeVsPreviousPct: t.changeVsPreviousPct,
    changeVsAveragePct: t.changeVsAveragePct,
  };
}

export function presentNetWorth(p: NetWorthPoint) {
  return {
    year: p.year,
    month: p.month,
    available: m(p.availableCents),
    saved: m(p.savedCents),
    netWorth: m(p.netWorthCents),
  };
}

export function presentForecast(f: ForecastResult) {
  const month = (p: ProjectedMonth) => ({
    year: p.year,
    month: p.month,
    income: m(p.incomeCents),
    fixedExpenses: m(p.fixedExpenseCents),
    variableExpenses: m(p.variableExpenseCents),
    saving: m(p.savingCents),
    balance: m(p.balanceCents),
    endAvailable: m(p.endAvailableCents),
  });
  return {
    year: f.year,
    month: f.month,
    safeToSpend: {
      available: m(f.safeToSpend.availableCents),
      daysLeft: f.safeToSpend.daysLeft,
      daily: m(f.safeToSpend.dailyCents),
      projectedEnd: m(f.safeToSpend.projectedEndCents),
      status: f.safeToSpend.status,
    },
    locked: f.locked,
    projection: f.projection ? f.projection.map(month) : null,
    firstShortfall: f.firstShortfall,
    rules: f.rules.map((r) => ({
      id: r.id,
      description: r.description,
      type: r.type,
      amount: m(r.amountCents),
      frequency: r.frequency,
    })),
  };
}
