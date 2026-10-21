import { manualMovements, type ManualData } from '@domain/services/autonomo-expenses';
import { prepareDraft, type DraftInputs, type QuarterExtras } from '@domain/services/autonomo';

/**
 * A modelo 130 filed with an error and corrected later in the app (docs/fiscalidad/corregir-un-modelo.md
 * §4.2, C1-C2). Box 05 adds the positive boxes 07 «consignadas» in the 130 filed this year
 * (instructions of the modelo 130, AEAT, checked 2026-10-21); boxes 01 and 02 are the real cumulative
 * figures. Invented figures, worked out by hand:
 *   1T: income 5,000, expenses 2,500 → 04 = 500, 07 = 500
 *   2T: cumulative 10,000 / 5,000 → 04 = 1,000, 05 = 500, 07 = 500
 *   3T real: cumulative 18,000 / 12,000 → 04 = 1,200, 05 = 1,000, 07 = 200
 *   3T filed with 6,500 of expenses too many: 18,000 / 18,500 → 03 = −500, 07 = −1,000, 12 = 0
 *   4T: cumulative 24,000 / 16,000 → 04 = 1,600
 *       with the 3T as filed (0 paid): 05 = 1,000, 07 = 600
 *       with the 3T recomputed (200 never paid): 05 = 1,200, 07 = 400 (the error of C1)
 */
const profile = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const empty: ManualData['quarters'][number] = {
  income: { r21: 0, r10: 0, r4: 0, r0: 0 },
  expenses: [],
};
const zero: QuarterExtras = { withheld: 0, socialSecurity: 0, vatNotDeductible: 0 };
const INCOME = [5000, 5000, 8000, 6000];
const REAL = [2500, 2500, 7000, 4000];
/** The expenses of the 3T as they were filed, with 6,500 too many. */
const FILED = [2500, 2500, 13500, 4000];

function draftOf(expenses: number[], options: Partial<DraftInputs>, quarter: 1 | 2 | 3 | 4) {
  const data: ManualData = {
    profile,
    quarters: [0, 1, 2, 3].map((i) => ({
      ...empty,
      income: { ...empty.income, r0: INCOME[i] },
    })) as ManualData['quarters'],
  };
  // The expenses go in as the contribution of each quarter: deductible, without VAT.
  const inputs: DraftInputs = {
    quarters: [0, 1, 2, 3].map((i) => ({
      ...zero,
      socialSecurity: expenses[i],
    })) as DraftInputs['quarters'],
    hardToJustify: false,
    priorYearNet: null,
    exempt130: false,
    vatToOffset: 0,
    manual: data,
    prior: null,
    ...options,
  };
  return prepareDraft(2026, quarter, manualMovements(2026, data).movements, inputs);
}

const boxes = (draft: ReturnType<typeof draftOf>, ids: string[]) =>
  ids.map((id) => draft.irpf.boxes.find((b) => b.box === id)?.amount);
const IDS = ['01', '02', '03', '04', '05', '07', '12', '19'];

describe('Modelo 130: a quarter filed with an error and corrected in the app', () => {
  it('gives the wrong 3T as it was filed: box 12 stays at 0, never negative', () => {
    expect(boxes(draftOf(FILED, {}, 3), IDS)).toEqual([18000, 18500, -500, 0, 1000, -1000, 0, 0]);
    expect(draftOf(FILED, {}, 3).irpf.result).toBe('zero');
  });

  it('gives the right 3T: the complementaria would come to 200', () => {
    expect(boxes(draftOf(REAL, {}, 3), IDS)).toEqual([
      18000, 12000, 6000, 1200, 1000, 200, 200, 200,
    ]);
  });

  it('without what was filed, the 4T takes off the 200 never paid (400)', () => {
    expect(boxes(draftOf(REAL, {}, 4), ['01', '02', '04', '05', '07', '19'])).toEqual([
      24000, 16000, 1600, 1200, 400, 400,
    ]);
  });

  it('with the 3T as filed, the 4T takes off only what was paid (600), on the real figures', () => {
    const filed130 = [{ box07: 500 }, { box07: 500 }, { box07: -1000, box19: 0 }, null];
    const q4 = draftOf(REAL, { filed130 }, 4);
    expect(boxes(q4, ['01', '02', '03', '04', '05', '07', '19'])).toEqual([
      24000, 16000, 8000, 1600, 1000, 600, 600,
    ]);
    // A negative box 07 adds nothing to box 05: only the positive ones count.
    expect(
      boxes(draftOf(REAL, { filed130: [null, null, { box07: -1000 }, null] }, 4), ['05'])
    ).toEqual([1000]);
  });

  it('after a complementaria of the 3T, its box 07 (200) is the one carried: the 4T is 400', () => {
    const filed130 = [null, null, { box07: 200, box19: 200 }, null];
    expect(boxes(draftOf(REAL, { filed130 }, 4), ['05', '07'])).toEqual([1200, 400]);
  });

  it('works each quarter on the real figures: what was filed only moves box 05 of the next ones', () => {
    const filed130 = [{ box07: 500 }, { box07: 500 }, { box07: -1000, box19: 0 }, null];
    // The quarters before the error are the same either way; the 3T itself is the real one.
    expect(boxes(draftOf(REAL, { filed130 }, 1), ['01', '02', '07'])).toEqual([5000, 2500, 500]);
    expect(boxes(draftOf(REAL, { filed130 }, 2), ['01', '02', '05', '07'])).toEqual([
      10000, 5000, 500, 500,
    ]);
    expect(boxes(draftOf(REAL, { filed130 }, 3), IDS)).toEqual(boxes(draftOf(REAL, {}, 3), IDS));
    // The figure filed for the viewed quarter changes nothing in it.
    expect(boxes(draftOf(REAL, { filed130: [null, null, null, { box07: 9 }] }, 4), ['05'])).toEqual(
      [1200]
    );
  });

  it('carries a filed negative box 19 («a deducir») to box 15 of the next quarter', () => {
    // Reduction of 100 a quarter (last year's net under 9,000). 1T filed: 07 = 50, 14 = −50,
    // 19 = −50. 2T: 04 = 1,000, 05 = 50, 07 = 950, 12 = 950, 14 = 850, 15 = 50, 17 = 800.
    const filed130 = [{ box07: 50, box19: -50 }, null, null, null];
    const q2 = draftOf(REAL, { filed130, priorYearNet: 8000 }, 2);
    expect(boxes(q2, ['05', '07', '12', '13', '14', '15', '17', '19'])).toEqual([
      50, 950, 950, 100, 850, 50, 800, 800,
    ]);
  });

  it('keeps the totals typed in place of the earlier quarters and ignores what was filed then', () => {
    // The prior totals: the real cumulative figures to the 3T and box 05 of the 4T as filed.
    const prior = { income: 18000, expenses: 12000, previousPayments: 1000, withheld: 0 };
    const filed130 = [{ box07: 1 }, { box07: 1 }, { box07: 1 }, null];
    expect(boxes(draftOf(REAL, { prior, filed130 }, 4), ['01', '02', '05', '07'])).toEqual([
      24000, 16000, 1000, 600,
    ]);
  });
});
