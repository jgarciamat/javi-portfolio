import { freeDraftQuarters } from '@modules/finances/domain/autonomoQuarters';

describe('quarters a free account can draft', () => {
  const at = (iso: string) => freeDraftQuarters(new Date(iso));

  it('adds the quarter just ended while its filing window is open', () => {
    expect(at('2026-04-01T10:00:00')).toEqual([
      { year: 2026, quarter: 2 },
      { year: 2026, quarter: 1 },
    ]);
    expect(at('2026-07-20T10:00:00')[1]).toEqual({ year: 2026, quarter: 2 });
    expect(at('2026-10-20T10:00:00')[1]).toEqual({ year: 2026, quarter: 3 });
    expect(at('2027-01-30T10:00:00')).toEqual([
      { year: 2027, quarter: 1 },
      { year: 2026, quarter: 4 },
    ]);
  });

  it('only has the current quarter outside the filing windows', () => {
    expect(at('2026-04-21T10:00:00')).toEqual([{ year: 2026, quarter: 2 }]);
    expect(at('2027-01-31T10:00:00')).toEqual([{ year: 2027, quarter: 1 }]);
    expect(at('2026-08-05T10:00:00')).toEqual([{ year: 2026, quarter: 3 }]);
  });
});
