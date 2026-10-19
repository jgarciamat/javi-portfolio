import type { RentaState } from './rentaData';
import { round2 } from './round';

/** Where the first slope of the reduction ends, and what is left there (Tax Agency manual, Renta 2025). */
const KNEE_INCOME = 17673.52;
const KNEE_REDUCTION = 2364.34;
const FIRST_SLOPE = 1.75;
const SECOND_SLOPE = 1.14;

/**
 * Reduction of the net income from work for low incomes: the full amount up to a net income,
 * then it goes down in two steps to nothing. The State's figures set where it starts and ends.
 * The slope times the excess is rounded to the cent before it is taken off, as the AEAT's draft
 * does: 7,302 − 1.75 × 2,291.06 = 7,302 − 4,009.36 = 3,292.64 (box 0023 of a real draft, see
 * rentaCompare.test.ts), not 3,292.645 rounded up to 3,292.65.
 */
export function workReductionOf(state: RentaState): (netIncome: number) => number {
  const { maxReduction, fullUntil, zeroFrom } = state.workReduction;
  return (netIncome) => {
    if (!Number.isFinite(netIncome) || netIncome < 0) return 0;
    if (netIncome <= fullUntil) return maxReduction;
    if (netIncome <= KNEE_INCOME)
      return round2(maxReduction - round2(FIRST_SLOPE * (netIncome - fullUntil)));
    if (netIncome < zeroFrom)
      return round2(KNEE_REDUCTION - round2(SECOND_SLOPE * (netIncome - KNEE_INCOME)));
    return 0;
  };
}
