import { rentaAbatement, type RentaAbatement } from '../data/renta/abatimiento';
import { round2 } from './round';

/**
 * The reduction of the gains of assets bought before 31-12-1994 (LIRPF DT 9.ª, BOE-A-2006-20764,
 * checked 22-10-2026; rules in data/renta/abatimiento.ts). Only the part of the gain generated up
 * to 19-01-2006 is reduced, by a percent per year held up to 31-12-1996 over two, while the
 * transmission values since 2015 stay within 400,000 €.
 */

/** The coefficient that applies: property (11.11 %), listed shares (25 %) or the rest (14.28 %). */
export type AbatementKind = 'property' | 'listed' | 'other';

/** The part of a sale that can have the reduction (a lot of shares, the non-exempt part of a flat). */
export interface AbatementItem {
  kind: AbatementKind;
  /** Dates YYYY-MM-DD of the purchase and of the sale. */
  acquired: string;
  sold: string;
  /** Transmission value: it is what counts towards the 400,000 €. */
  proceeds: number;
  gain: number;
  /**
   * Rule 2.ª (listed securities and fund units): their value for the Wealth Tax of 2005 and the
   * acquisition value. Without it, the general rule by days (rule 1.ª).
   */
  ip2005?: number;
  cost?: number;
}

export interface AbatementResult {
  /** The gain generated up to 19-01-2006. */
  before: number;
  /** Years held up to 31-12-1996 and the percent they give. */
  years: number;
  percent: number;
  /** The part of `before` within the 400,000 € (letter d). */
  reducible: number;
  reduction: number;
  /** What this sale adds to the transmission values of the limit. */
  counted: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

/** Bought before 31-12-1994, with valid dates: the regime can apply. */
export const qualifies = (acquired: string, sold: string, rules: RentaAbatement = rentaAbatement) =>
  ISO.test(acquired) && ISO.test(sold) && acquired <= rules.acquiredUntil && sold > acquired;

/**
 * Days «entre la fecha de adquisición y el 19 de enero de 2006, ambos inclusive», and the days it
 * was held (from purchase to sale). The Manual's caso práctico 2 of c11 counts 4,049 and 11,151
 * days from 20-12-1994 to 01-07-2025, as here.
 */
export function daysOf(acquired: string, sold: string, rules: RentaAbatement = rentaAbatement) {
  const start = dayNumber(acquired);
  return {
    before: dayNumber(rules.generatedUntil) - start + 1,
    held: dayNumber(sold) - start,
  };
}

/** Years held up to 31-12-1996, rounded up (letter a). */
export function permanenceYears(acquired: string, rules: RentaAbatement = rentaAbatement): number {
  const [year] = acquired.split('-').map(Number);
  const [endYear] = rules.permanenceUntil.split('-').map(Number);
  // A whole number of years only when bought on 31 December; any other day rounds up.
  return endYear - year + (acquired.endsWith('-12-31') ? 0 : 1);
}

/** The percent of the reduction for the years held (letter c). */
export function abatementPercent(
  kind: AbatementKind,
  years: number,
  rules: RentaAbatement = rentaAbatement
): number {
  if (years > rules.wholeAbove[kind]) return 100;
  return round2(Math.max(0, years - 2) * rules.rates[kind]);
}

/** The gain generated up to 19-01-2006: by days (rule 1.ª) or with the 2005 value (rule 2.ª). */
export function generatedBefore(item: AbatementItem, rules: RentaAbatement = rentaAbatement) {
  if (!(item.gain > 0)) return 0;
  if (item.ip2005 !== undefined) {
    // 2.ª b): sold for less than the 2005 value, the whole gain is from before 2006.
    if (item.proceeds < item.ip2005) return round2(item.gain);
    return round2(Math.min(item.gain, Math.max(0, item.ip2005 - (item.cost ?? 0))));
  }
  const { before, held } = daysOf(item.acquired, item.sold, rules);
  return round2((item.gain * Math.min(before, held)) / held);
}

/** The reduction of one sale given the days before 2006 already worked out (`before`). */
export function reductionOf(
  item: AbatementItem,
  before: number,
  used: number,
  rules: RentaAbatement = rentaAbatement
): AbatementResult {
  const years = permanenceYears(item.acquired, rules);
  const percent = abatementPercent(item.kind, years, rules);
  const none = { before, years, percent, reducible: 0, reduction: 0, counted: 0 };
  if (!(before > 0) || !(item.proceeds > 0)) return none;
  // Letters c to e: the share of the value of this sale still under the 400,000 €.
  const room = Math.max(0, rules.limit - used);
  const share = Math.min(1, room / item.proceeds);
  const reducible = round2(before * share);
  return {
    ...none,
    reducible,
    reduction: round2((reducible * percent) / 100),
    counted: item.proceeds,
  };
}

/**
 * The reductions of the sales of the year, in the order they were sold, after `prior`: the
 * transmission values of earlier years since 2015 with the regime applied. A sale that does not
 * qualify (bought later, a loss) gets nothing and does not count.
 */
export function abate(
  items: AbatementItem[],
  prior = 0,
  rules: RentaAbatement = rentaAbatement
): AbatementResult[] {
  const order = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => a.item.sold.localeCompare(b.item.sold));
  const out: AbatementResult[] = new Array(items.length);
  let used = Math.max(0, prior);
  for (const { item, i } of order) {
    const before = qualifies(item.acquired, item.sold, rules) ? generatedBefore(item, rules) : 0;
    out[i] = reductionOf(item, before, used, rules);
    used += out[i].counted;
  }
  return out;
}
