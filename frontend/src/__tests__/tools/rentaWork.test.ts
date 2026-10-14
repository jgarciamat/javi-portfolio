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

  it('is zero for a net income that makes no sense', () => {
    expect(reduction(-1)).toBe(0);
    expect(reduction(Number.NaN)).toBe(0);
  });
});
