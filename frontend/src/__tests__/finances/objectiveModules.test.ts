import {
  activityOf,
  instalmentNet,
  instalments131,
  moduleTableOf,
  NO_OBJECTIVE,
  objectiveYear,
  quarterShare,
  specialKindOf,
  staffUnits,
  yearUnits,
  type ObjectiveInput,
} from '@modules/finances/domain/objectiveModules';
import { modules2025 } from '@modules/tools/data/renta/modulos-2025';

/**
 * Official case: Manual práctico de Renta 2025, cap. 8, «Caso práctico» (bar de categoría especial,
 * epígrafe 673.1; checked on 19-10-2026). Units of 2025: 3.66 salaried (3 × 1,800 h and 2 × 600 h
 * over 1,800), the owner, 35 kW, 8 tables, 10 m of bar, no machine A and one B; 3 salaried in 2024;
 * depreciation 6,050 €; extraordinary expenses (flood) 1,200 €.
 */
const bar: ObjectiveInput = {
  ...NO_OBJECTIVE,
  activityId: 'm45',
  unitsStart: [3, 1, 35, 8, 10, 0, 1],
  unitsYear: [3.66, null, null, null, null, null, null],
  staffLastYear: 3,
  extraordinary: 1200,
};

/** Invented taxi in a town of 50,001 to 100,000 people (index 0.90, instrucción 2.3.a.2). */
const taxi: ObjectiveInput = {
  ...NO_OBJECTIVE,
  activityId: 'm59',
  unitsStart: [0.5, 1, 45],
  unitsYear: [],
  staffLastYear: 0.5,
  specialIndex: 0.9,
  smallIndex: 0.8,
};

describe('non-farming modules: the net income of the year (Renta)', () => {
  it('reproduces the official case of the Manual (673.1) to the cent', () => {
    const r = objectiveYear(bar, 2025, 6050);
    expect(r).toEqual({
      previous: 50111.95,
      employment: 2693.38,
      investment: 6050,
      reduced: 41368.57,
      modules: 44603.33,
      general: 2230.17,
      net: 41173.16,
    });
    // 2026: the Orden HAC/1425/2025 keeps the same modules.
    expect(objectiveYear(bar, 2026, 6050).net).toBe(41173.16);
    expect(yearUnits(bar)).toEqual([3.66, 1, 35, 8, 10, 0, 1]);
  });

  it('applies the special index of the taxi and never the small-business one with it', () => {
    // Previous: 0.5 × 1,346.27 + 7,656.89 + 45 × 45.08 = 10,358.63 (rounded once); employment:
    // 0.10 × 0.5 × 1,346.27 = 67.31; × 0.90 = 9,262.19; 5 % = 463.11; net 8,799.08.
    expect(objectiveYear(taxi, 2026, 0)).toMatchObject({
      previous: 10358.63,
      employment: 67.31,
      reduced: 10291.32,
      modules: 9262.19,
      general: 463.11,
      net: 8799.08,
    });
    // A kiosk can take both (a.1 is not among the incompatible ones).
    expect(specialKindOf('m33')).toBe('kiosk');
    expect(specialKindOf('m01')).toBeNull();
  });

  it('adds grants and takes extraordinary expenses (annex III.2 and III.3)', () => {
    const shop = { ...NO_OBJECTIVE, activityId: 'm17', unitsStart: [0, 1, 50, 30] };
    // 13,995.51 + 50 × 49.13 + 30 × 56.69 = 18,152.71; small business 0.80: 14,522.17;
    // 5 % = 726.11; + 500 of grants − 100 extraordinary = 14,196.06.
    const r = objectiveYear(
      { ...shop, smallIndex: 0.8, otherIncome: 500, extraordinary: 100 },
      2025,
      0
    );
    expect(r).toMatchObject({
      previous: 18152.71,
      modules: 14522.17,
      general: 726.11,
      net: 14196.06,
    });
  });

  it('knows the tables of 2025 and 2026, and uses the last one for a later year', () => {
    expect(moduleTableOf(2025)).toEqual({ table: modules2025, known: true });
    expect(moduleTableOf(2027)).toEqual({ table: modules2025, known: false });
    expect(moduleTableOf(2020).known).toBe(false);
    expect(activityOf({ activityId: 'zz' }, 2025)).toBeNull();
    expect(staffUnits({ ...NO_OBJECTIVE, activityId: 'zz' }, 2025)).toBe(0);
  });
});

