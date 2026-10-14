import type { RentaState } from './rentaData';

/** Where the first slope of the reduction ends, and what is left there (Tax Agency manual, Renta 2025). */
const KNEE_INCOME = 17673.52;
const KNEE_REDUCTION = 2364.34;
const FIRST_SLOPE = 1.75;
const SECOND_SLOPE = 1.14;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reduction of the net income from work for low incomes: the full amount up to a net income,
 * then it goes down in two steps to nothing. The State's figures set where it starts and ends.
 */
export function workReductionOf(state: RentaState): (netIncome: number) => number {
  const { maxReduction, fullUntil, zeroFrom } = state.workReduction;
  return (netIncome) => {
    if (!Number.isFinite(netIncome) || netIncome < 0) return 0;
    if (netIncome <= fullUntil) return maxReduction;
    if (netIncome <= KNEE_INCOME)
      return round2(maxReduction - FIRST_SLOPE * (netIncome - fullUntil));
    if (netIncome < zeroFrom)
      return round2(KNEE_REDUCTION - SECOND_SLOPE * (netIncome - KNEE_INCOME));
    return 0;
  };
}
