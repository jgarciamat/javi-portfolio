import { round2 } from '@modules/tools/domain/round';

describe('round2: to the cent, half away from zero', () => {
  it('rounds the half cents up that Math.round gets wrong in binary', () => {
    // Case 13 of the bank (docs/casos-practicos): State quota of 4,757.355 is 4,757.36 in the draft.
    expect(Math.round(4757.355 * 100) / 100).toBe(4757.35);
    expect(round2(4757.355)).toBe(4757.36);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.255)).toBe(1.26);
    expect(round2(0.285)).toBe(0.29);
    expect(round2(142.465)).toBe(142.47);
  });

  it('keeps what is below half a cent and rounds the rest', () => {
    expect(round2(257.734)).toBe(257.73);
    expect(round2(257.7358)).toBe(257.74);
    expect(round2(284.934585)).toBe(284.93);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1356)).toBe(1356);
  });

  it('is symmetric for negative amounts and gives no negative zero', () => {
    expect(round2(-4757.355)).toBe(-4757.36);
    expect(round2(-1.004)).toBe(-1);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
    expect(Object.is(round2(-1e-9), 0)).toBe(true);
  });

  it('leaves alone what has no cents to round', () => {
    expect(round2(Infinity)).toBe(Infinity);
    expect(round2(Number.NaN)).toBeNaN();
    expect(round2(1e15)).toBe(1e15);
    expect(round2(123456789012.345)).toBe(123456789012.35);
  });
});
