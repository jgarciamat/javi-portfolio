import {
  activitiesOf,
  dependentReduction,
  depreciation,
  directNet,
  farmNet,
  modulesNet,
  smallIncomeReduction,
  staffCoefficient,
  tableOf,
  type ActivityContext,
  type DirectActivity,
  type FarmActivity,
  type ModulesActivity,
} from '@modules/tools/domain/rentaActivity';
import { farm2025 } from '@modules/tools/data/renta/agrario-2025';
import { modules2025 } from '@modules/tools/data/renta/modulos-2025';

const noExpenses = {
  purchases: 0,
  staff: 0,
  staffSocialSecurity: 0,
  ownSocialSecurity: 0,
  rent: 0,
  repairs: 0,
  supplies: 0,
  services: 0,
  insurance: 0,
  taxes: 0,
  financial: 0,
  meals: 0,
  other: 0,
  depreciation: 0,
};

/** A designer in the simplified method, with every kind of expense the planner asks. */
const designer = (over: Partial<DirectActivity> = {}): DirectActivity => ({
  method: 'simplified',
  income: { sales: 40000, grants: 0, ownUse: 0, other: 0 },
  expenses: {
    ...noExpenses,
    purchases: 5000,
    ownSocialSecurity: 3600,
    supplies: 1200,
    services: 800,
  },
  assets: [{ group: 'computers', cost: 1500 }],
  lowValue: [],
  health: { premiums: 900, people: 2, withDisability: 0 },
  home: { supplies: 1000, usedPercent: 20 },
  provisions: 0,
  ...over,
});

describe('figures that are not numbers', () => {
  it('count as zero', () => {
    expect(depreciation('normal', [{ group: 'computers', cost: Number.NaN }])).toBe(0);
    expect(
      directNet(designer({ income: { sales: 1000, grants: 0, ownUse: 0, other: Number.NaN } }))
        .income
    ).toBe(1000);
  });
});

describe('depreciation tables', () => {
  it('uses the table of each method', () => {
    // Simplified (Orden 27-3-1998): computers 26 %; normal (Ley 27/2014): 25 %; módulos: 40 %.
    expect(depreciation('simplified', [{ group: 'computers', cost: 1500 }])).toBe(390);
    expect(depreciation('normal', [{ group: 'computers', cost: 1500 }])).toBe(375);
    expect(depreciation('modules', [{ group: 'computers', cost: 1500 }])).toBe(600);
    expect(depreciation('agrarian', [{ group: 'cattle', cost: 30000 }])).toBe(6600);
    expect(tableOf('agrarian')).toBe(tableOf('modules'));
  });

  it('counts the months, doubles for a small business and frees the low-value items', () => {
    expect(depreciation('simplified', [{ group: 'computers', cost: 1500, months: 6 }])).toBe(195);
    expect(depreciation('simplified', [{ group: 'computers', cost: 1500, doubled: true }])).toBe(
      780
    );
    // Twice the rate is for direct estimation only.
    expect(depreciation('modules', [{ group: 'computers', cost: 1500, doubled: true }])).toBe(600);
    expect(depreciation('normal', [{ group: 'unknown', cost: 1000, months: 20 }])).toBe(0);
    // Up to 300 € each in direct (art. 12.3.e Ley 27/2014), up to 601.01 € in módulos.
    expect(depreciation('normal', [], [250, 400])).toBe(250);
    expect(depreciation('modules', [], [600, 700, 601.01])).toBe(1201.01);
    expect(depreciation('modules', [], Array(10).fill(500))).toBe(3005.06);
  });
});

