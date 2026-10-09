import { RecurringRule } from '@domain/model/RecurringRule';
import { Cents } from '@domain/shared/money';
import { Period, addMonths, periodOrdinal } from '@domain/shared/period';

/** How the rest of the period looks: comfortable, only if spending slows down, or already negative. */
export type SafeStatus = 'ok' | 'tight' | 'over';

export interface SafeToSpend {
  /** Money left in the period (carry-over included). */
  availableCents: Cents;
  /** Days from today to the end of the period, today included. */
  daysLeft: number;
  /** What can be spent per day without going below zero (never negative). */
  dailyCents: Cents;
  /** Estimated money left when the period ends, at the usual pace of spending. */
  projectedEndCents: Cents;
  status: SafeStatus;
}

/** Usual month-to-month movement that is not a recurring rule (shopping, one-off income…). */
export interface VariableAverages {
  expenseCents: Cents;
  incomeCents: Cents;
}

export interface ProjectedMonth extends Period {
  incomeCents: Cents;
  /** Recurring expenses that fall in the month. */
  fixedExpenseCents: Cents;
  /** Usual non-recurring spending. */
  variableExpenseCents: Cents;
  savingCents: Cents;
  /** income − expenses − saving. */
  balanceCents: Cents;
  /** Money available at the end of the month. */
  endAvailableCents: Cents;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Days from `from` to `to` (YYYY-MM-DD), both included; at least 1. */
export function inclusiveDays(from: string, to: string): number {
  return Math.max(1, dayNumber(to) - dayNumber(from) + 1);
}

/** Average of the non-recurring movements of past periods; only periods with data count. */
export function averageVariable(
  periods: { type: string; amountCents: Cents; recurringRuleId: string | null }[][]
): VariableAverages {
  const used = periods.filter((p) => p.length > 0);
  if (used.length === 0) return { expenseCents: 0, incomeCents: 0 };
  const sum = (type: string): Cents =>
    used.reduce(
      (total, p) =>
        total +
        p
          .filter((tx) => tx.type === type && tx.recurringRuleId === null)
          .reduce((s, tx) => s + tx.amountCents, 0),
      0
    );
  return {
    expenseCents: Math.round(sum('EXPENSE') / used.length),
    incomeCents: Math.round(sum('INCOME') / used.length),
  };
}

/** "Can I reach the end of the month?": what is left per day and how the period is likely to end. */
export function safeToSpend(input: {
  availableCents: Cents;
  today: string;
  periodStart: string;
  periodEnd: string;
  variable: VariableAverages;
}): SafeToSpend {
  const daysLeft = inclusiveDays(input.today, input.periodEnd);
  const periodDays = inclusiveDays(input.periodStart, input.periodEnd);
  const expectedRemaining = Math.round((input.variable.expenseCents * daysLeft) / periodDays);
  const projectedEndCents = input.availableCents - expectedRemaining;
  return {
    availableCents: input.availableCents,
    daysLeft,
    dailyCents: Math.max(0, Math.floor(input.availableCents / daysLeft)),
    projectedEndCents,
    status: input.availableCents <= 0 ? 'over' : projectedEndCents < 0 ? 'tight' : 'ok',
  };
}

export interface ProjectionInput {
  /** First period to project. */
  from: Period;
  months: number;
  /** Money available when `from` starts. */
  startAvailableCents: Cents;
  rules: RecurringRule[];
  variable: VariableAverages;
  /** Rules to leave out ("what if I cancel this?"). */
  excludedRuleIds: ReadonlySet<string>;
  /** Periods (ordinals) the user deleted from a rule: they will not be generated. */
  skipped: ReadonlyMap<string, ReadonlySet<number>>;
}

/** Month-by-month outlook built from the recurring rules and the usual variable spending. */
export function projectMonths(input: ProjectionInput): ProjectedMonth[] {
  const months: ProjectedMonth[] = [];
  let available = input.startAvailableCents;
  for (let i = 0; i < input.months; i++) {
    const period = addMonths(input.from, i);
    let income = input.variable.incomeCents;
    let fixedExpense = 0;
    let saving = 0;
    for (const rule of input.rules) {
      if (input.excludedRuleIds.has(rule.id) || !rule.appliesTo(period)) continue;
      if (input.skipped.get(rule.id)?.has(periodOrdinal(period))) continue;
      if (rule.type === 'INCOME') income += rule.amountCents;
      else if (rule.type === 'EXPENSE') fixedExpense += rule.amountCents;
      else saving += rule.amountCents;
    }
    const balance = income - fixedExpense - input.variable.expenseCents - saving;
    available += balance;
    months.push({
      ...period,
      incomeCents: income,
      fixedExpenseCents: fixedExpense,
      variableExpenseCents: input.variable.expenseCents,
      savingCents: saving,
      balanceCents: balance,
      endAvailableCents: available,
    });
  }
  return months;
}

/** First projected month that ends below zero, if any. */
export function firstShortfall(months: ProjectedMonth[]): Period | null {
  const found = months.find((m) => m.endAvailableCents < 0);
  return found ? { year: found.year, month: found.month } : null;
}
