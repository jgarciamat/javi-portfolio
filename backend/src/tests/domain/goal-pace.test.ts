import { computeGoalPace } from '@domain/model/Goal';
import { periodOrdinal } from '@domain/shared/period';

// Made-up savings of a goal, by period.
const savings = (entries: [year: number, month: number, euros: number][]) =>
  new Map(entries.map(([year, month, euros]) => [periodOrdinal({ year, month }), euros * 100]));
const OCTOBER = { year: 2026, month: 10 };

describe('computeGoalPace', () => {
  it('averages the last 6 complete periods, counting the months with nothing', () => {
    const pace = computeGoalPace(
      savings([
        [2026, 1, 500],
        [2026, 4, 150],
        [2026, 5, 100],
        [2026, 7, 200],
        [2026, 8, 120],
        [2026, 9, 150],
        [2026, 10, 80],
      ]),
      OCTOBER
    );
    expect(pace).toEqual({
      averageMonthlyCents: 12000,
      historyMonths: 6,
      savedThisPeriodCents: 8000,
    });
  });

  it('starts at the first saving and needs two complete periods', () => {
    expect(computeGoalPace(savings([[2026, 8, 100]]), OCTOBER)).toEqual({
      averageMonthlyCents: 5000,
      historyMonths: 2,
      savedThisPeriodCents: 0,
    });
    expect(computeGoalPace(savings([[2026, 9, 100]]), OCTOBER)).toEqual({
      averageMonthlyCents: null,
      historyMonths: 1,
      savedThisPeriodCents: 0,
    });
    expect(computeGoalPace(savings([[2026, 10, 100]]), OCTOBER)).toEqual({
      averageMonthlyCents: null,
      historyMonths: 0,
      savedThisPeriodCents: 10000,
    });
    expect(computeGoalPace(new Map(), OCTOBER)).toEqual({
      averageMonthlyCents: null,
      historyMonths: 0,
      savedThisPeriodCents: 0,
    });
  });

  it('works across the year and rounds to the cent', () => {
    const pace = computeGoalPace(
      savings([
        [2025, 11, 10],
        [2025, 12, 10],
        [2026, 1, 0.01],
      ]),
      { year: 2026, month: 2 }
    );
    expect(pace).toEqual({ averageMonthlyCents: 667, historyMonths: 3, savedThisPeriodCents: 0 });
  });
});