describe('non-farming modules: the modelo 131', () => {
  it('works out the instalment with the data at 1 January (hand calculation)', () => {
    // Previous: 3 × 4,056.30 + 15,538.66 + 11,243.05 + 1,864.32 + 3,716.20 + 2,903.66 = 47,434.79;
    // employment 0.40 × 4,056.30 = 1,622.52; depreciation at the maximum rate 3,650;
    // 42,162.27 → excess: 30,586.03 + 1.30 × 11,576.24 = 45,635.14; 5 % = 2,281.76; 43,353.38.
    const net = instalmentNet(bar, 2025, 3650);
    expect(net).toMatchObject({ previous: 47434.79, employment: 1622.52, net: 43353.38 });
    const r = instalments131(bar, {
      year: 2025,
      quarter: 2,
      withheld: [0, 0, 0, 0],
      income: [0, 0, 0, 0],
      lastYearNet: 41173.16,
      depreciationAtStart: 3650,
    })!;
    // 3 salaried at 1 January: 4 % → 1,734.14 each quarter.
    expect(r.rate).toBe(4);
    expect(r.staff).toBe(3);
    expect(r.quarters.map((q) => q.result.due)).toEqual([1734.14, 1734.14]);
    expect(r.quarters[0].result.boxes.find((b) => b.box === '01')!.amount).toBe(43353.38);
  });

  it('takes 3 % with one salaried at most, the withholdings and a negative quarter later on', () => {
    // Taxi: 8,799.08 × 3 % = 263.97; 400 withheld in 1T: −136.03 to deduct in 2T.
    const r = instalments131(taxi, {
      year: 2026,
      quarter: 3,
      withheld: [400, 0, 0, 0],
      income: [0, 0, 0, 0],
      // Over 12,000 € last year: no reduction of box 09.
      lastYearNet: 20000,
      depreciationAtStart: 0,
    })!;
    expect(r.rate).toBe(3);
    const box = (q: number, id: string) =>
      r.quarters[q].result.boxes.find((b) => b.box === id)!.amount;
    expect(box(0, '15')).toBe(-136.03);
    expect(r.quarters[0].result.result).toBe('deduct');
    expect(box(1, '11')).toBe(136.03);
    expect(box(1, '15')).toBe(127.94);
    expect(box(2, '11')).toBe(0);
    expect(box(2, '15')).toBe(263.97);
  });

  it('cuts the rate by 60 % in the 3T and 4T of 2026 in La Palma (DA 57.ª LIRPF)', () => {
    // No data: 2 % of 10,000 = 200 in the 1T and 2T; × 0.4 = 0.8 % = 80 in the 3T and 4T.
    const r = instalments131(
      { ...taxi, noData: true },
      {
        year: 2026,
        quarter: 4,
        withheld: [0, 0, 0, 0],
        income: [10000, 10000, 10000, 10000],
        lastYearNet: null,
        depreciationAtStart: 0,
        territory: 'laPalma',
      }
    )!;
    expect(r.quarters.map((q) => q.result.boxes.find((b) => b.box === '04')!.amount)).toEqual([
      200, 200, 80, 80,
    ]);
  });

  it('is 2 % of the income of the quarter when no data can be known, and null without figures', () => {
    const r = instalments131(
      { ...taxi, noData: true },
      {
        year: 2026,
        quarter: 1,
        withheld: [0],
        income: [10000],
        lastYearNet: null,
        depreciationAtStart: 0,
      }
    )!;
    expect(r.quarters[0].result.boxes.find((b) => b.box === '04')!.amount).toBe(200);
    expect(
      instalments131(taxi, {
        year: 1999,
        quarter: 1,
        withheld: [0, 0, 0, 0],
        income: [0, 0, 0, 0],
        lastYearNet: null,
        depreciationAtStart: 0,
      })
    ).toBeNull();
  });

  it('prorates a quarter started or ended in it, and a season by the days of last year', () => {
    const started = { ...taxi, startDate: '2026-02-15' };
    // 1T: 15 Feb to 31 Mar = 45 of 90 days; 2T whole.
    expect(quarterShare(started, 2026, 1)).toBe(0.5);
    expect(quarterShare(started, 2026, 2)).toBe(1);
    const ended = { ...taxi, endDate: '2026-04-30' };
    expect(quarterShare(ended, 2026, 2)).toBeCloseTo(30 / 91, 10);
    expect(quarterShare(ended, 2026, 3)).toBe(0);
    expect(quarterShare({ ...taxi, startDate: 'x', endDate: null }, 2026, 1)).toBe(1);
    const season = {
      ...taxi,
      seasonLastYear: 120,
      seasonQuarters: [0, 30, 60, 0] as [number, number, number, number],
    };
    expect(quarterShare(season, 2026, 3)).toBe(0.5);
    const r = instalments131(started, {
      year: 2026,
      quarter: 1,
      withheld: [0, 0, 0, 0],
      income: [0, 0, 0, 0],
      lastYearNet: 20000,
      depreciationAtStart: 0,
    })!;
    // 8,799.08 × 0.5 × 3 % = 131.99.
    expect(r.quarters[0].result.due).toBe(131.99);
  });
});
