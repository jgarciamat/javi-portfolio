import { housingBaseOf } from '@modules/tools/domain/rentaHousing';

describe('the wealth check of the home bought before 2013 (DT 18.ª, art. 70)', () => {
  it('keeps the whole base when the wealth grows by what was invested', () => {
    expect(housingBaseOf(9000, { start: 10000, end: 20000, interest: 1000 })).toEqual({
      increase: 10000,
      base: 9000,
    });
  });

  it('keeps only the interest when the wealth did not grow', () => {
    expect(housingBaseOf(9000, { start: 20000, end: 15000, interest: 1000 })).toEqual({
      increase: -5000,
      base: 1000,
    });
  });

  it('never counts more interest than what was paid', () => {
    expect(housingBaseOf(500, { start: 0, end: 0, interest: 900 }).base).toBe(500);
    // Nothing paid (or a figure that is not one): no base.
    expect(housingBaseOf(Number.NaN, { start: 0, end: 100, interest: 0 }).base).toBe(0);
  });
});
