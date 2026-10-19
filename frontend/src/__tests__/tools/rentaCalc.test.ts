import {
  applyMinimum,
  applyScale,
  lowPayDeduction,
  computeMinimum,
  computeRenta,
  countsAsDescendant,
  deductionAmount,
  disabilityAmount,
  incomeFactor,
  isRefundable,
  rentalNet,
  splitDeduction,
  mergeMinimums,
  type Family,
  type RentaInput,
  type FullMinimums,
} from '@modules/tools/domain/rentaCalc';
import type { Deduction, RentaCcaa, RentaState, TaxBracket } from '@modules/tools/domain/rentaData';

const scale: TaxBracket[] = [
  { from: 0, rate: 9.5 },
  { from: 12450, rate: 12 },
  { from: 20200, rate: 15 },
  { from: 35200, rate: 18.5 },
];

const minimums: FullMinimums = {
  personal: 5550,
  descendants: [2400, 2700, 4000, 4500],
  under3: 2800,
  ascendants: 1150,
  ascendantsOver75: 1400,
  over65: 1150,
  over75: 1400,
  disability33: 3000,
  disability65: 9000,
  assistance: 3000,
};

const deduction = (over: Partial<Deduction>): Deduction => ({
  id: 'x',
  group: 'other',
  title: 'X',
  summary: '',
  kind: 'fixed',
  requirements: '',
  url: 'https://example.test',
  ...over,
});

const state: RentaState = {
  year: 2025,
  scale,
  defaultRegionalScale: scale,
  minimums,
  workExpenses: { general: 2000, disability33: 3500, disability65: 7750 },
  workReduction: { maxReduction: 0, fullUntil: 0, zeroFrom: 0, notes: '' },
  baseReductions: { pensionPlanLimit: 1500, pensionPlanEmployerLimit: 8500, notes: '' },
  deductions: [
    deduction({ id: 'estado-maternidad', kind: 'fixed', perChild: [1200] }),
    deduction({ id: 'estado-donativos', kind: 'percent', percent: 80, baseLimit: 250 }),
  ],
  source: 'x',
};

const ccaa: RentaCcaa = {
  id: 'prueba',
  name: 'Prueba',
  regime: 'common',
  scale: [
    { from: 0, rate: 8 },
    { from: 20000, rate: 16 },
  ],
  minimums: { personal: 6000 },
  deductions: [
    deduction({ id: 'prueba-alquiler', kind: 'percent', percent: 15, baseLimit: 4000, limit: 500 }),
  ],
  source: 'x',
};

const alone: Family = {
  age: 40,
  disability: 0,
  children: [],
  ascendants: [],
  sharedChildren: false,
};

const savingsScale = {
  state: [
    { from: 0, rate: 9.5 },
    { from: 6000, rate: 10.5 },
    { from: 50000, rate: 11.5 },
  ] as TaxBracket[],
  regional: [
    { from: 0, rate: 9.5 },
    { from: 6000, rate: 10.5 },
    { from: 50000, rate: 11.5 },
  ] as TaxBracket[],
  notes: '',
  url: 'https://example.test',
};

/** An input with nothing but the pay; tests change what they need. */
const input = (over: Partial<RentaInput> = {}): RentaInput => ({
  gross: 32000,
  socialSecurity: 2000,
  withheld: 4000,
  workExpensesExtra: 0,
  geographicMobility: false,
  pensionPlan: 0,
  pensionPlanEmployer: 0,
  spousePlan: 0,
  compensatoryPension: 0,
  rental: null,
  imputedValues: { standard: 0, revised: 0 },
  savings: 0,
  family: alone,
  state,
  ccaa,
  extras: { savingsScale, geographicMobilityExtra: 2000 },
  imputationRates: { standard: 2, revised: 1.1 },
  choices: {},
  workReduction: () => 0,
  ...over,
});