describe('direct estimation (LIRPF arts. 28-30)', () => {
  it('takes 5 % for provisions and expenses hard to justify in the simplified method', () => {
    // 5,000 + 3,600 + 1,200 + 800 + 390 (computer) + 900 (health, up to 500 € × 2)
    // + 1,000 × 20 % × 30 % = 60 (home) = 11,950; 40,000 − 11,950 = 28,050; 5 % = 1,402.50.
    expect(directNet(designer())).toEqual({
      income: 40000,
      expenses: 11950,
      depreciation: 390,
      difference: 28050,
      provisions: 1402.5,
      net: 26647.5,
    });
    // Up to 2,000 €, and none with the reduction of art. 32.2.1.º.
    const big = designer({ income: { sales: 70000, grants: 0, ownUse: 0, other: 0 } });
    expect(directNet(big).provisions).toBe(2000);
    expect(directNet(big, true).provisions).toBe(0);
  });

  it('takes the provisions given in the normal method, with its own table', () => {
    const r = directNet(designer({ method: 'normal', provisions: 500 }));
    expect(r).toMatchObject({ expenses: 11935, difference: 28065, provisions: 500, net: 27565 });
  });

  it('holds the health insurance to 500 € a person (1,500 € with a disability)', () => {
    const health = (premiums: number, people: number, withDisability: number) =>
      directNet(
        designer({
          health: { premiums, people, withDisability },
          assets: [],
          home: { supplies: 0, usedPercent: 0 },
        })
      ).expenses - 10600;
    expect(health(3000, 2, 0)).toBe(1000);
    expect(health(3000, 2, 1)).toBe(2000);
    expect(health(3000, 1, 5)).toBe(1500);
    // The home: never more than all of it.
    expect(directNet(designer({ home: { supplies: 1000, usedPercent: 150 } })).expenses).toBe(
      12190
    );
  });
});

describe('módulos (Orden HAC/1347/2024, annex II)', () => {
  const taxi = (over: Partial<ModulesActivity> = {}): ModulesActivity => ({
    activityId: (modules2025.find((m) => m.epigrafe === '721.2') as { id: string }).id,
    units: [0.5, 1, 45],
    staffLastYear: 0.5,
    assets: [{ group: 'transport', cost: 24000 }],
    lowValue: [],
    specialIndex: 0.9,
    smallIndex: 0,
    seasonDays: 0,
    newYear: 0,
    disabled: false,
    extraordinary: 0,
    otherIncome: 0,
    ...over,
  });

  it('has the 70 activities of the order, with the taxi of epígrafe 721.2', () => {
    expect(modules2025).toHaveLength(70);
    expect(modules2025.find((m) => m.epigrafe === '721.2')?.modules).toEqual([
      { label: 'Personal asalariado', unit: 'Persona', amount: 1346.27 },
      { label: 'Personal no asalariado', unit: 'Persona', amount: 7656.89 },
      { label: 'Distancia recorrida', unit: '1.000 kilómetros', amount: 45.08 },
    ]);
  });

  it('works out a taxi in a town of 50,001 to 100,000 people (index 0.90)', () => {
    // 0.5 × 1,346.27 + 7,656.89 + 45 × 45.08 = 10,358.63; employment 0.10 × 0.5 × 1,346.27 = 67.31;
    // car 24,000 × 25 % = 6,000; 4,291.32 × 0.90 = 3,862.19; 5 % = 193.11.
    expect(modulesNet(taxi(), modules2025)).toEqual({
      previous: 10358.63,
      employment: 67.31,
      investment: 6000,
      reduced: 4291.32,
      modules: 3862.19,
      general: 193.11,
      net: 3669.08,
    });
    expect(modulesNet(taxi({ extraordinary: 100, otherIncome: 300 }), modules2025).net).toBe(
      3869.08
    );
  });

  it('counts the employment incentive by stretches and 0.40 for the increase', () => {
    expect(staffCoefficient(2, 1)).toBeCloseTo(0.5, 10);
    expect(staffCoefficient(9, 9)).toBeCloseTo(0.1 + 0.3 + 0.4 + 0.75 + 0.3, 10);
    expect(staffCoefficient(0, 3)).toBe(0);
  });

  it('applies the excess index, the small-business, season and new-activity ones', () => {
    const shop = modules2025.find((m) => m.epigrafe === '641') as { id: string; excess?: number };
    expect(shop.excess).toBe(16867.67);
    const base: ModulesActivity = {
      ...taxi(),
      activityId: shop.id,
      units: [0, 2, 50, 0, 0],
      staffLastYear: 0,
      assets: [],
      specialIndex: 0,
    };
    // 2 × 10,581.66 + 50 × 57.94 = 24,060.32; over 16,867.67 the excess × 1.30: 26,218.12.
    expect(modulesNet(base, modules2025)).toMatchObject({
      modules: 26218.12,
      general: 1310.91,
      net: 24907.21,
    });
    // Small business: no excess index.
    expect(modulesNet({ ...base, smallIndex: 0.8 }, modules2025).modules).toBe(19248.26);
    // Season of 50 days: × 1.50 and then the excess; no index for a new activity with it.
    expect(
      modulesNet({ ...base, units: [0, 1, 0, 0, 0], seasonDays: 50, newYear: 1 }, modules2025)
        .modules
    ).toBe(15872.49);
    expect(modulesNet({ ...base, units: [0, 1, 0, 0, 0], newYear: 1 }, modules2025).modules).toBe(
      8465.33
    );
    expect(
      modulesNet({ ...base, units: [0, 1, 0, 0, 0], newYear: 2, disabled: true }, modules2025)
        .modules
    ).toBe(7407.16);
    expect(
      modulesNet({ ...base, units: [0, 1, 0, 0, 0], newYear: 1, disabled: true }, modules2025)
        .modules
    ).toBe(6349);
    expect(modulesNet({ ...base, units: [0, 1, 0, 0, 0], newYear: 2 }, modules2025).modules).toBe(
      9523.49
    );
    expect(
      modulesNet({ ...base, units: [0, 1, 0, 0, 0], seasonDays: 100 }, modules2025).modules
    ).toBe(14285.24);
    expect(
      modulesNet({ ...base, units: [0, 1, 0, 0, 0], seasonDays: 150 }, modules2025).modules
    ).toBe(13227.08);
    // An unknown activity, or one without staff module, gives nothing to multiply.
    expect(modulesNet({ ...base, activityId: 'none' }, modules2025)).toMatchObject({
      previous: 0,
      net: 0,
    });
    expect(modulesNet({ ...base, units: [], extraordinary: 50 }, modules2025)).toMatchObject({
      general: 0,
      net: -50,
    });
  });
});

