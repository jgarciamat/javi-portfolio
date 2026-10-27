import { Cents } from '@domain/shared/money';
import { normalizeText } from '@domain/shared/text';
import { isEssential } from './money-leaks';

export type SubscriptionCadence = 'monthly' | 'yearly';

export interface SubscriptionCandidate {
  description: string;
  amountCents: Cents;
  /** YYYY-MM-DD */
  date: string;
  type: string;
  recurringRuleId: string | null;
  /** Category of the movement (tells a fixed charge, like the rent, from a subscription). */
  categoryName?: string;
}

export interface DetectedSubscription {
  /** Normalised name the charges were grouped by. */
  key: string;
  /** Description of the latest charge. */
  description: string;
  cadence: SubscriptionCadence;
  /** Latest charge. */
  amountCents: Cents;
  annualCostCents: Cents;
  count: number;
  lastDate: string;
  /** When the next charge is expected. */
  nextDate: string;
  /** Set when the latest charge is higher than the one before. */
  priceIncrease: { fromCents: Cents; toCents: Cents } | null;
  /** Category of the latest charge, when known. */
  categoryName: string | null;
  /** A fixed charge of life (rent, power, insurance, a loan…) rather than a subscription. */
  essential: boolean;
}

export interface SubscriptionReport {
  subscriptions: DetectedSubscription[];
  /** What they cost in an average month and in a year. */
  monthlyCents: Cents;
  annualCents: Cents;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A charge counts as a price increase from this much on (rounding noise is ignored). */
const INCREASE_THRESHOLD = 1.03;
/** Charges that differ more than this from the latest are not the same subscription. */
const AMOUNT_TOLERANCE = 0.25;

const RANGES: Record<SubscriptionCadence, { min: number; max: number; charges: number }> = {
  monthly: { min: 24, max: 37, charges: 3 },
  yearly: { min: 350, max: 380, charges: 2 },
};
/** How long after the last charge a subscription is still considered active. */
const ACTIVE_DAYS: Record<SubscriptionCadence, number> = { monthly: 65, yearly: 400 };
const CADENCE_DAYS: Record<SubscriptionCadence, number> = { monthly: 30, yearly: 365 };

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Name used to group charges: no accents, digits, references or punctuation. */
export function subscriptionKey(description: string): string {
  return normalizeText(description)
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

function cadenceOf(dates: string[]): SubscriptionCadence | null {
  // Each date is read once and a gap out of range stops the check (a supermarket bought from
  // thousands of times fails at its first gap).
  const days = dates.map(dayNumber);
  const steady = (min: number, max: number): boolean => {
    for (let i = 1; i < days.length; i++) {
      const gap = days[i] - days[i - 1];
      if (gap < min || gap > max) return false;
    }
    return true;
  };
  for (const cadence of ['monthly', 'yearly'] as const) {
    const { min, max, charges } = RANGES[cadence];
    if (dates.length >= charges && steady(min, max)) return cadence;
  }
  return null;
}

/**
 * Finds charges that repeat like a subscription (same name, steady amount, monthly or
 * yearly rhythm) among the movements that are not already a recurring rule.
 */
export function detectSubscriptions(
  items: SubscriptionCandidate[],
  options: { today: string; coveredKeys: ReadonlySet<string> }
): SubscriptionReport {
  const groups = new Map<string, SubscriptionCandidate[]>();
  for (const item of items) {
    if (item.type !== 'EXPENSE' || item.recurringRuleId !== null) continue;
    const key = subscriptionKey(item.description);
    if (key.length < 3 || options.coveredKeys.has(key)) continue;
    // In place: copying the group on every charge was quadratic with thousands of them.
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const found: DetectedSubscription[] = [];
  for (const [key, group] of groups) {
    // YYYY-MM-DD: plain string order is date order (and much quicker than localeCompare).
    const charges = [...group].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const cadence = cadenceOf(charges.map((c) => c.date));
    if (!cadence) continue;
    const latest = charges[charges.length - 1];
    const steady = charges.every(
      (c) => Math.abs(c.amountCents - latest.amountCents) <= latest.amountCents * AMOUNT_TOLERANCE
    );
    const active = dayNumber(options.today) - dayNumber(latest.date) <= ACTIVE_DAYS[cadence];
    if (!steady || !active) continue;
    const previous = charges[charges.length - 2];
    found.push({
      key,
      description: latest.description,
      cadence,
      amountCents: latest.amountCents,
      annualCostCents: cadence === 'monthly' ? latest.amountCents * 12 : latest.amountCents,
      count: charges.length,
      lastDate: latest.date,
      nextDate: addDays(latest.date, CADENCE_DAYS[cadence]),
      priceIncrease:
        latest.amountCents > previous.amountCents * INCREASE_THRESHOLD
          ? { fromCents: previous.amountCents, toCents: latest.amountCents }
          : null,
      categoryName: latest.categoryName ?? null,
      essential: isEssential(latest.description, latest.categoryName ?? ''),
    });
  }

  found.sort((a, b) => b.annualCostCents - a.annualCostCents || a.key.localeCompare(b.key));
  const annualCents = found.reduce((sum, s) => sum + s.annualCostCents, 0);
  return { subscriptions: found, monthlyCents: Math.round(annualCents / 12), annualCents };
}