describe('applyScale', () => {
  it('taxes every bracket only for the part of the base inside it', () => {
    expect(applyScale(scale, 30000)).toBe(3582.75);
    expect(applyScale(scale, 12450)).toBe(1182.75);
    expect(applyScale(scale, 0)).toBe(0);
  });

  it('rounds the tax of each bracket to the cent, half up (case 13 of the bank)', async () => {
    const { rentaState } = await import('@modules/tools/data/renta/state');
    // 1,182.75 + 930 + 2,250 + 2,133 × 18.5 % (394.605 → 394.61) = 4,757.36, not 4,757.35.
    expect(applyScale(rentaState.scale, 37333)).toBe(4757.36);
    expect(applyMinimum(rentaState.scale, 37333, 5550)).toBe(4230.11);
    expect(applyScale(scale, -10)).toBe(0);
    expect(applyScale(scale, Number.NaN)).toBe(0);
    expect(applyScale(scale, 50000)).toBe(1182.75 + 930 + 2250 + 14800 * 0.185);
  });

  it('lowers the minimum from the tax and never goes below zero', () => {
    expect(applyMinimum(scale, 30000, 5550)).toBe(3055.5);
    expect(applyMinimum(scale, 3000, 5550)).toBe(0);
  });
});

describe('computeMinimum', () => {
  it('counts the taxpayer alone', () => {
    expect(computeMinimum(alone, minimums)).toEqual({
      total: 5550,
      items: [{ key: 'personal', amount: 5550 }],
    });
  });

  it('adds the extra for age from 65 and from 75 years turned by 31 December', () => {
    const total = (age: number) => computeMinimum({ ...alone, age }, minimums).total;
    expect(total(64)).toBe(5550);
    expect(total(65)).toBe(5550 + 1150);
    expect(total(66)).toBe(5550 + 1150);
    expect(total(74)).toBe(5550 + 1150);
    expect(total(75)).toBe(5550 + 1150 + 1400);
    expect(total(80)).toBe(5550 + 1150 + 1400);
  });

  it('gives each child its amount by order of birth, the oldest first, with the extra under 3', () => {
    const family: Family = {
      ...alone,
      children: [
        { age: 1, disability: 0 },
        { age: 12, disability: 0 },
        { age: 8, disability: 0 },
      ],
    };
    // 12 -> 2400, 8 -> 2700, 1 -> 4000 + 2800
    expect(computeMinimum(family, minimums).items).toContainEqual({
      key: 'descendants',
      amount: 2400 + 2700 + 4000 + 2800,
    });
  });

  it('repeats the amount of the fourth child, halves it when shared and skips adults', () => {
    const kids = Array.from({ length: 5 }, (_, i) => ({ age: 10 + i, disability: 0 as const }));
    expect(computeMinimum({ ...alone, children: kids }, minimums).items[1].amount).toBe(
      2400 + 2700 + 4000 + 4500 + 4500
    );
    expect(
      computeMinimum(
        { ...alone, sharedChildren: true, children: [{ age: 5, disability: 0 }] },
        minimums
      ).items[1].amount
    ).toBe(1200);
    expect(
      computeMinimum({ ...alone, children: [{ age: 30, disability: 0 }] }, minimums).items
    ).toHaveLength(1);
    expect(countsAsDescendant({ age: 30, disability: 33 })).toBe(true);
    expect(countsAsDescendant({ age: 25, disability: 0 })).toBe(false);
  });

  it('adds ascendants and disabilities', () => {
    const family: Family = {
      ...alone,
      disability: 65,
      ascendants: [
        { over75: true, disability: 33 },
        { over75: false, disability: 0 },
      ],
      children: [{ age: 2, disability: 65 }],
    };
    const result = computeMinimum(family, minimums);
    expect(result.items.find((i) => i.key === 'ascendants')?.amount).toBe(
      1150 + 1400 + 3000 + 1150
    );
    // 65 % adds the 3,000 € of assistance (LIRPF art. 60.3) to the 9,000, also for a child.
    expect(result.items.find((i) => i.key === 'disability')?.amount).toBe(9000 + 3000);
    expect(result.items.find((i) => i.key === 'descendants')?.amount).toBe(
      2400 + 2800 + 9000 + 3000
    );
  });

  it('adds the assistance of 65 % to an ascendant, and the community its own amount', () => {
    const family: Family = { ...alone, ascendants: [{ over75: false, disability: 65 }] };
    expect(computeMinimum(family, minimums).items).toContainEqual({
      key: 'ascendants',
      amount: 1150 + 9000 + 3000,
    });
    // 33 % has no assistance.
    expect(disabilityAmount(33, minimums)).toBe(3000);
    // Madrid's own amounts (9,659.44 + 3,219.81 of assistance).
    const madrid = mergeMinimums(minimums, { disability65: 9659.44, assistance: 3219.81 });
    expect(disabilityAmount(65, madrid)).toBe(12879.25);
  });

  it('uses the amounts of the community where it has its own', () => {
    expect(mergeMinimums(minimums, { personal: 6000, descendants: [3000] })).toMatchObject({
      personal: 6000,
      descendants: [3000],
      under3: 2800,
    });
    expect(mergeMinimums(minimums)).toEqual(minimums);
    expect(mergeMinimums(minimums, { personal: undefined }).personal).toBe(5550);
  });
});

