import {
  annualActivity,
  estimate130,
  hardRateOf,
  NO_ACTIVITY,
} from '@modules/finances/domain/annualActivity';
import {
  agrarianModules,
  indexOf,
  type AgrarianModulesInput,
} from '@modules/finances/domain/agrarianModules';
import { NO_OBJECTIVE } from '@modules/finances/domain/objectiveModules';
import type {
  ActivityInputs,
  AutonomoInputs,
  ManualData,
  ManualExpense,
} from '@modules/finances/domain/types';

const profile: ManualData['profile'] = {
  workArea: 0,
  homeArea: 0,
  vehicleExclusive: false,
  healthPeople: 0,
  healthDisability: false,
};
const quarter = (
  r21 = 0,
  expenses: ManualExpense[] = [],
  r0 = 0
): ManualData['quarters'][number] => ({
  income: { r21, r10: 0, r4: 0, r0 },
  expenses,
});
const extras = (withheld = 0) => ({ withheld, socialSecurity: 0, vatNotDeductible: 0 });

function inputsOf(
  quarters: ManualData['quarters'],
  activity: Partial<ActivityInputs> | null,
  more: Partial<AutonomoInputs> = {},
  withheld = [0, 0, 0, 0]
): AutonomoInputs {
  return {
    quarters: withheld.map(extras) as AutonomoInputs['quarters'],
    hardToJustify: false,
    priorYearNet: null,
    exempt130: false,
    vatToOffset: 0,
    manual: { profile, quarters },
    activity: activity && { ...NO_ACTIVITY, ...activity },
    ...more,
  };
}

const e = (kind: ManualExpense['kind'], amount: number, vatRate: ManualExpense['vatRate'] = 0) => ({
  kind,
  amount,
  vatRate,
});

describe('Annual activity: the official case of the Manual de Renta 2025 (capítulo 7)', () => {
  // A radiologist in the simplified modality (Manual práctico de Renta 2025, cap. 7, caso práctico):
  // income 124,000 + 10,800 talks, self-consumption 600, stock +3,000 = 138,400; expenses 78,300 with
  // 7,900 of depreciation; 5 % of 60,100 = 3,005, capped at 2,000; net yield 58,100 (the Manual's
  // notes say 61,400 by mistake: its table and its sum give 58,100).
  const year = annualActivity(
    2025,
    inputsOf(
      [
        quarter(
          0,
          [
            e('staff', 23600),
            e('quota', 3300),
            e('material', 19000),
            e('training', 1300),
            e('other', 23200),
          ],
          134800
        ),
        quarter(),
        quarter(),
        quarter(),
      ],
      {
        selfConsumption: 600,
        stockChange: 3000,
        assets: [
          {
            name: 'Equipamiento',
            group: 's2',
            cost: 79000,
            start: '2024-01-01',
            use: 100,
            method: 'table',
          },
        ],
        paid130: [1000, 2000, 3000, 4000],
      },
      { hardToJustify: true }
    )
  );

  it('gives the income, the expenses and the net yield of the Manual', () => {
    expect(year.income.total).toBe(138400);
    expect(year.expenses.total).toBe(80300);
    expect(year.expenses.hardToJustify).toBe(2000);
    expect(year.net).toBe(58100);
    expect([year.regime, year.modality]).toEqual(['directSimplified', 'S']);
  });

  it('fills in the boxes of section D', () => {
    expect(year.boxes).toMatchObject({
      '0171': 134800,
      '0175': 600,
      '0177': 3000,
      '0180': 138400,
      '0183': 19000,
      '0184': 23600,
      '0186': 3300,
      '0202': 24500,
      '0208': 7900,
      '0218': 78300,
      '0221': 60100,
      '0222': 2000,
      '0223': 80300,
      '0224': 58100,
      '0599': 0,
      '0604': 10000,
    });
    expect(year.payments130.source).toEqual(['filed', 'filed', 'filed', 'filed']);
  });
});

