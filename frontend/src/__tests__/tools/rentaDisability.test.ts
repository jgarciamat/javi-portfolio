import {
  DISABILITY_LIMITS,
  disabilityReductions,
  patrimonyShare,
  relativePlanShare,
} from '@modules/tools/domain/rentaDisability';

const ctx = { room: 50000, plansUsed: 0, disabled: false, year: 2025 };

describe('plans and protected patrimony of a person with a disability (arts. 53 and 54)', () => {
  it('gives nothing when nothing was typed', () => {
    expect(disabilityReductions(undefined, ctx)).toBeNull();
  });

  it("puts the person's own plan first and shares the rest among the relatives", () => {
    // 24,250 − 18,250 = 6,000 left; mine 6,000 (of 7,000) and the others 3,000: 6,000 × 6/9.
    expect(relativePlanShare({ mine: 6000, theirs: 18250, others: 3000 })).toBe(4000);
    // Each relative up to 10,000 €, and nothing left once the person used the 24,250 €.
    expect(relativePlanShare({ mine: 12000, theirs: 0, others: 0 })).toBe(10000);
    expect(relativePlanShare({ mine: 5000, theirs: 30000, others: 0 })).toBe(0);
  });

  it('holds the patrimony to 10,000 € each and 24,250 € for all, in proportion', () => {
    expect(patrimonyShare(12000, 0)).toBe(10000);
    // 10,000 of 30,000 claimed: 24,250 / 3.
    expect(patrimonyShare(12000, 20000)).toBe(8083.33);
    expect(patrimonyShare(4000, 5000)).toBe(4000);
  });

  it('gives the own plan only with a disability, sharing the 24,250 € with the other plans', () => {
    const support = { ownPlan: 30000 };
    expect(disabilityReductions(support, ctx)?.ownPlan).toBe(0);
    const relativeOnly = { relativePlan: { mine: 100, theirs: 0, others: 0 } };
    expect(disabilityReductions(relativeOnly, { ...ctx, disabled: true })?.total).toBe(100);
    const r = disabilityReductions(support, { ...ctx, disabled: true, plansUsed: 1500 });
    expect(r?.ownPlan).toBe(22750);
    // What passes the limits does not carry (art. 53.1.c).
    expect(r?.plansNext).toBe(0);
  });

  it('carries what the base left out of the plans, and loses the oldest patrimony excess', () => {
    const r = disabilityReductions(
      {
        relativePlan: { mine: 3000, theirs: 0, others: 0 },
        patrimony: {
          mine: 2000,
          others: 0,
          pending: [
            { year: 2023, amount: 700 },
            { year: 2021, amount: 500 },
            { year: 2020, amount: 900 },
            { year: 2025, amount: 400 },
            { year: 2022, amount: 0 },
          ],
        },
      },
      { ...ctx, room: 3800 }
    );
    // Room 3,800: 3,000 of the plan, then 500 of 2021 and 300 of 2023; 2020 is too old and 2025 is
    // this year's (left out). 2021 was in its last year: used in full here, so nothing is lost.
    expect(r).toEqual({
      plans: 3000,
      ownPlan: 0,
      relativePlan: 3000,
      patrimony: 800,
      total: 3800,
      plansNext: 0,
      patrimonyLeft: [
        { year: 2023, amount: 400, lastYear: 2027 },
        { year: 2025, amount: 2000, lastYear: 2029 },
      ],
      patrimonyLost: 0,
    });
    const tight = disabilityReductions(
      {
        relativePlan: { mine: 3000, theirs: 0, others: 0 },
        patrimony: { mine: 0, others: 0, pending: [{ year: 2021, amount: 500 }] },
      },
      { ...ctx, room: 1000 }
    );
    expect(tight?.plansNext).toBe(2000);
    expect(tight?.patrimonyLost).toBe(500);
    expect(tight?.patrimonyLeft).toEqual([]);
  });

  it('keeps the limits of the law in one place', () => {
    expect(DISABILITY_LIMITS).toEqual({
      perContributor: 10000,
      joint: 24250,
      planYears: 5,
      patrimonyYears: 4,
    });
  });
});
