import {
  MAX_MONTHS_AHEAD,
  MIN_YEAR,
  addMonths,
  comparePeriods,
  isBeyondHorizon,
  isNextButtonDisabled,
  isPrevButtonDisabled,
  maxPeriod,
} from '@modules/finances/domain/nextMonthLogic';

const current = { year: 2026, month: 3 };

describe('month arithmetic', () => {
  it('adds months across years in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(comparePeriods({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBe(1);
  });

  it('plans up to MAX_MONTHS_AHEAD after the current period', () => {
    expect(maxPeriod(current)).toEqual({ year: 2027, month: 3 });
    expect(MAX_MONTHS_AHEAD).toBe(12);
  });
});

describe('navigation limits', () => {
  it('stops "next" at the horizon and hides months beyond it', () => {
    expect(isNextButtonDisabled(2027, 2, current)).toBe(false);
    expect(isNextButtonDisabled(2027, 3, current)).toBe(true);
    expect(isBeyondHorizon(2027, 3, current)).toBe(false);
    expect(isBeyondHorizon(2027, 4, current)).toBe(true);
  });

  it('stops "previous" at January of MIN_YEAR', () => {
    expect(isPrevButtonDisabled(MIN_YEAR, 2)).toBe(false);
    expect(isPrevButtonDisabled(MIN_YEAR, 1)).toBe(true);
    expect(isPrevButtonDisabled(MIN_YEAR - 1, 12)).toBe(true);
  });
});
