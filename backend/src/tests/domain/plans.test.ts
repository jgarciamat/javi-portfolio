import { freeDraftQuarters, quarterOf } from '@domain/services/plans';

describe('quarters the free plan can draft', () => {
  const at = (iso: string) => freeDraftQuarters(new Date(iso));

  it('adds the quarter just ended while its filing window is open', () => {
    expect(at('2026-04-01T08:00:00Z')).toEqual([
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
    ]);
    // 23:30 of 20 April in the Canary Islands (00:30 of the 21st in Madrid): still in time there.
    expect(at('2026-04-20T22:30:00Z')).toHaveLength(2);
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
    // 31 January 2026 is a Saturday after the last day (Friday the 30th).
    expect(at('2026-01-31T10:00:00Z')).toEqual([{ year: 2026, quarter: 1 }]);
    expect(at('2026-05-05T10:00:00Z')).toEqual([{ year: 2026, quarter: 2 }]);
    expect(at('2026-12-10T10:00:00Z')).toEqual([{ year: 2026, quarter: 4 }]);
  });
});

describe('the free plan on the real last day of each filing window', () => {
  const at = (iso: string) => freeDraftQuarters(new Date(iso));
  const ended = (iso: string) => at(iso)[1] ?? null;

  // Deadlines of 2026 and 2027 worked out by hand from the calendar: 20 April 2026 is a Monday,
  // 20 July a Monday, 20 October a Tuesday, 20 January 2027 a Wednesday, 30 January 2027 a
  // Saturday (so the 303 and 130 of the fourth quarter move to Monday 1 February 2027).
  it('keeps the quarter just ended until its last day, at noon in Madrid', () => {
    expect(ended('2026-04-20T10:00:00Z')).toEqual({ year: 2026, quarter: 1 });
    expect(ended('2026-04-21T10:00:00Z')).toBeNull();
    expect(ended('2026-07-20T10:00:00Z')).toEqual({ year: 2026, quarter: 2 });
    expect(ended('2026-07-21T10:00:00Z')).toBeNull();
    expect(ended('2026-10-20T10:00:00Z')).toEqual({ year: 2026, quarter: 3 });
    expect(ended('2026-10-21T10:00:00Z')).toBeNull();
    expect(ended('2027-01-20T11:00:00Z')).toEqual({ year: 2026, quarter: 4 });
    expect(ended('2027-01-30T11:00:00Z')).toEqual({ year: 2026, quarter: 4 });
    expect(ended('2027-01-31T11:00:00Z')).toEqual({ year: 2026, quarter: 4 });
  });

  it('lets the fourth quarter of 2026 be drafted on 1 February 2027, not on the 2nd', () => {
    expect(at('2027-02-01T11:00:00Z')).toEqual([
      { year: 2027, quarter: 1 },
      { year: 2026, quarter: 4 },
    ]);
    expect(at('2027-02-02T11:00:00Z')).toEqual([{ year: 2027, quarter: 1 }]);
  });

  it('takes the day of mainland Spain, or of the Canary Islands while it is still in time there', () => {
    // 23:30 UTC of 1 February 2027: 00:30 of the 2nd in Madrid, 23:30 of the 1st in the Canaries.
    expect(at('2027-02-01T23:30:00Z')).toHaveLength(2);
    // 00:30 UTC of 2 February: the 2nd everywhere.
    expect(at('2027-02-02T00:30:00Z')).toEqual([{ year: 2027, quarter: 1 }]);
    // 23:30 UTC of 31 March 2026: 1 April in Madrid (second quarter), 31 March in the Canaries.
    expect(at('2026-03-31T22:30:00Z')).toEqual([
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
    ]);
  });
});

describe('the quarter of a date', () => {
  it('is that of the day in mainland Spain', () => {
    // 22:30 UTC of 31 March 2026 is 00:30 of 1 April in Madrid (summer time).
    expect(quarterOf(new Date('2026-03-31T22:30:00Z'))).toEqual({ year: 2026, quarter: 2 });
    expect(quarterOf(new Date('2026-03-31T21:30:00Z'))).toEqual({ year: 2026, quarter: 1 });
  });
});