describe('Annual activity: the payments of the 130', () => {
  // The example books of docs/ejemplos-importacion (backend autonomo-imported-books.test.ts):
  // the 130 of the first three quarters are 76.60, 148.75 and 5.60; the fourth adds nothing.
  const q = (r21: number, r10: number, r4: number, rest: ManualExpense[]) => ({
    income: { r21, r10, r4, r0: 0 },
    expenses: [
      e('rent', 484, 21),
      e('management', 181.5, 21),
      e('other', 60.5, 21),
      ...rest,
      e('quota', 882),
    ],
  });
  const quarters: ManualData['quarters'] = [
    q(5300, 0, 0, [e('software', 72.6, 21), e('supplies', 96.8, 21)]),
    q(5000, 1000, 0, [e('vehicle', 145.2, 21), { ...e('meals', 60.5, 10), days: 1 }]),
    q(5200, 0, 600, [e('advertising', 363, 21), e('material', 108.9, 21)]),
    quarter(),
  ];

  it('estimates them as the server does when the filed ones are not given', () => {
    const year = annualActivity(2026, inputsOf(quarters, null, {}, [675, 750, 780, 0]));
    expect(year.payments130).toEqual({
      quarters: [76.6, 148.75, 5.6, 0],
      source: ['estimated', 'estimated', 'estimated', 'none'],
      total: 230.95,
    });
    expect(year.withholdings).toBe(2205);
    expect(year.warnings).toContain('payments130Estimated');
  });

  it('takes the filed ones first and gives nothing to estimate when no 130 is due', () => {
    const filed = annualActivity(
      2026,
      inputsOf(quarters, { paid130: [70, null, -20, null] }, {}, [675, 750, 780, 0])
    );
    expect(filed.payments130.quarters).toEqual([70, 148.75, 0, 0]);
    const exempt = annualActivity(2026, inputsOf(quarters, null, { exempt130: true }));
    expect(exempt.payments130).toMatchObject({
      total: 0,
      source: ['none', 'none', 'none', 'none'],
    });
  });

  it('carries the negative results and applies the reduction for low income', () => {
    const f = (income: number, withheld: number) => ({
      income,
      agrarianIncome: 0,
      expenses: 0,
      withheld,
    });
    const quarters4 = [f(1000, 300), f(2000, 0), f(0, 300), f(0, 0)];
    // Q1: 200 − 300 → 0 − 100 (reduction) = −100; Q2: 600 − 300 = 300 − 100 = 200 − 100 carried = 100;
    // Q3: 600 − 300 − 600 = −300 → 0 − 100 = −100; Q4 the same.
    expect(estimate130(quarters4, { hardRate: 0, agrarian: false, priorYearNet: 8000 })).toEqual([
      -100, 100, -100, -100,
    ]);
    expect(estimate130(quarters4, { hardRate: 0, agrarian: false, priorYearNet: 20000 })).toEqual([
      0, 300, 0, 0,
    ]);
    // Section II: 2 % of 10,000 − 100 = 100 each quarter alone.
    const farm = [0, 1, 2, 3].map(() => ({
      income: 0,
      agrarianIncome: 10000,
      expenses: 0,
      withheld: 100,
    }));
    expect(estimate130(farm, { hardRate: 0, agrarian: true, priorYearNet: null })).toEqual([
      100, 100, 100, 100,
    ]);
  });

  it('applies 7 % of hard-to-justify expenses in 2023 only', () => {
    expect([hardRateOf(2023), hardRateOf(2025)]).toEqual([0.07, 0.05]);
    const year = annualActivity(
      2023,
      inputsOf([quarter(10000), quarter(), quarter(), quarter()], null, { hardToJustify: true })
    );
    expect(year.expenses.hardToJustify).toBe(700);
  });
});

