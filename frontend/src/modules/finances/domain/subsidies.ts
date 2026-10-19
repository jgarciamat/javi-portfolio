import type { DepreciationYear } from './depreciation';

/**
 * Grants and public aid received by an activity, and when they count as its income.
 *
 * Sources (checked on 19 October 2026; Manual práctico de Renta 2025, capítulo 7, «ingresos
 * íntegros»; Renta boxes 0173 and 0174):
 * - Current grants (operating aid, the basic payment of the CAP…): income of the year they accrue.
 * - Capital grants (to buy an asset): income in the same proportion as the asset is depreciated each
 *   year; one that finances land or another asset that is not depreciated counts when it is sold or
 *   written down, which is not worked out here.
 * - Aid for the first installation of young farmers: a quarter of it in the year it is obtained and in
 *   each of the next three (art. 14.2.i LIRPF).
 * - Aid of the 5th additional provision of the LIRPF (giving up some crops or fishing, destruction by
 *   fire or flood…): a capital gain that is not taxed, outside the activity.
 */

export const SUBSIDY_KINDS = ['current', 'capital', 'youngFarmer', 'exempt'] as const;
export type SubsidyKind = (typeof SUBSIDY_KINDS)[number];

export interface Subsidy {
  name: string;
  kind: SubsidyKind;
  amount: number;
  /** Year it accrued (or was obtained). */
  year: number;
  /** Quarter it accrued, 1-4. */
  quarter: number;
  /** Capital grant: the index of the asset it financed (null: none, e.g. land). */
  asset?: number | null;
}

export interface SubsidyYear {
  /** Box 0173: current grants and the part of the young farmers' aid of the year. */
  current: number;
  /** Box 0174: the capital grants imputed by the depreciation. */
  capital: number;
  /** DA 5.ª LIRPF: received this year and not taxed. */
  exempt: number;
  /** What goes to each quarter (current and capital together), and the capital part of it. */
  quarters: [number, number, number, number];
  capitalQuarters: [number, number, number, number];
  /** Capital grants without a depreciated asset (counted when it is sold). */
  unassigned: number;
}

/** Aid for young farmers: four years, a quarter each. */
export const YOUNG_FARMER_YEARS = 4;

const cents = (euros: number) => Math.round(euros * 100);
const quarterIndex = (q: number) => Math.min(3, Math.max(0, Math.round(q) - 1));

/** Running totals in cents. */
interface Totals {
  quarters: number[];
  capitalQuarters: number[];
  current: number;
  capital: number;
  exempt: number;
  unassigned: number;
}

type Handler = (t: Totals, s: Subsidy, amount: number, year: number, dep: DepreciationYear) => void;

const HANDLERS: Record<SubsidyKind, Handler> = {
  current: (t, s, amount, year) => {
    if (s.year !== year) return;
    t.current += amount;
    t.quarters[quarterIndex(s.quarter)] += amount;
  },
  exempt: (t, s, amount, year) => {
    if (s.year === year) t.exempt += amount;
  },
  youngFarmer: (t, s, amount, year) => {
    if (year < s.year || year >= s.year + YOUNG_FARMER_YEARS) return;
    // The last of the four years takes the cents left by the division.
    const fourth = Math.round(amount / YOUNG_FARMER_YEARS);
    const part =
      year === s.year + YOUNG_FARMER_YEARS - 1
        ? amount - fourth * (YOUNG_FARMER_YEARS - 1)
        : fourth;
    t.current += part;
    t.quarters[year === s.year ? quarterIndex(s.quarter) : 0] += part;
  },
  capital: (t, s, amount, year, dep) => {
    const row = dep.assets.find((a) => a.index === s.asset);
    if (!row || row.base <= 0) {
      if (s.year === year) t.unassigned += amount;
      return;
    }
    // The same share of the grant as the share of the asset depreciated in each quarter.
    let depreciated = 0;
    let before = 0;
    for (let i = 0; i < 4; i++) {
      depreciated += cents(row.quarters[i]);
      const upTo = Math.round((amount * depreciated) / cents(row.base));
      t.quarters[i] += upTo - before;
      t.capitalQuarters[i] += upTo - before;
      t.capital += upTo - before;
      before = upTo;
    }
  },
};

/** The grants of a year as income of the activity, quarter by quarter. */
export function subsidyYear(
  subsidies: Subsidy[],
  year: number,
  depreciation: DepreciationYear
): SubsidyYear {
  const t: Totals = {
    quarters: [0, 0, 0, 0],
    capitalQuarters: [0, 0, 0, 0],
    current: 0,
    capital: 0,
    exempt: 0,
    unassigned: 0,
  };
  for (const s of subsidies) {
    const amount = cents(s.amount);
    if (amount > 0) HANDLERS[s.kind](t, s, amount, year, depreciation);
  }
  return {
    current: t.current / 100,
    capital: t.capital / 100,
    exempt: t.exempt / 100,
    quarters: t.quarters.map((q) => q / 100) as SubsidyYear['quarters'],
    capitalQuarters: t.capitalQuarters.map((q) => q / 100) as SubsidyYear['quarters'],
    unassigned: t.unassigned / 100,
  };
}
