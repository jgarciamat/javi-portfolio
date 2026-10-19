import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { rentaState } from '@modules/tools/data/renta/state';

describe('workReductionOf', () => {
  const reduction = workReductionOf(rentaState);

  it('gives the full reduction for a low net income', () => {
    expect(reduction(0)).toBe(7302);
    expect(reduction(14852)).toBe(7302);
  });

  it('goes down in two steps and ends at zero', () => {
    expect(reduction(16000)).toBe(5293.0);
    expect(reduction(17673.52)).toBeCloseTo(2364.34, 1);
    expect(reduction(18000)).toBe(1992.15);
    expect(reduction(19747.5)).toBe(0);
    expect(reduction(30000)).toBe(0);
  });

  it('rounds the slope times the excess before taking it off, as the AEAT draft', () => {
    // A real draft (rentaCompare.test.ts): 7,302 − 4,009.36 (1.75 × 2,291.06 = 4,009.355) = 3,292.64.
    expect(reduction(17143.06)).toBe(3292.64);
    // Case 09 of the bank: 7,302 − 2,258.38 (1.75 × 1,290.50 = 2,258.375) = 5,043.62.
    expect(reduction(16142.5)).toBe(5043.62);
  });

  it('is zero for a net income that makes no sense', () => {
    expect(reduction(-1)).toBe(0);
    expect(reduction(Number.NaN)).toBe(0);
  });
});
