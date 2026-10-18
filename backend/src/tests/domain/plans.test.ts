import { freeDraftQuarters } from '@domain/services/plans';

describe('quarters the free plan can draft', () => {
  const at = (iso: string) => freeDraftQuarters(new Date(iso));

  it('adds the quarter just ended while its filing window is open', () => {
    expect(at('2026-04-01T08:00:00Z')).toEqual([
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
    ]);
    expect(at('2026-04-20T22:00:00Z')).toHaveLength(2);
    expect(at('2026-07-20T10:00:00Z')[1]).toEqual({ year: 2026, quarter: 2 });
    expect(at('2026-10-15T10:00:00Z')[1]).toEqual({ year: 2026, quarter: 3 });
    // The fourth quarter is filed until 30 January of the next year.
    expect(at('2027-01-30T10:00:00Z')).toEqual([
      { year: 2027, quarter: 1 },
      { year: 2026, quarter: 4 },
    ]);
  });

  it('only has the current quarter outside the filing windows', () => {
    expect(at('2026-04-21T10:00:00Z')).toEqual([{ year: 2026, quarter: 2 }]);
    expect(at('2027-01-31T10:00:00Z')).toEqual([{ year: 2027, quarter: 1 }]);
    expect(at('2026-05-05T10:00:00Z')).toEqual([{ year: 2026, quarter: 2 }]);
    expect(at('2026-12-10T10:00:00Z')).toEqual([{ year: 2026, quarter: 4 }]);
  });
});
