import { Cents } from '@domain/shared/money';
import { normalizeText } from '@domain/shared/text';
import { inclusiveDays } from './forecast';
import { subscriptionKey } from './subscriptions';

/**
 * «¿Llegas a fin de mes?» with the user's own movements (docs/llegas-a-fin-de-mes.md). Pure: the
 * same movements and day always give the same answer, and nothing here is stored.
 *
 *   available        the «Saldo disponible» of the month (the accounts add up to it).
 *   pending          detected subscriptions not charged yet this month whose next charge falls
 *                    between today and the end of the month. Automatic operations are added on the
 *                    first day of the month, so they are already in `available`; so are movements
 *                    dated later this month (`scheduled`, listed but not taken away again).
 *   variable         expenses of the month up to today without automatic operations, detected
 *                    subscriptions, transfers between own accounts, savings or one-offs.
 *   monthDaily       variable / days elapsed (from the first day of the month, or of the data, to
 *                    today, both included).
 *   historyDaily     mean of the variable spending per day of the last complete months (up to 6,
 *                    a week of data at least), leaving out months above 3× the median. One-offs
 *                    (a single expense over 3× the median expense and over two usual weeks) are
 *                    left out of every month, this one too, and listed.
 *   pace             (variable + 7 · historyDaily) / (days elapsed + 7): the history counts as a
 *                    week of data, so at the start of the month it weighs more and by the end the
 *                    month itself does. Without history, monthDaily alone (`fewData`).
 *   projectedEnd     available − pending − pace · daysLeft
 *   maxDaily         (available − pending) / daysLeft, never below zero.
 */

/** Days of history the usual pace weighs as, against the days elapsed of the month. */
export const HISTORY_WEIGHT_DAYS = 7;
/** Complete months looked back at. */
export const HISTORY_MONTHS = 6;
/** A month spending above this many times the median is left out of the average. */
export const OUTLIER_FACTOR = 3;
/**
 * A single expense is a one-off («gasto puntual») above this many times the typical expense and
 * above this many usual weeks of spending.
 */
export const ONE_OFF_FACTOR = 3;
export const ONE_OFF_WEEKS = 2;
/** Less margin than this many days of the usual pace is «tight». */
export const TIGHT_DAYS = 3;
/** Below this, the card asks for more data instead of guessing. */
export const ENOUGH_MOVEMENTS = 5;
export const ENOUGH_DAYS = 7;
/** A month needs this many days of data to say what a usual day costs. */
const MIN_MONTH_DAYS = 7;

/** Moving money between one's own accounts is not spending. */
const OWN_TRANSFER_WORDS = [
  'traspaso',
  'entre cuentas',
  'cuenta propia',
  'cuentas propias',
  'mismo titular',
  'transferencia propia',
  'own account',
  'between accounts',
];
/** Money put aside, even when it was recorded as an expense. */
const SAVING_CATEGORIES = new Set(['ahorro', 'ahorros', 'inversiones', 'inversion', 'savings']);

export interface EomMovement {
  description: string;
  amountCents: Cents;
  /** YYYY-MM-DD */
  date: string;
  type: string;
  recurringRuleId: string | null;
  categoryName: string;
}

export interface EomPastPeriod {
  year: number;
  month: number;
  start: string;
  end: string;
  movements: EomMovement[];
}

export interface EomSubscription {
  key: string;
  description: string;
  amountCents: Cents;
  lastDate: string;
  nextDate: string;
}

export interface EomInput {
  availableCents: Cents;
  /** Today, already inside the period. */
  today: string;
  periodStart: string;
  periodEnd: string;
  /** Movements of the current period. */
  movements: EomMovement[];
  /** Earlier complete periods, the most recent first. */
  history: EomPastPeriod[];
  subscriptions: EomSubscription[];
  /** Names of the active automatic operations (their charges are not variable spending). */
  ruleKeys: ReadonlySet<string>;
  /** Date of the user's first movement, if any. */
  firstDate: string | null;
  /** Every movement of the user. */
  totalMovements: number;
}

export interface EomPayment {
  description: string;
  date: string;
  amountCents: Cents;
}

export type EomStatus = 'ok' | 'tight' | 'short';

export interface EndOfMonthPlan {
  /** At least 5 movements and 7 days of data: otherwise the card asks for more. */
  enoughData: boolean;
  /** No earlier month to compare with: only this month's pace. */
  fewData: boolean;
  availableCents: Cents;
  daysLeft: number;
  daysElapsed: number;
  monthVariableCents: Cents;
  monthDailyCents: Cents;
  historyDailyCents: Cents | null;
  /** Complete months the history average is made of. */
  historyMonths: number;
  paceCents: Cents;
  pending: EomPayment[];
  pendingCents: Cents;
  /** Expenses already recorded with a later date this month (already in `available`). */
  scheduled: EomPayment[];
  scheduledCents: Cents;
  /** Single large expenses left out of the pace. */
  oneOffs: EomPayment[];
  /** Months left out of the average for spending far above the usual. */
  outlierMonths: { year: number; month: number }[];
  projectedEndCents: Cents;
  maxDailyCents: Cents;
  status: EomStatus;
}

const textOf = (m: EomMovement): string => normalizeText(m.description);

export function isOwnTransfer(m: EomMovement): boolean {
  const text = textOf(m);
  return (
    normalizeText(m.categoryName) === 'traspasos' ||
    OWN_TRANSFER_WORDS.some((w) => text.includes(w))
  );
}

