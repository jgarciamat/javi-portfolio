import { TransactionView, TransferView, BudgetView } from '@domain/ports/repositories';
import { BudgetLine, MonthAlert } from '@domain/services/budget-status';
import { Summary } from '@domain/services/summary';
import { CategoryTrend } from '@domain/services/trends';
import { Cents, fromCents } from '@domain/shared/money';
import { AccountWithBalance } from '@application/accounts/AccountService';
import { SplitGroupView } from '@application/split/SplitService';
import { YearTax } from '@domain/services/tax';
import { AssetView } from '@application/assets/AssetService';
import { InboxOverview } from '@application/inbox/InboxService';
import { EndOfMonthPlan, EomPayment } from '@domain/services/end-of-month';
import { ProjectedMonth } from '@domain/services/forecast';
import {
  AnnualReport,
  ForecastResult,
  NetWorthPoint,
  SubscriptionsView,
} from '@application/insights/InsightsServices';
import { MoneyLeaksView } from '@application/insights/MoneyLeakService';
import { LeakFinding } from '@domain/services/money-leaks';
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
    summary: presentSummary(o.summary, { year: o.year, month: o.month }),
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
  return {
    year: a.year,
    openingBalance: m(a.openingBalanceCents),
    months,
    scheduled: {
      count: a.scheduled.count,
      income: m(a.scheduled.incomeCents),
      expenses: m(a.scheduled.expenseCents),
      saving: m(a.scheduled.savingCents),
    },
  };
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
      averageMonthly:
        g.progress.averageMonthlyCents === null ? null : m(g.progress.averageMonthlyCents),
      historyMonths: g.progress.historyMonths,
      savedThisMonth: m(g.progress.savedThisPeriodCents),
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
    assets: m(p.assetsCents),
    debts: m(p.debtsCents),
    netWorth: m(p.netWorthCents),
  };
}