describe('Annual activity: normal modality, farming, grants and what is not worked out', () => {
  const four = (q1: ManualData['quarters'][number]): ManualData['quarters'] => [
    q1,
    quarter(),
    quarter(),
    quarter(),
  ];

  it('takes provisions in the normal modality and no hard-to-justify expenses', () => {
    // 0218 = 1,000 fees − 300 refunded = 700; + 500 provisions = 1,200; 20,000 − 1,200 = 18,800
    const year = annualActivity(
      2026,
      inputsOf(
        four(quarter(20000, [e('quota', 1000)])),
        { method: 'normal', provisions: 500, retaFix: -300 },
        { hardToJustify: true }
      )
    );
    expect(year.boxes).toMatchObject({
      '0197': 300,
      '0196': 0,
      '0218': 700,
      '0219': 500,
      '0220': 1200,
      '0224': 18800,
    });
    expect([year.modality, year.regime, year.expenses.hardToJustify]).toEqual([
      'N',
      'directNormal',
      0,
    ]);
    // The estimate takes the provisions in the fourth quarter: Q1 (20,000 − 1,000) × 20 % = 3,800;
    // Q4 (19,000 − 500) × 20 % = 3,700 − 3,800 paid < 0, so nothing (the refund is not in the 130).
    expect(year.payments130.quarters).toEqual([3800, 0, 0, 0]);
  });

  it('counts grants, compensations and section II for farming', () => {
    const year = annualActivity(
      2026,
      inputsOf(
        four(quarter(0, [], 10000)),
        {
          method: 'simplified',
          agrarian: true,
          compensations: [1200, 0, 0, 0],
          assets: [
            {
              name: 'Tractor',
              group: 's3',
              cost: 12000,
              start: '2026-01-01',
              use: 100,
              method: 'table',
            },
          ],
          subsidies: [
            { name: 'Pago básico', kind: 'current', amount: 3000, year: 2026, quarter: 1 },
            { name: 'Tractor', kind: 'capital', amount: 6000, year: 2026, quarter: 1, asset: 0 },
            { name: 'Arranque de viñedo', kind: 'exempt', amount: 800, year: 2026, quarter: 2 },
            { name: 'Nave', kind: 'capital', amount: 900, year: 2026, quarter: 1, asset: null },
          ],
        },
        {},
        [100, 0, 0, 0]
      )
    );
    // Depreciation 12,000 × 12 % = 1,440; the capital grant follows it: 6,000 × 12 % = 720.
    expect(year.boxes).toMatchObject({
      '0171': 10000,
      '0173': 3000,
      '0174': 720,
      '0176': 1200,
      '0180': 14920,
      '0208': 1440,
    });
    expect(year.regime).toBe('agrarianSimplified');
    // Box 08 of Q1: 10,000 + 3,000 (the capital grant and the compensation stay out) = 13,000 × 2 %
    // = 260 − 100 withheld = 160
    expect(year.payments130.quarters).toEqual([160, 0, 0, 0]);
    expect(year.subsidies).toEqual({ current: 3000, capital: 720, exempt: 800, unassigned: 900 });
    expect(year.warnings).toEqual(expect.arrayContaining(['exemptAid', 'capitalNoAsset']));
  });

  it('gives the regime of each case', () => {
    const regime = (a: Partial<ActivityInputs>) =>
      annualActivity(2026, inputsOf(four(quarter()), a)).regime;
    expect(regime({ method: 'normal', agrarian: true })).toBe('agrarianNormal');
  });

  it('does not work out modules outside farming', () => {
    const year = annualActivity(2026, inputsOf(four(quarter(5000)), { method: 'objective' }));
    expect([year.net, year.modality, year.regime]).toEqual([null, null, 'objective']);
    expect(year.boxes).toEqual({ '0599': 0, '0604': 0 });
    expect(year.warnings).toEqual(expect.arrayContaining(['objective', 'payments131']));
  });

  it('works out farming in modules with the depreciation of its table', () => {
    const modules: Omit<AgrarianModulesInput, 'depreciation'> = {
      rows: [{ product: 'cereals', income: 20000 }],
      pacAid: 0,
      correctors: {
        externalMeans: false,
        staffShare: 0,
        rentedShare: 0,
        irrigatedShare: 0,
        boughtFeed: false,
        organic: false,
        forestPlan: false,
      },
      youngFarmer: false,
      refunds: 0,
      extraordinary: 0,
    };
    const asset = {
      name: 'Nave',
      group: 'm1',
      cost: 20000,
      start: '2026-01-01',
      use: 100,
      method: 'table' as const,
    };
    const year = annualActivity(
      2026,
      inputsOf(four(quarter()), { method: 'objective', agrarian: true, modules, assets: [asset] })
    );
    // 20,000 × 0.26 = 5,200 − 1,000 (5 % of the building) = 4,200 × 0.90 (under 9,447.91) = 3,780
    // − 5 % (189) = 3,591
    expect(year.net).toBe(3591);
    expect(year.boxes).toMatchObject({ '1537': 5200, '1538': 1000, '1553': 3591, '0604': 0 });
    expect(year.regime).toBe('objectiveAgrarian');
    const late = annualActivity(
      2027,
      inputsOf(four(quarter()), { method: 'objective', agrarian: true, modules })
    );
    expect(late.warnings).toContain('modules');
  });

  it('warns about what it cannot see', () => {
    const typed = annualActivity(
      2026,
      inputsOf(
        four(quarter(1000, [{ ...e('material', 5000, 21), investment: true }])),
        { provisions: 100, assets: [] },
        {
          prior: { income: 1, expenses: 0, previousPayments: 0, withheld: 0 },
          vat: { prorrata: { provisional: 50, special: false } },
        }
      )
    );
    expect(typed.warnings).toEqual(
      expect.arrayContaining([
        'priorTotals',
        'investmentNoAsset',
        'provisionsSimplified',
        'notWorkedOut',
      ])
    );
    expect(typed.expenses.byKind.material).toBe(0);
    const goods = annualActivity(
      2026,
      inputsOf(
        four(quarter()),
        {
          assets: [
            {
              name: 'Furgoneta',
              group: 's4',
              cost: 20000,
              start: '2026-01-01',
              use: 80,
              method: 'table',
              vat: 4200,
            },
          ],
        },
        { vat: { prorrata: { provisional: 50, special: false } } }
      )
    );
    expect(goods.warnings).toEqual(expect.arrayContaining(['vatInvestments', 'assetNotes']));
    const empty = annualActivity(2026, { ...inputsOf(four(quarter()), null), manual: null });
    expect(empty.warnings).toContain('noData');
    expect(empty.net).toBe(0);
  });

  it('adds the legacy fees and VAT not deducted of the quarters', () => {
    const inputs = inputsOf(four(quarter(1000)), null);
    inputs.quarters[0] = { withheld: 0, socialSecurity: 200, vatNotDeductible: 50 };
    const year = annualActivity(2026, inputs);
    // 1,000 − 200 − 50 = 750, less the 5 % of the simplified modality (37.50): 712.50.
    expect([year.expenses.reta, year.expenses.byKind.other, year.net]).toEqual([200, 50, 712.5]);
  });

  it('takes the 5 % of the simplified modality in the Renta even with the option of the 130 off', () => {
    // Art. 30.2.4.ª RIRPF: in the Renta it is part of the modality, not a choice.
    const inputs = { ...inputsOf(four(quarter(1000)), null), hardToJustify: false };
    const year = annualActivity(2026, inputs);
    expect([year.expenses.hardToJustify, year.net]).toEqual([50, 950]);
  });
});