describe('deductionAmount', () => {
  it('does nothing when it does not apply', () => {
    expect(deductionAmount(deduction({ amount: 100 }), { on: false })).toBe(0);
  });

  it('multiplies a fixed amount by the units, with amounts by child', () => {
    expect(deductionAmount(deduction({ amount: 100 }), { on: true })).toBe(100);
    expect(deductionAmount(deduction({ amount: 100 }), { on: true, units: 3 })).toBe(300);
    expect(deductionAmount(deduction({ perChild: [100, 150, 200] }), { on: true, units: 4 })).toBe(
      100 + 150 + 200 + 200
    );
    expect(deductionAmount(deduction({ perChild: [], amount: 50 }), { on: true, units: 2 })).toBe(
      100
    );
    expect(deductionAmount(deduction({}), { on: true })).toBe(0);
    // The limit of a fixed amount is per unit.
    expect(deductionAmount(deduction({ amount: 1200, limit: 1200 }), { on: true, units: 2 })).toBe(
      2400
    );
    expect(deductionAmount(deduction({ amount: 1500, limit: 1200 }), { on: true })).toBe(1200);
  });

  it('takes a percentage of what was spent, within the limits', () => {
    const d = deduction({ kind: 'percent', percent: 15, baseLimit: 4000, limit: 500 });
    expect(deductionAmount(d, { on: true, amount: 2000 })).toBe(300);
    expect(deductionAmount(d, { on: true, amount: 9000 })).toBe(500);
    expect(deductionAmount(d, { on: true })).toBe(0);
    expect(deductionAmount(deduction({ kind: 'percent' }), { on: true, amount: 100 })).toBe(0);
  });

  it('takes what the person says for the special cases, with the limit', () => {
    expect(
      deductionAmount(deduction({ kind: 'special', limit: 300 }), { on: true, amount: 500 })
    ).toBe(300);
    expect(deductionAmount(deduction({ kind: 'special' }), { on: true, amount: -5 })).toBe(0);
    expect(deductionAmount(deduction({ kind: 'special' }), { on: true })).toBe(0);
  });

  it('knows which deductions are paid out even without tax to pay', () => {
    expect(isRefundable(deduction({ id: 'estado-maternidad' }))).toBe(true);
    expect(isRefundable(deduction({ id: 'estado-familia-numerosa' }))).toBe(true);
    expect(isRefundable(deduction({ id: 'estado-donativos' }))).toBe(false);
  });
});