/** Expenses that tell the everyday pace: not recurring, not a transfer, not savings. */
function everyday(
  movements: EomMovement[],
  recurringKeys: ReadonlySet<string>,
  upTo: string
): EomMovement[] {
  return movements.filter(
    (m) =>
      m.type === 'EXPENSE' &&
      m.date <= upTo &&
      m.recurringRuleId === null &&
      !recurringKeys.has(subscriptionKey(m.description)) &&
      !SAVING_CATEGORIES.has(normalizeText(m.categoryName)) &&
      !isOwnTransfer(m)
  );
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const later = (a: string, b: string): string => (a > b ? a : b);
const sum = (list: { amountCents: Cents }[]): Cents => list.reduce((s, m) => s + m.amountCents, 0);
const payment = (m: EomMovement | EomSubscription, date: string): EomPayment => ({
  description: m.description,
  date,
  amountCents: m.amountCents,
});

interface UsableMonth {
  year: number;
  month: number;
  days: number;
  expenses: EomMovement[];
}

/** «Can I reach the end of the month, and what could be left?», from the user's movements. */
export function planEndOfMonth(input: EomInput): EndOfMonthPlan {
  const { today, periodStart, periodEnd } = input;
  const daysLeft = inclusiveDays(today, periodEnd);
  const firstDate = input.firstDate ?? periodStart;
  const daysElapsed = inclusiveDays(later(periodStart, firstDate), today);
  const recurringKeys = new Set([...input.ruleKeys, ...input.subscriptions.map((s) => s.key)]);

  // Complete months with a week of data or more, the most recent first.
  const months: UsableMonth[] = input.history
    .filter((p) => p.movements.length > 0)
    .map((p) => ({
      year: p.year,
      month: p.month,
      days: inclusiveDays(later(p.start, firstDate), p.end),
      expenses: everyday(p.movements, recurringKeys, p.end),
    }))
    .filter((m) => m.days >= MIN_MONTH_DAYS)
    .slice(0, HISTORY_MONTHS);

  // One-offs: a single expense over 3× the typical one and over two usual weeks (raw history).
  const monthExpenses = everyday(input.movements, recurringKeys, today);
  const rawMedian = months.length ? median(months.map((m) => sum(m.expenses) / m.days)) : 0;
  const amounts = [...months.flatMap((m) => m.expenses), ...monthExpenses].map(
    (m) => m.amountCents
  );
  const oneOffLimit =
    rawMedian > 0
      ? Math.max(median(amounts) * ONE_OFF_FACTOR, rawMedian * 7 * ONE_OFF_WEEKS)
      : Infinity;
  const isOneOff = (m: EomMovement): boolean => m.amountCents > oneOffLimit;

  const rates = months.map((m) => ({
    ...m,
    rate: sum(m.expenses.filter((e) => !isOneOff(e))) / m.days,
  }));
  const usualRate = rates.length ? median(rates.map((r) => r.rate)) : 0;
  const outliers =
    rates.length >= 3 && usualRate > 0
      ? rates.filter((r) => r.rate > usualRate * OUTLIER_FACTOR)
      : [];
  const kept = rates.filter((r) => !outliers.includes(r));
  const historyDaily = kept.length ? kept.reduce((s, r) => s + r.rate, 0) / kept.length : null;

  const monthVariableCents = sum(monthExpenses.filter((e) => !isOneOff(e)));
  const pace =
    historyDaily === null
      ? monthVariableCents / daysElapsed
      : (monthVariableCents + HISTORY_WEIGHT_DAYS * historyDaily) /
        (daysElapsed + HISTORY_WEIGHT_DAYS);
  const paceCents = Math.round(pace);

  const pending = input.subscriptions
    .filter((s) => s.lastDate < periodStart && s.nextDate >= today && s.nextDate <= periodEnd)
    .map((s) => payment(s, s.nextDate))
    .sort((a, b) => a.date.localeCompare(b.date) || b.amountCents - a.amountCents);
  const pendingCents = sum(pending);
  const scheduled = input.movements
    .filter((m) => m.type === 'EXPENSE' && m.date > today)
    .map((m) => payment(m, m.date))
    .sort((a, b) => a.date.localeCompare(b.date) || b.amountCents - a.amountCents);
  const oneOffs = [...months.flatMap((m) => m.expenses), ...monthExpenses]
    .filter(isOneOff)
    .map((m) => payment(m, m.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  const free = input.availableCents - pendingCents;
  const projectedEndCents = free - paceCents * daysLeft;
  const firstDays = input.firstDate ? inclusiveDays(input.firstDate, today) : 0;
  return {
    enoughData: input.totalMovements >= ENOUGH_MOVEMENTS && firstDays >= ENOUGH_DAYS,
    fewData: historyDaily === null,
    availableCents: input.availableCents,
    daysLeft,
    daysElapsed,
    monthVariableCents,
    monthDailyCents: Math.round(monthVariableCents / daysElapsed),
    historyDailyCents: historyDaily === null ? null : Math.round(historyDaily),
    historyMonths: kept.length,
    paceCents,
    pending,
    pendingCents,
    scheduled,
    scheduledCents: sum(scheduled),
    oneOffs,
    outlierMonths: outliers.map((o) => ({ year: o.year, month: o.month })),
    projectedEndCents,
    maxDailyCents: Math.max(0, Math.floor(free / daysLeft)),
    status:
      projectedEndCents < 0 ? 'short' : projectedEndCents < paceCents * TIGHT_DAYS ? 'tight' : 'ok',
  };
}

/** The calendar day in Spain (Europe/Madrid) at an instant, as YYYY-MM-DD. */
export function madridDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${part.year}-${part.month}-${part.day}`;
}