describe('Farming in modules (Orden HAC/1425/2025, anexo I)', () => {
  const none = {
    externalMeans: false,
    staffShare: 0,
    rentedShare: 0,
    irrigatedShare: 0,
    boughtFeed: false,
    organic: false,
    forestPlan: false,
  };
  const base: AgrarianModulesInput = {
    rows: [],
    pacAid: 0,
    depreciation: 0,
    correctors: none,
    youngFarmer: false,
    refunds: 0,
    extraordinary: 0,
  };

  it('spreads the CAP aid over the crops and applies the correctors in order', () => {
    // Aid 20,000 over 80,000: cereals 62,500 × 0.26 + pork 25,000 × 0.13 + olive oil made 12,500 ×
    // 0.36 = 24,000 − 2,000 = 22,000 × 0.85 (staff 25 %) × 0.95 (half rented) × 0.95 (organic) =
    // 16,876.75 − 5 % (843.84) = 16,032.91 − 500 extraordinary = 15,532.91
    const r = agrarianModules(
      {
        ...base,
        rows: [
          { product: 'cereals', income: 50000 },
          { product: 'porkMeat', income: 20000 },
          { product: 'olive', income: 10000, transformed: true },
        ],
        pacAid: 20000,
        depreciation: 2000,
        correctors: { ...none, staffShare: 25, rentedShare: 50, organic: true },
        extraordinary: 500,
      },
      2026
    );
    expect(r.boxes).toEqual({
      '1536': 100000,
      '1537': 24000,
      '1538': 2000,
      '1539': 22000,
      '1548': 16876.75,
      '1549': 843.84,
      '1550': 16032.91,
      '1551': 0,
      '0239': 0,
      '1552': 500,
      '1553': 15532.91,
    });
    expect(r.warnings).toEqual([]);
  });

  it('gives 0.56 to the aid when the rest is under 25 % and reduces young farmers 25 %', () => {
    // 5,000 × 0.26 + 20,000 × 0.56 = 12,500 − 625 = 11,875 − 25 % = 8,906.25
    const r = agrarianModules(
      { ...base, rows: [{ product: 'cereals', income: 5000 }], pacAid: 20000, youngFarmer: true },
      2026
    );
    expect([r.boxes['1537'], r.boxes['1551'], r.net]).toEqual([12500, 2968.75, 8906.25]);
  });

  it('leaves the works for others out of the CAP aid, and warns when there is no crop for it', () => {
    // Aid 1,000 over the cereals only: (4,000 + 1,000) × 0.26 + 1,000 × 0.56 = 1,860.
    const services = { product: 'otherServices', income: 1000 };
    const r = agrarianModules(
      { ...base, rows: [{ product: 'cereals', income: 4000 }, services], pacAid: 1000 },
      2026
    );
    expect(r.boxes['1537']).toBe(1860);
    // Only services and the aid: 0.56 for both, with a warning.
    const alone = agrarianModules({ ...base, rows: [services], pacAid: 1000 }, 2026);
    expect(alone.boxes['1537']).toBe(1120);
    expect(alone.warnings).toEqual(['aidWithoutCrops']);
  });

  it('applies the other correctors', () => {
    const one = (c: Partial<typeof none>, product = 'cereals') =>
      agrarianModules(
        { ...base, rows: [{ product, income: 100000 }], correctors: { ...none, ...c } },
        2026
      ).boxes['1548'];
    // 26,000 × 0.75 / × 0.50 / × (1 − 40 % × 0.25) = 0.90 / staff over 40 % 0.75
    expect(one({ externalMeans: true, staffShare: 50 })).toBe(19500);
    expect(one({ boughtFeed: true })).toBe(13000);
    expect(one({ irrigatedShare: 40 })).toBe(23400);
    expect(one({ staffShare: 45 })).toBe(19500);
    expect(one({ rentedShare: 150 })).toBe(23400);
    // Forestry: only its own corrector (0.80 with a plan).
    expect(one({ forestPlan: true, organic: true }, 'forestShort')).toBe(20800);
    expect(one({ organic: true }, 'forestShort')).toBe(26000);
  });

  it('uses the reductions of 2025, a lower local index and says what it does not know', () => {
    expect(indexOf({ product: 'beekeeping', income: 1 }, 2025).index).toBe(0.13);
    expect(indexOf({ product: 'beekeeping', income: 1 }, 2026).index).toBe(0.26);
    expect(indexOf({ product: 'cereals', income: 1 }, 2025).index).toBe(0.26);
    expect(indexOf({ product: 'cereals', income: 1, reduced: 0.2 }, 2026).index).toBe(0.2);
    expect(indexOf({ product: 'cereals', income: 1, reduced: 0.4 }, 2026).index).toBe(0.26);
    expect(indexOf({ product: 'tableGrapes', income: 1, transformed: true }, 2026)).toEqual({
      index: 0.32,
      warning: 'noTransformed',
    });
    expect(indexOf({ product: 'nope', income: 1 }, 2026)).toEqual({
      index: 0,
      warning: 'unknownProduct',
    });
    const r = agrarianModules(
      {
        ...base,
        rows: [
          { product: 'cereals', income: 300000 },
          { product: 'nope', income: -5 },
        ],
        depreciation: -1,
        refunds: -1,
        extraordinary: -1,
      },
      2027
    );
    expect(r.warnings).toEqual(['year', 'unknownProduct', 'limit']);
    expect(r.boxes['1538']).toBe(0);
  });

  it('gives nothing to reduce when the yield is not positive', () => {
    const r = agrarianModules(
      { ...base, rows: [{ product: 'cereals', income: 0 }], depreciation: 100 },
      2026
    );
    expect([r.boxes['1548'], r.boxes['1549'], r.net]).toEqual([-90, 0, -90]);
    expect(agrarianModules({ ...base, refunds: 50 }, 2026).net).toBe(-50);
  });
});