describe('farming by módulos (annex I)', () => {
  const farm = (over: Partial<FarmActivity> = {}): FarmActivity => ({
    lines: [
      {
        indexId: 'milk',
        income: 100000,
        transformed: false,
        rentedShare: 0,
        electricShare: 0,
        boughtFeed: true,
        organic: false,
      },
    ],
    assets: [{ group: 'cattle', cost: 30000 }],
    externalMeans: false,
    staffPercent: 15,
    forestPlan: false,
    young: false,
    extraordinary: 0,
    ...over,
  });

  it('works out a dairy farm that buys most of its feed', () => {
    // 100,000 × 0.20 = 20,000 − 6,600 = 13,400; feed 0.50 → 6,700; staff 15 % → 0.90 → 6,030; 5 %.
    expect(farmNet(farm(), farm2025)).toEqual({
      income: 100000,
      previous: 20000,
      depreciation: 6600,
      reduced: 13400,
      modules: 6030,
      general: 301.5,
      young: 0,
      net: 5728.5,
    });
    expect(farmNet(farm({ extraDepreciation: 400 }), farm2025).depreciation).toBe(7000);
    // A young farmer: 25 % less of what is left.
    expect(farmNet(farm({ young: true }), farm2025)).toMatchObject({
      young: 1432.13,
      net: 4296.37,
    });
  });

  it('takes no depreciation and only the index h for forestry', () => {
    const forest = (forestPlan: boolean) =>
      farmNet(
        farm({
          lines: [
            {
              indexId: 'forestShort',
              income: 26880,
              transformed: false,
              rentedShare: 0,
              electricShare: 0,
              boughtFeed: false,
              organic: false,
            },
          ],
          staffPercent: 50,
          forestPlan,
        }),
        farm2025
      );
    // 26,880 × 0.26 = 6,988.80, under 9,447.91 but no index g for forestry (case p3-82).
    expect(forest(false)).toMatchObject({ depreciation: 0, modules: 6988.8, net: 6639.36 });
    expect(forest(true).modules).toBe(5591.04);
  });

  it('splits two products in proportion to their base', () => {
    const line = (income: number, organic: boolean) => ({
      indexId: 'crops',
      income,
      transformed: false,
      rentedShare: 0,
      electricShare: 0,
      boughtFeed: false,
      organic,
    });
    // 10,000 and 30,000 × 0.26 = 2,600 + 7,800 = 10,400 > 9,447.91; the organic part 7,800 × 0.95.
    expect(
      farmNet(
        farm({ lines: [line(10000, false), line(30000, true)], assets: [], staffPercent: 0 }),
        farm2025
      ).modules
    ).toBe(10010);
    // Nothing to split: the bases are zero.
    expect(
      farmNet(
        farm({ lines: [line(0, false), line(0, true)], assets: [], staffPercent: 0 }),
        farm2025
      ).modules
    ).toBe(0);
  });

  it('applies the indices of land, irrigation, organic, staff and small farms', () => {
    const crops = (
      over: Partial<FarmActivity['lines'][number]>,
      more: Partial<FarmActivity> = {}
    ) =>
      farmNet(
        farm({
          lines: [
            {
              indexId: 'crops',
              income: 30000,
              transformed: false,
              rentedShare: 0,
              electricShare: 0,
              boughtFeed: false,
              organic: false,
              ...over,
            },
          ],
          assets: [],
          staffPercent: 0,
          ...more,
        }),
        farm2025
      ).modules;
    // 30,000 × 0.26 = 7,800, under 9,447.91: × 0.90.
    expect(crops({})).toBe(7020);
    expect(crops({ rentedShare: 0.5 })).toBe(6669);
    expect(crops({ electricShare: 1, organic: true })).toBe(5001.75);
    expect(crops({}, { externalMeans: true, staffPercent: 50 })).toBe(5265);
    expect(crops({}, { young: true })).toBe(7800);
    expect(crops({ transformed: true })).toBe(10800);
    expect(crops({}, { staffPercent: 45 })).toBe(5265);
    expect(crops({}, { staffPercent: 35 })).toBe(5616);
    expect(crops({}, { staffPercent: 25 })).toBe(5967);
    expect(crops({}, { forestPlan: true })).toBe(6240);
    expect(crops({ indexId: 'none' })).toBe(0);
    expect(crops({ indexId: 'services', transformed: true })).toBe(16800);
  });
});

