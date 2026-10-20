import { filingQuarter, freeDraftQuarters } from '@modules/finances/domain/autonomoQuarters';

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

describe('the quarter the draft opens on', () => {
  const at = (y: number, m: number, d: number) => filingQuarter(new Date(y, m - 1, d, 12));

  it('is the one just ended during its filing window, else the current one, month by month', () => {
    // [month, quarter on day 1, quarter on the last day]: the window ends on the 20th (30 January).
    const months: [number, [number, number], [number, number]][] = [
      [1, [2025, 4], [2026, 1]],
      [2, [2026, 1], [2026, 1]],
      [3, [2026, 1], [2026, 1]],
      [4, [2026, 1], [2026, 2]],
      [5, [2026, 2], [2026, 2]],
      [6, [2026, 2], [2026, 2]],
      [7, [2026, 2], [2026, 3]],
      [8, [2026, 3], [2026, 3]],
      [9, [2026, 3], [2026, 3]],
      [10, [2026, 3], [2026, 4]],
      [11, [2026, 4], [2026, 4]],
      [12, [2026, 4], [2026, 4]],
    ];
    for (const [month, first, last] of months) {
      expect(at(2026, month, 1)).toEqual({ year: first[0], quarter: first[1] });
      const lastDay = new Date(2026, month, 0).getDate();
      expect(at(2026, month, lastDay)).toEqual({ year: last[0], quarter: last[1] });
    }
  });

  it('changes the day after the last day of each filing window', () => {
    expect(at(2026, 1, 30)).toEqual({ year: 2025, quarter: 4 });
    expect(at(2026, 1, 31)).toEqual({ year: 2026, quarter: 1 });
    expect(at(2026, 4, 20)).toEqual({ year: 2026, quarter: 1 });
    expect(at(2026, 4, 21)).toEqual({ year: 2026, quarter: 2 });
    expect(at(2026, 7, 20)).toEqual({ year: 2026, quarter: 2 });
    expect(at(2026, 7, 21)).toEqual({ year: 2026, quarter: 3 });
    expect(at(2026, 10, 20)).toEqual({ year: 2026, quarter: 3 });
    expect(at(2026, 10, 21)).toEqual({ year: 2026, quarter: 4 });
  });

  it('is always one the free plan can draft (the rule of the API, backend plans.ts)', () => {
    // backend/src/domain/services/plans.ts freeDraftQuarters: the current quarter and, until the
    // 20th (30 January), the one just ended. Every day of two years, the draft opens on one of them.
    for (let day = 0; day < 731; day++) {
      const date = new Date(2026, 0, 1 + day, 12);
      expect(freeDraftQuarters(date)).toContainEqual(filingQuarter(date));
    }
  });
});