describe('computeRenta', () => {
  const base = input();

  it('goes from the gross pay to what is to pay or to be refunded', () => {
    const r = computeRenta(base);
    expect(r.netIncome).toBe(28000);
    expect(r.taxBase).toBe(28000);
    expect(r.minimum).toMatchObject({ total: 5550, regionalTotal: 6000 });
    expect(r.stateQuota).toBe(applyMinimum(scale, 28000, 5550));
    expect(r.regionalQuota).toBe(applyMinimum(ccaa.scale as TaxBracket[], 28000, 6000));
    expect(r.netQuota).toBe(r.stateQuota + r.regionalQuota);
    expect(r.result).toBe(r.netQuota - 4000);
    expect(r.minimumSavings.personal).toBeGreaterThan(0);
    expect(r.savingsBase).toBe(0);
    expect(r.blocked).toEqual([]);
  });

  it('uses the default scale of the community when it has none', () => {
    const r = computeRenta(input({ ccaa: { ...ccaa, scale: undefined, minimums: undefined } }));
    expect(r.regionalQuota).toBe(r.stateQuota);
  });

  it('lowers the base with the work reduction and the pension plan, within their limits', () => {
    const r = computeRenta(input({ workReduction: () => 1000, pensionPlan: 3000 }));
    expect(r.workReduction).toBe(1000);
    expect(r.pensionReduction).toBe(3000);
    expect(r.taxBase).toBe(28000 - 1000 - 3000);
    // Pension plan: up to 10,000 together with the employer's, and up to 30 % of the net pay.
    expect(
      computeRenta(input({ pensionPlan: 9000, pensionPlanEmployer: 5000 })).pensionReduction
    ).toBe(8400);
    expect(computeRenta(input({ gross: 100, workReduction: () => 5000 })).netIncome).toBe(0);
    expect(computeRenta(input({ gross: 2500, pensionPlan: 900 })).pensionReduction).toBe(0);
  });

  it('allows more work expenses with a disability, a move and union fees', () => {
    expect(computeRenta(input({ family: { ...alone, disability: 33 } })).netIncome).toBe(
      32000 - 2000 - 2000 - 3500
    );
    expect(computeRenta(input({ family: { ...alone, disability: 65 } })).netIncome).toBe(
      32000 - 2000 - 2000 - 7750
    );
    expect(computeRenta(input({ geographicMobility: true })).netIncome).toBe(28000 - 2000);
    expect(computeRenta(input({ workExpensesExtra: 300 })).netIncome).toBe(28000 - 300);
  });

  it('reduces the base with a spouse plan (up to 1,000) and a compensatory pension', () => {
    const r = computeRenta(input({ spousePlan: 5000, compensatoryPension: 1200 }));
    expect(r.otherReductions).toBe(2200);
    expect(r.taxBase).toBe(28000 - 2200);
    expect(computeRenta(input({ gross: 3000, compensatoryPension: 9999 })).taxBase).toBe(0);
  });

  it('adds the net rent of properties after expenses, depreciation and the reduction', () => {
    expect(rentalNet(null)).toBe(0);
    const rental = { income: 12000, expenses: 3000, amortization: 1000, reductionPercent: 50 };
    expect(rentalNet(rental)).toBe(4000);
    expect(rentalNet({ ...rental, reductionPercent: 200 })).toBe(800);
    expect(rentalNet({ ...rental, expenses: 20000 })).toBe(-9000);
    const r = computeRenta(input({ rental }));
    expect(r.rentalNet).toBe(4000);
    expect(r.taxBase).toBe(28000 + 4000);
  });

  it('adds the imputed income of properties that are not rented', () => {
    const r = computeRenta(input({ imputedValues: { standard: 50000, revised: 100000 } }));
    expect(r.imputedIncome).toBe(1000 + 1100);
    expect(r.taxBase).toBe(28000 + 2100);
  });

  it('taxes interest, dividends and gains on their own scale', () => {
    const without = computeRenta(input());
    const r = computeRenta(input({ savings: 10000 }));
    expect(r.savingsBase).toBe(10000);
    // 6,000 at 9.5 % and 4,000 at 10.5 %, for the State and again for the community.
    expect(r.savingsQuota).toBe(2 * (570 + 420));
    expect(r.netQuota - without.netQuota).toBe(r.savingsQuota);
  });

  it('moves the part of the minimum that does not fit in the general base to savings', () => {
    const r = computeRenta(input({ gross: 4000, socialSecurity: 0, savings: 5000, withheld: 0 }));
    // General base 2,000: the minimum of 5,550 (6,000 in the community) takes the rest from savings.
    expect(r.taxBase).toBe(2000);
    expect(r.stateQuota).toBeCloseTo(applyScale(savingsScale.state, 5000 - 3550), 2);
    expect(r.regionalQuota).toBeCloseTo(applyScale(savingsScale.regional, 5000 - 4000), 2);
  });

  it('does not give the reduction for low pay when the other income passes 6,500 euros', () => {
    const lowPay = { gross: 14000, socialSecurity: 0, workReduction: () => 3000 };
    expect(computeRenta(input({ ...lowPay, savings: 3000 })).workReduction).toBe(3000);
    expect(computeRenta(input({ ...lowPay, savings: 7000 })).workReduction).toBe(0);
  });

  it('applies the deductions of the State and of the community to their own tax', () => {
    const r = computeRenta(
      input({
        choices: {
          'estado-donativos': { on: true, amount: 100 },
          'prueba-alquiler': { on: true, amount: 3000 },
        },
      })
    );
    expect(r.stateDeductions).toBe(80);
    expect(r.regionalDeductions).toBe(450);
    expect(r.lines).toEqual([
      expect.objectContaining({ id: 'estado-donativos', scope: 'state', amount: 80 }),
      expect.objectContaining({ id: 'prueba-alquiler', scope: 'regional', amount: 450 }),
    ]);
    expect(r.netQuota).toBeCloseTo(r.stateQuota + r.regionalQuota - 530, 2);
  });

  it('never lowers a tax below zero with an ordinary deduction, but pays out the refundable ones', () => {
    const r = computeRenta(
      input({
        gross: 9000,
        socialSecurity: 0,
        withheld: 0,
        family: { ...alone, children: [{ age: 1, disability: 0 }] },
        choices: {
          'estado-donativos': { on: true, amount: 250 },
          'estado-maternidad': { on: true, units: 1 },
          'prueba-alquiler': { on: true, amount: 4000 },
        },
      })
    );
    expect(r.stateQuota).toBe(0);
    expect(r.stateDeductions).toBe(0);
    expect(r.regionalDeductions).toBe(0);
    expect(r.refundable).toBe(1200);
    expect(r.result).toBe(-1200);
  });

  it('blocks a deduction when the base is over its limit and reduces it gradually', () => {
    const limited: RentaState = {
      ...state,
      deductions: [
        deduction({
          id: 'estado-tope',
          kind: 'fixed',
          amount: 100,
          incomeLimit: { individual: 20000 },
        }),
        deduction({
          id: 'estado-gradual',
          kind: 'fixed',
          amount: 100,
          incomeLimit: { individual: 30000, phaseOutFrom: 20000, phaseOutTo: 30000 },
        }),
      ],
    };
    const choices = { 'estado-tope': { on: true }, 'estado-gradual': { on: true } };
    const r = computeRenta(input({ state: limited, choices }));
    // Base 28,000: over the first limit, 20 % of the second.
    expect(r.blocked).toEqual(['estado-tope']);
    expect(r.stateDeductions).toBe(20);
    const below = computeRenta(input({ state: limited, choices, gross: 20000, socialSecurity: 0 }));
    expect(below.blocked).toEqual([]);
  });

  it('measures a limit after the personal minimum when the deduction says so', () => {
    const afterMinimum: RentaState = {
      ...state,
      deductions: [
        deduction({
          id: 'estado-tras-minimo',
          kind: 'fixed',
          amount: 100,
          incomeLimit: { individual: 18900, afterMinimum: true },
        }),
      ],
    };
    const choices = { 'estado-tras-minimo': { on: true } };
    // Base 24,000 less the minimum is under 18,900; 26,000 is over it.
    expect(
      computeRenta(input({ state: afterMinimum, choices, gross: 26000, socialSecurity: 0 })).blocked
    ).toEqual([]);
    expect(
      computeRenta(input({ state: afterMinimum, choices, gross: 28000, socialSecurity: 0 })).blocked
    ).toEqual(['estado-tras-minimo']);
  });

  it('shows what each part of the minimum saves', () => {
    const r = computeRenta(
      input({
        family: {
          ...alone,
          children: [
            { age: 5, disability: 0 },
            { age: 2, disability: 0 },
          ],
        },
      })
    );
    expect(r.minimumSavings.descendants).toBeGreaterThan(r.minimumSavings.personal * 0.5);
    const without = computeRenta(base);
    expect(
      without.stateQuota + without.regionalQuota - (r.stateQuota + r.regionalQuota)
    ).toBeCloseTo(r.minimumSavings.descendants, 1);
  });
});