function presentEndOfMonth(e: EndOfMonthPlan) {
  const payment = (p: EomPayment) => ({
    description: p.description,
    date: p.date,
    amount: m(p.amountCents),
  });
  return {
    enoughData: e.enoughData,
    fewData: e.fewData,
    available: m(e.availableCents),
    daysLeft: e.daysLeft,
    daysElapsed: e.daysElapsed,
    monthVariable: m(e.monthVariableCents),
    monthDaily: m(e.monthDailyCents),
    historyDaily: e.historyDailyCents === null ? null : m(e.historyDailyCents),
    historyMonths: e.historyMonths,
    pace: m(e.paceCents),
    pending: e.pending.map(payment),
    pendingTotal: m(e.pendingCents),
    scheduled: e.scheduled.map(payment),
    scheduledTotal: m(e.scheduledCents),
    oneOffs: e.oneOffs.map(payment),
    outlierMonths: e.outlierMonths,
    projectedEnd: m(e.projectedEndCents),
    maxDaily: m(e.maxDailyCents),
    status: e.status,
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
    endOfMonth: presentEndOfMonth(f.endOfMonth),
    locked: f.locked,
    projection: f.projection.map(month),
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

export function presentSubscriptions(r: SubscriptionsView) {
  return {
    monthly: m(r.monthlyCents),
    annual: m(r.annualCents),
    count: r.count,
    locked: r.locked,
    fixed: r.fixed,
    subscriptions: r.subscriptions.map((s) => ({
      key: s.key,
      description: s.description,
      cadence: s.cadence,
      amount: m(s.amountCents),
      annualCost: m(s.annualCostCents),
      count: s.count,
      lastDate: s.lastDate,
      nextDate: s.nextDate,
      priceIncrease: s.priceIncrease
        ? { from: m(s.priceIncrease.fromCents), to: m(s.priceIncrease.toCents) }
        : null,
      categoryName: s.categoryName,
      essential: s.essential,
    })),
  };
}

export function presentLeakFinding(f: LeakFinding) {
  return {
    id: f.id,
    kind: f.kind,
    confidence: f.confidence as 'high' | 'medium',
    status: f.status,
    label: f.label,
    essential: f.essential,
    cadence: f.cadence,
    amount: m(f.amountCents),
    previousAmount: f.previousAmountCents === null ? null : m(f.previousAmountCents),
    annual: m(f.annualCents),
    oneOff: m(f.oneOffCents),
    count: f.count,
    firstDate: f.firstDate,
    lastDate: f.lastDate,
    nextDate: f.nextDate,
    perMonth: f.perMonth,
    evidence: f.evidence.map((e) => ({ date: e.date, amount: m(e.amountCents) })),
  };
}

export function presentMoneyLeaks(v: MoneyLeaksView) {
  const kind = (k: keyof MoneyLeaksView['byKind']) => ({
    count: v.byKind[k].count,
    annual: m(v.byKind[k].annualCents),
  });
  return {
    coverage: v.coverage,
    total: {
      annual: m(v.total.annualCents),
      oneOff: m(v.total.oneOffCents),
      count: v.total.count,
    },
    byKind: {
      recurring: kind('recurring'),
      increase: kind('increase'),
      duplicate: kind('duplicate'),
      small: kind('small'),
    },
    findings: v.findings.map(presentLeakFinding),
    count: v.count,
    locked: v.locked,
    reviewed: {
      count: v.reviewed.count,
      cancelMonthly: m(v.reviewed.cancelMonthlyCents),
      recoveredAnnual: m(v.reviewed.recoveredAnnualCents),
    },
  };
}

export function presentAnnualReport(r: AnnualReport) {
  const totals = (t: AnnualReport['totals']) => ({
    income: m(t.incomeCents),
    expenses: m(t.expenseCents),
    saving: m(t.savingCents),
    balance: m(t.balanceCents),
  });
  const category = (c: { categoryName: string; cents: Cents }) => ({
    categoryName: c.categoryName,
    amount: m(c.cents),
  });
  return {
    year: r.year,
    currency: r.currency,
    months: r.months.map((x) => ({
      month: x.month,
      income: m(x.incomeCents),
      expenses: m(x.expenseCents),
      saving: m(x.savingCents),
    })),
    quarters: r.quarters.map((q) => ({ quarter: q.quarter, ...totals(q) })),
    totals: totals(r.totals),
    incomeByCategory: r.incomeByCategory.map(category),
    expensesByCategory: r.expensesByCategory.map(category),
  };
}

export function presentAsset(a: AssetView) {
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    interestRate: a.interestRate,
    minPayment: a.minPaymentCents === null ? null : m(a.minPaymentCents),
    value: m(a.valueCents),
    valueDate: a.valueDate,
    previousValue: a.previousCents === null ? null : m(a.previousCents),
    history: a.history.map((h) => ({ date: h.date, value: m(h.valueCents) })),
  };
}

export function presentTax(t: YearTax) {
  const money = (q: Omit<YearTax['totals'], never>) => ({
    incomeBase: m(q.incomeBaseCents),
    vatCollected: m(q.vatCollectedCents),
    expenseBase: m(q.expenseBaseCents),
    vatPaid: m(q.vatPaidCents),
    vatDue: m(q.vatDueCents),
    netIncome: m(q.netIncomeCents),
    irpfAdvance: m(q.irpfAdvanceCents),
  });
  return {
    year: t.year,
    quarters: t.quarters.map((q) => ({ quarter: q.quarter, ...money(q) })),
    totals: money(t.totals),
  };
}

export function presentSplitGroup(g: SplitGroupView) {
  return {
    id: g.id,
    name: g.name,
    members: g.members.map((mem) => ({ id: mem.id, name: mem.name, balance: m(mem.balanceCents) })),
    expenses: g.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: m(e.amountCents),
      paidBy: e.paidBy,
      date: e.date,
      settlement: e.settlement,
      shares: e.shares.map((s) => ({ memberId: s.memberId, share: m(s.shareCents) })),
    })),
    transfers: g.transfers.map((t) => ({ from: t.from, to: t.to, amount: m(t.cents) })),
  };
}

export function presentInbox(i: InboxOverview) {
  return {
    address: i.address,
    recent: i.recent.map((msg) => ({
      id: msg.id,
      receivedAt: msg.receivedAt,
      status: msg.status,
      description: msg.description,
      amount: msg.amountCents === null ? null : m(msg.amountCents),
    })),
  };
}
