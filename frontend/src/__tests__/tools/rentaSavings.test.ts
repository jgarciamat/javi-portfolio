import { computeRenta, type RentaInput } from '@modules/tools/domain/rentaCalc';
import type { Deduction, RentaState } from '@modules/tools/domain/rentaData';
import {
  EXAMPLE_SPECIAL,
  EXAMPLE_SPENT,
  deductionSavings,
  exampleAmount,
  markedSaving,
} from '@modules/tools/domain/rentaSavings';

const deduction = (id: string, over: Partial<Deduction>): Deduction => ({
  id,
  group: 'other',
  title: id,
  summary: '',
  kind: 'fixed',
  requirements: '',
  url: 'https://example.test',
  ...over,
});

const DEDUCTIONS = [
  deduction('f', { amount: 100 }),
  deduction('p', { kind: 'percent', percent: 15, baseLimit: 500 }),
  deduction('s', { kind: 'special' }),
  deduction('s2', { kind: 'special', amount: 300 }),
  deduction('big', { kind: 'special' }),
  deduction('lim', { amount: 50, incomeLimit: { individual: 1000 } }),
  deduction('estado-maternidad', { perChild: [1200] }),
];

const flat = [{ from: 0, rate: 10 }];
const state: RentaState = {
  year: 2025,
  scale: flat,
  defaultRegionalScale: flat,
  minimums: {
    personal: 5000,
    descendants: [0],
    under3: 0,
    ascendants: 0,
    ascendantsOver75: 0,
    over65: 0,
    over75: 0,
    disability33: 0,
    disability65: 0,
    assistance: 0,
  },
  workExpenses: { general: 0, disability33: 0, disability65: 0 },
  workReduction: { maxReduction: 0, fullUntil: 0, zeroFrom: 0, notes: '' },
  baseReductions: { pensionPlanLimit: 0, pensionPlanEmployerLimit: 0, notes: '' },
  deductions: DEDUCTIONS,
  source: '',
};

/**
 * 10,000 of a pension (no 340 € deduction), 10 % on both halves less 10 % of the 5,000 minimum:
 * 500 of State tax and 500 of regional tax, 1,000 to pay before deductions.
 */
const input = (choices: RentaInput['choices'] = {}): RentaInput => ({
  gross: 10000,
  socialSecurity: 0,
  withheld: 0,
  nonSalaryIncome: 10000,
  workExpensesExtra: 0,
  geographicMobility: false,
  pensionPlan: 0,
  pensionPlanEmployer: 0,
  spousePlan: 0,
  compensatoryPension: 0,
  rental: null,
  imputedValues: { standard: 0, revised: 0 },
  savings: 0,
  family: { age: 40, disability: 0, children: [], ascendants: [], sharedChildren: false },
  state,
  ccaa: { id: 'x', name: 'X', regime: 'common', deductions: [], source: '' },
  extras: {
    savingsScale: { state: flat, regional: flat, notes: '', url: '' },
    geographicMobilityExtra: 0,
  },
  imputationRates: { standard: 2, revised: 1.1 },
  choices,
  workReduction: () => 0,
});

const savingsFor = (choices: RentaInput['choices'] = {}) => {
  const i = input(choices);
  return deductionSavings(i, DEDUCTIONS, computeRenta(i));
};

describe('what each deduction saves', () => {
  it('starts from 1,000 € to pay', () => {
    expect(computeRenta(input()).result).toBe(1000);
  });

  it('works out the ones not marked, with an example when they depend on an amount', () => {
    const s = savingsFor();
    expect(s.f).toEqual({ saving: 100, blocked: false, example: null });
    // 15 % of an example of 500 spent (the base limit, under the usual 1,000).
    expect(s.p).toEqual({ saving: 75, blocked: false, example: 500 });
    expect(s.s).toEqual({ saving: EXAMPLE_SPECIAL, blocked: false, example: EXAMPLE_SPECIAL });
    expect(s.s2).toEqual({ saving: 300, blocked: false, example: 300 });
    // 10,000 of base is over the limit of 1,000.
    expect(s.lim).toEqual({ saving: 0, blocked: true, example: null });
    // Refundable: it is paid even beyond the tax.
    expect(s['estado-maternidad'].saving).toBe(1200);
  });

  it('uses what was typed, and an example while a marked one waits for its amount', () => {
    const s = savingsFor({
      f: { on: true, units: 1 },
      s2: { on: true, amount: 0 },
      s: { on: false, amount: 40 },
    });
    expect(s.f.saving).toBe(100);
    expect(s.s2).toEqual({ saving: 300, blocked: false, example: 300 });
    expect(s.s).toEqual({ saving: 40, blocked: false, example: null });
  });

  it('counts that the State tax runs out: together they save less than one by one', () => {
    const choices = { f: { on: true, units: 1 }, big: { on: true, amount: 450 } };
    const s = savingsFor(choices);
    // 550 of deductions on 500 of State tax: without f, 450 still fit, so f only adds 50.
    expect(s.f.saving).toBe(50);
    expect(s.big.saving).toBe(400);
    const i = input(choices);
    expect(markedSaving(i, computeRenta(i))).toBe(500);
    expect(markedSaving(input(), computeRenta(input()))).toBe(0);
  });

  it('picks an example amount by kind', () => {
    expect(exampleAmount(deduction('a', { kind: 'percent' }))).toBe(EXAMPLE_SPENT);
    expect(exampleAmount(deduction('b', { kind: 'percent', baseLimit: 5000 }))).toBe(EXAMPLE_SPENT);
    expect(exampleAmount(deduction('c', { kind: 'special', limit: 250 }))).toBe(250);
  });
});