describe('incomeFactor', () => {
  const limited = deduction({ incomeLimit: { individual: 30000, joint: 50000 } });

  it('allows everything without a limit and up to the limit', () => {
    expect(incomeFactor(deduction({}), 1e9)).toBe(1);
    expect(incomeFactor(limited, 30000)).toBe(1);
    expect(incomeFactor(limited, 30001)).toBe(0);
    expect(incomeFactor(limited, 45000, true)).toBe(1);
    expect(incomeFactor(limited, 51000, true)).toBe(0);
    expect(incomeFactor(deduction({ incomeLimit: { individual: 100 } }), 200, true)).toBe(0);
  });

  it('goes down in proportion between the two ends when it has a phase out', () => {
    const gradual = deduction({
      incomeLimit: { individual: 30000, phaseOutFrom: 27000, phaseOutTo: 30000 },
    });
    expect(incomeFactor(gradual, 26000)).toBe(1);
    expect(incomeFactor(gradual, 28500)).toBeCloseTo(0.5, 5);
    expect(incomeFactor(gradual, 31000)).toBe(0);
  });
});

describe('computeRenta with the real data', () => {
  const run = async (id: string, gross: number, family: Family, choices = {}) => {
    const { loadCcaa } = await import('@modules/tools/data/renta');
    const { rentaState } = await import('@modules/tools/data/renta/state');
    const { rentaWorkExtras } = await import('@modules/tools/data/renta/estado-extra');
    const { workReductionOf } = await import('@modules/tools/domain/rentaWork');
    return computeRenta(
      input({
        gross,
        socialSecurity: gross * 0.065,
        withheld: 0,
        family,
        state: rentaState,
        ccaa: await loadCcaa(id),
        extras: rentaWorkExtras,
        choices,
        workReduction: workReductionOf(rentaState),
      })
    );
  };

  it('splits the home bought before 2013 in a State and a regional half (case 13 of the bank)', async () => {
    // DT 18.ª LIRPF: 7.5 % State + 7.5 % regional of up to 9,040 €. Before: only the 678 € of the State.
    const r = await run('madrid', 42000, alone, {
      'estado-vivienda-habitual-transitorio': { on: true, amount: 10000 },
    });
    expect(r.stateDeductions).toBe(678);
    expect(r.regionalDeductions).toBe(678);
    expect(r.lines.filter((l) => l.id === 'estado-vivienda-habitual-transitorio')).toEqual([
      expect.objectContaining({ scope: 'state', amount: 678 }),
      expect.objectContaining({ scope: 'regional', amount: 678 }),
    ]);
  });

  it('puts a 30,000 € salary in a believable tax range in Madrid and Cataluña', async () => {
    for (const id of ['madrid', 'cataluna']) {
      const r = await run(id, 30000, alone);
      expect(r.netIncome).toBe(30000 - 1950 - 2000);
      const rate = r.netQuota / 30000;
      expect(rate).toBeGreaterThan(0.1);
      expect(rate).toBeLessThan(0.17);
    }
    const madrid = await run('madrid', 30000, alone);
    const cataluna = await run('cataluna', 30000, alone);
    expect(cataluna.netQuota).toBeGreaterThan(madrid.netQuota);
  });

  it('lowers the tax with children, more with each one, and not below zero', async () => {
    const kids = (n: number): Family => ({
      ...alone,
      children: Array.from({ length: n }, (_, i) => ({ age: 6 + i, disability: 0 as const })),
    });
    const none = await run('madrid', 30000, alone);
    const one = await run('madrid', 30000, kids(1));
    const three = await run('madrid', 30000, kids(3));
    expect(one.netQuota).toBeLessThan(none.netQuota);
    expect(three.netQuota).toBeLessThan(one.netQuota);
    expect(three.netQuota).toBeGreaterThanOrEqual(0);
    expect(none.netQuota - one.netQuota).toBeCloseTo(one.minimumSavings.descendants, 0);
  });

  it('applies the work reduction to a low salary and the maternity deduction from the State', async () => {
    const low = await run('andalucia', 14000, alone);
    expect(low.workReduction).toBeGreaterThan(0);
    const mother = await run(
      'andalucia',
      22000,
      { ...alone, children: [{ age: 1, disability: 0 }] },
      { 'estado-maternidad': { on: true, units: 1 } }
    );
    expect(mother.refundable).toBe(1200);
  });

  it('measures the work reduction on the net pay before the 2,000 € of other expenses', async () => {
    const { loadCcaa } = await import('@modules/tools/data/renta');
    const { rentaState } = await import('@modules/tools/data/renta/state');
    const { rentaWorkExtras } = await import('@modules/tools/data/renta/estado-extra');
    const { workReductionOf } = await import('@modules/tools/domain/rentaWork');
    const base = {
      gross: 17000,
      socialSecurity: 1000,
      state: rentaState,
      ccaa: await loadCcaa('castilla-y-leon'),
      extras: rentaWorkExtras,
      workReduction: workReductionOf(rentaState),
    };
    const worker = computeRenta(input({ ...base, family: { ...alone, disability: 33 } }));
    // 16,000 of net pay: 7,302 - 1.75 x (16,000 - 14,852); the 2,000 and the 3,500 come off after.
    expect(worker.workReduction).toBe(5293);
    expect(worker.netIncome).toBe(16000 - 2000 - 3500);
    const pensioner = computeRenta(
      input({ ...base, retired: true, family: { ...alone, disability: 33 } })
    );
    expect(pensioner.netIncome).toBe(16000 - 2000);
    expect(pensioner.workReduction).toBe(5293);
  });

  it('leaves pensions and benefits out of the 340 € deduction for low pay', async () => {
    const { loadCcaa } = await import('@modules/tools/data/renta');
    const { rentaState } = await import('@modules/tools/data/renta/state');
    const { rentaWorkExtras } = await import('@modules/tools/data/renta/estado-extra');
    const { workReductionOf } = await import('@modules/tools/domain/rentaWork');
    const base = {
      gross: 18500,
      socialSecurity: 1200,
      state: rentaState,
      ccaa: await loadCcaa('castilla-y-leon'),
      extras: rentaWorkExtras,
      workReduction: workReductionOf(rentaState),
    };
    const lowPayLine = (nonSalaryIncome?: number) =>
      computeRenta(input({ ...base, nonSalaryIncome })).lines.find(
        (l) => l.id === 'estado-rendimientos-trabajo-bajos'
      );
    expect(lowPayLine()).toBeUndefined();
    expect(lowPayLine(1900)?.amount).toBe(lowPayDeduction(16600, 0));
  });

  it('uses the disability amounts of La Rioja only for the descendants', async () => {
    const { loadCcaa } = await import('@modules/tools/data/renta');
    const { rentaState } = await import('@modules/tools/data/renta/state');
    const rioja = await loadCcaa('la-rioja');
    const merged = mergeMinimums(rentaState.minimums, rioja.minimums);
    const own = computeMinimum({ ...alone, disability: 65 }, merged);
    // The 3,000 € of assistance (LIRPF art. 60.3) are the State's: La Rioja does not change them.
    expect(own.items.find((i) => i.key === 'disability')?.amount).toBe(9000 + 3000);
    const kid = computeMinimum({ ...alone, children: [{ age: 10, disability: 65 }] }, merged);
    expect(kid.items.find((i) => i.key === 'descendants')?.amount).toBe(2400 + 9900 + 3000);
    const light = computeMinimum({ ...alone, children: [{ age: 10, disability: 33 }] }, merged);
    expect(light.items.find((i) => i.key === 'descendants')?.amount).toBe(2400 + 3300);
  });
});