describe('Annual activity: other activities in modules (annex II)', () => {
  const four = (q: ManualData['quarters'][number]): ManualData['quarters'] => [q, q, q, q];
  // The official case of the Manual de Renta 2025, cap. 8 (bar 673.1): net income 41,173.16.
  const bar = {
    ...NO_OBJECTIVE,
    activityId: 'm45',
    unitsStart: [3, 1, 35, 8, 10, 0, 1],
    unitsYear: [3.66, null, null, null, null, null, null],
    staffLastYear: 3,
    extraordinary: 1200,
  };
  // The 6,050 € of depreciation of the case, as one asset of the transport and other group (25 %).
  const asset = {
    name: 'Equipos',
    group: 'm3',
    cost: 24200,
    start: '2024-01-01',
    use: 100,
    method: 'table' as const,
  };

  it('gives the net income, its boxes and the instalments of the 131 for the 0604', () => {
    const year = annualActivity(
      2025,
      inputsOf(
        four(quarter()),
        { method: 'objective', objective: bar, assets: [asset] },
        {
          priorYearNet: 41173.16,
        }
      )
    );
    expect(year.regime).toBe('objective');
    expect(year.net).toBe(41173.16);
    expect(year.boxes).toMatchObject({
      '1465': 50111.95,
      '1466': 2693.38,
      '1467': 6050,
      '1474': 44603.33,
      '1475': 2230.17,
      '1477': 1200,
      '1479': 41173.16,
    });
    expect(year.objective?.input).toMatchObject({ activityId: 'm45', extraDepreciation: 6050 });
    // 131 with the data at 1 January (3 salaried, no increase): see objectiveModules.test.ts;
    // here the depreciation at 1 January is the same 6,050: 47,434.79 − 1,622.52 − 6,050 =
    // 39,762.27 → 30,586.03 + 1.30 × 9,176.24 = 42,515.14; 5 % = 2,125.76; 40,389.38 × 4 % = 1,615.58.
    expect(year.payments130.quarters).toEqual([1615.58, 1615.58, 1615.58, 1615.58]);
    expect(year.payments130.source).toEqual(['estimated', 'estimated', 'estimated', 'estimated']);
    expect(year.warnings).toEqual(expect.arrayContaining(['payments131', 'payments130Estimated']));
    expect(year.warnings).not.toContain('objective');
  });

  it('takes the 131 filed, says when the activity is missing and when the year has no order', () => {
    const filed = annualActivity(
      2026,
      inputsOf(four(quarter()), {
        method: 'objective',
        objective: bar,
        paid130: [100, 100, 100, 100],
      })
    );
    expect(filed.payments130.total).toBe(400);
    const none = annualActivity(2026, inputsOf(four(quarter()), { method: 'objective' }));
    expect(none.net).toBeNull();
    expect(none.warnings).toContain('objective');
    expect(none.payments130.total).toBe(0);
    const farm = annualActivity(
      2026,
      inputsOf(four(quarter()), { method: 'objective', agrarian: true, modules: null })
    );
    expect(farm.warnings).toContain('objective');
    const unknown = annualActivity(
      2026,
      inputsOf(four(quarter()), { method: 'objective', objective: { ...bar, activityId: 'zz' } })
    );
    expect(unknown.warnings).toContain('objective');
    const later = annualActivity(
      2027,
      inputsOf(four(quarter()), { method: 'objective', objective: bar })
    );
    expect(later.warnings).toContain('modules');
    // Without the table of módulos of the year (2024) the 131 is not estimated.
    const old = annualActivity(
      2024,
      inputsOf(four(quarter()), { method: 'objective', objective: bar })
    );
    expect(old.payments130.total).toBe(0);
  });
});
