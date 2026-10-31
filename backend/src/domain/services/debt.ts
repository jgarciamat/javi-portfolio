import { Cents } from '@domain/shared/money';

/**
 * What is owed on a debt that is paid every month (docs: README, «Deudas que se pagan solas»).
 *
 * The owed amount is never stored after each payment: it is worked out from
 *   - the values the person wrote down (each one is the truth on its date), and
 *   - the payments of the debt's automatic operation after the latest of those values.
 * So generating the movements again, removing one or editing its amount changes the result
 * accordingly, and nothing can be counted twice.
 *
 * With a yearly interest rate each payment first pays that month's interest (what is owed × rate
 * / 12) and the rest lowers what is owed, as a French-style loan does; without one, the whole
 * payment lowers it. Either way it is an estimate: the person can correct it with a new value.
 */

export const DEBT_TYPES = ['mortgage', 'personal', 'car', 'card', 'other'] as const;
export type DebtType = (typeof DEBT_TYPES)[number];

/** Longest payoff we project (50 years): beyond that the payment does not really pay it. */
export const MAX_PROJECTED_PAYMENTS = 600;

export interface DatedValue {
  date: string;
  valueCents: Cents;
}

export interface DebtPayment {
  date: string;
  amountCents: Cents;
}

/** One month of interest on `owedCents` at a yearly rate in percent (none without a rate). */
export function monthlyInterest(owedCents: Cents, ratePct: number | null): Cents {
  return ratePct ? Math.round((owedCents * ratePct) / 1200) : 0;
}

/** The latest value written down on or before `date` (null before the first one). */
function anchorAt(values: DatedValue[], date: string): DatedValue | null {
  let found: DatedValue | null = null;
  for (const v of values) {
    if (v.date <= date && (!found || v.date >= found.date)) found = v;
  }
  return found;
}

/** Applies one payment: interest first, the rest lowers what is owed (never below zero). */
function afterPayment(owedCents: Cents, amountCents: Cents, ratePct: number | null): Cents {
  return Math.max(0, owedCents + monthlyInterest(owedCents, ratePct) - amountCents);
}

/**
 * What is owed at the end of `date`: the latest value up to that day minus the payments after
 * it, up to that day included (a payment on the same day as a value is already in the value).
 */
export function debtOwedAt(
  values: DatedValue[],
  payments: DebtPayment[],
  ratePct: number | null,
  date: string
): Cents {
  const anchor = anchorAt(values, date);
  if (!anchor) return 0;
  return [...payments]
    .filter((p) => p.date > anchor.date && p.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((owed, p) => afterPayment(owed, p.amountCents, ratePct), anchor.valueCents);
}

/**
 * The most a payment on `date` can be: what is owed just before it plus that month's interest
 * (0 when nothing is owed, so no payment is due).
 */
export function debtDueOn(
  values: DatedValue[],
  payments: DebtPayment[],
  ratePct: number | null,
  date: string
): Cents {
  const before = debtOwedAt(
    values,
    payments.filter((p) => p.date < date),
    ratePct,
    date
  );
  return before + monthlyInterest(before, ratePct);
}

/**
 * How many more monthly payments of `installmentCents` pay off `owedCents` (0 if nothing is
 * owed; null if the payment does not cover the interest, or it would take over 50 years).
 */
export function paymentsToPayOff(
  owedCents: Cents,
  ratePct: number | null,
  installmentCents: Cents
): number | null {
  let owed = owedCents;
  for (let n = 0; n <= MAX_PROJECTED_PAYMENTS; n++) {
    if (owed <= 0) return n;
    const next = afterPayment(owed, installmentCents, ratePct);
    if (next >= owed) return null;
    owed = next;
  }
  return null;
}

/** True if the monthly payment is more than that month's interest (the debt goes down). */
export function coversInterest(
  owedCents: Cents,
  ratePct: number | null,
  installmentCents: Cents
): boolean {
  return owedCents <= 0 || installmentCents > monthlyInterest(owedCents, ratePct);
}