describe('the reductions of art. 32', () => {
  it('for a single client or dependent worker (art. 32.2.1.º)', () => {
    expect(dependentReduction(12000, 0, 0)).toBe(8498);
    expect(dependentReduction(16000, 0, 0)).toBe(6272.15);
    expect(dependentReduction(25000, 0, 0)).toBe(2000);
    expect(dependentReduction(12000, 7000, 0)).toBe(2000);
    expect(dependentReduction(30000, 0, 33)).toBe(5500);
    expect(dependentReduction(30000, 0, 33, true)).toBe(9750);
    expect(dependentReduction(30000, 0, 65)).toBe(9750);
    expect(dependentReduction(1000, 0, 0)).toBe(1000);
    expect(dependentReduction(19700, 0, 0)).toBe(2054.15);
  });

  it('for small incomes (art. 32.2.3.º), with the art. 20 up to 3,700 €', () => {
    expect(smallIncomeReduction(7000, 7000, 0)).toBe(1620);
    expect(smallIncomeReduction(10000, 10000, 0)).toBe(810);
    expect(smallIncomeReduction(10000, 10000, 3000)).toBe(700);
    expect(smallIncomeReduction(500, 7000, 0)).toBe(500);
    expect(smallIncomeReduction(10000, 12000, 0)).toBe(0);
    expect(smallIncomeReduction(-10, 5000, 0)).toBe(0);
  });

  const ctx = (over: Partial<ActivityContext> = {}): ActivityContext => ({
    otherIncome: 0,
    hasWork: false,
    workReduction: 0,
    disability: 0,
    assistance: false,
    ...over,
  });

  it('puts the activities together, with the reductions in the order of the boxes', () => {
    const one = {
      kind: 'direct' as const,
      name: 'Diseño',
      data: designer(),
      dependent: false,
      newActivity: true,
      withheld: 4000,
      payments: 1200,
    };
    const r = activitiesOf([one], ctx(), modules2025, farm2025);
    // 26,647.50 − 20 % (start of the activity, art. 32.3) = 21,318.
    expect(r).toMatchObject({
      direct: 26647.5,
      startReduction: 5329.5,
      directTotal: 21318,
      total: 21318,
      withheld: 4000,
      payments: 1200,
    });
    // A single client: no 5 % and the reduction of 2,000 € (and no 32.2.3.º).
    const dep = activitiesOf(
      [{ ...one, dependent: true, newActivity: false }],
      ctx(),
      modules2025,
      farm2025
    );
    expect(dep).toMatchObject({
      direct: 28050,
      dependentReduction: 2000,
      smallIncomeReduction: 0,
      directTotal: 26050,
    });
    // With pay from work the single-client reduction is not there.
    expect(
      activitiesOf([{ ...one, dependent: true }], ctx({ hasWork: true }), modules2025, farm2025)
        .dependentReduction
    ).toBe(0);
  });

  it('takes the share of a farm of shared ownership (Ley 35/2011)', () => {
    const one = {
      kind: 'direct' as const,
      name: 'Vacuno',
      data: designer(),
      dependent: false,
      newActivity: false,
      withheld: 0,
      payments: 0,
    };
    const r = activitiesOf([{ ...one, share: 0.5 }], ctx(), modules2025, farm2025);
    expect(r.each[0]).toMatchObject({ net: 13323.75 });
    expect(r.direct).toBe(13323.75);
    expect(activitiesOf([{ ...one, share: 3 }], ctx(), modules2025, farm2025).direct).toBe(26647.5);
  });

  it('spreads the small-income reduction over direct, módulos and farming', () => {
    const tiny = designer({
      income: { sales: 3000, grants: 0, ownUse: 0, other: 0 },
      expenses: noExpenses,
      assets: [],
      health: { premiums: 0, people: 0, withDisability: 0 },
      home: { supplies: 0, usedPercent: 0 },
    });
    const taxi: ModulesActivity = {
      activityId: 'none',
      units: [],
      staffLastYear: 0,
      assets: [],
      lowValue: [],
      specialIndex: 0,
      smallIndex: 0,
      seasonDays: 0,
      newYear: 0,
      disabled: false,
      extraordinary: 0,
      otherIncome: 400,
    };
    const field: FarmActivity = {
      lines: [
        {
          indexId: 'crops',
          income: 2000,
          transformed: false,
          rentedShare: 0,
          electricShare: 0,
          boughtFeed: false,
          organic: false,
        },
      ],
      assets: [],
      externalMeans: false,
      staffPercent: 0,
      forestPlan: false,
      young: false,
      extraordinary: 0,
    };
    const r = activitiesOf(
      [
        {
          kind: 'direct',
          name: 'A',
          data: tiny,
          dependent: false,
          newActivity: false,
          withheld: 0,
          payments: 0,
        },
        { kind: 'modules', name: 'B', data: taxi, withheld: 0, payments: 0 },
        { kind: 'agrarian', name: 'C', data: field, withheld: 0, payments: 0 },
      ],
      ctx(),
      modules2025,
      farm2025
    );
    // 2,850 (3,000 − 5 %) + 400 + 2,000 × 0.26 × 0.90 = 468 − 5 % = 444.60 → 3,694.60: 1,620 €,
    // first on the direct ones.
    expect(r.each.map((e) => e.net)).toEqual([2850, 400, 444.6]);
    expect(r).toMatchObject({
      smallIncomeReduction: 1620,
      directTotal: 1230,
      modules: 400,
      agrarian: 444.6,
    });
    const more = activitiesOf(
      [
        {
          kind: 'direct',
          name: 'A',
          data: tiny,
          dependent: false,
          newActivity: false,
          withheld: 0,
          payments: 0,
        },
        { kind: 'agrarian', name: 'C', data: field, withheld: 0, payments: 0 },
      ],
      ctx({ otherIncome: 0 }),
      modules2025,
      farm2025
    );
    expect(more).toMatchObject({ directTotal: 1230, agrarian: 444.6 });
  });
});