describe('deduction for low pay', () => {
  it('gives 340 euros below 16,576 of pay, falls to zero at 18,276 and needs few other income', () => {
    expect(lowPayDeduction(15000, 0)).toBe(340);
    expect(lowPayDeduction(17500, 0)).toBe(155.2);
    expect(lowPayDeduction(18276, 0)).toBe(0);
    expect(lowPayDeduction(0, 0)).toBe(0);
    expect(lowPayDeduction(15000, 7000)).toBe(0);
  });

  it('lowers the quota but never below zero', () => {
    const low = computeRenta(input({ gross: 15000, socialSecurity: 0 }));
    expect(low.lines.some((l) => l.id === 'estado-rendimientos-trabajo-bajos')).toBe(
      low.stateDeductions > 0
    );
    const rich = computeRenta(input({ gross: 30000, socialSecurity: 0 }));
    expect(rich.lines.some((l) => l.id === 'estado-rendimientos-trabajo-bajos')).toBe(false);
  });
});

describe('splitDeduction', () => {
  it('rounds the regional part and leaves the rest to the State, so both add up', () => {
    // AEAT Manual 2025, c16 (renta-c16-03): 284.93 in two boxes of 50 %.
    expect(splitDeduction(284.93, 0.5)).toEqual({ state: 142.46, regional: 142.47 });
    expect(splitDeduction(1356, 0.5)).toEqual({ state: 678, regional: 678 });
    expect(splitDeduction(300, 0)).toEqual({ state: 300, regional: 0 });
  });
});
