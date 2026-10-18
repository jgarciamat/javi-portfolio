import { WITHHOLDING_SCALE } from '@modules/tools/data/payroll2026';
import { rentaState } from '@modules/tools/data/renta/state';
import { applyScale, computeMinimum } from '@modules/tools/domain/rentaCalc';
import type { RentaCcaa } from '@modules/tools/domain/rentaData';
import {
  cleanSalaryInput,
  exemptLimitOf,
  familyMinimum,
  netSalary,
  rentaEstimate,
  smiDeduction,
  socialSecurity,
  solidarityOf,
  withholding,
  type SalaryInput,
} from '@modules/tools/domain/salaryCalc';

/**
 * Worked examples, checked by hand with the 2026 figures: Orden PJC/297/2026 (Social Security) and
 * the AEAT withholding algorithm of 2026 (tables 1 and 2, art. 20 LIRPF, art. 85.3 RIRPF).
 */
const person = (over: Partial<SalaryInput> = {}): SalaryInput => ({
  gross: 30000,
  payments: 14,
  age: 35,
  situation: 3,
  children: 0,
  under3: 0,
  sharedChildren: false,
  disability: 0,
  contract: 'indefinite',
  ...over,
});
/** A community with the State's default regional scale and minimums (as Ceuta and Melilla). */
const DEFAULT_CCAA: RentaCcaa = {
  id: 'x',
  name: 'X',
  regime: 'common',
  deductions: [],
  source: '',
};

describe('withholding scale', () => {
  it('is the State scale plus the default regional one', () => {
    for (const base of [0, 5550, 12450, 20000, 35200, 59999, 60000, 150000, 300000, 400000]) {
      expect(applyScale(WITHHOLDING_SCALE, base)).toBeCloseTo(
        applyScale(rentaState.scale, base) + applyScale(rentaState.defaultRegionalScale, base),
        1
      );
    }
    // Table 2 of the algorithm: 24.000 → 4.225,50 + 3.800 × 30 % = 5.365,50.
    expect(applyScale(WITHHOLDING_SCALE, 24000)).toBe(5365.5);
  });
});

describe('socialSecurity', () => {
  it('takes 6.50 % of the monthly base with a permanent contract', () => {
    // 30.000 / 12 = 2.500 € a month: 4,70 % = 117,50; 1,55 % = 38,75; 0,10 % = 2,50; 0,15 % = 3,75.
    // 162,50 × 12 = 1.950 € a year.
    expect(socialSecurity(30000, 'indefinite')).toEqual({
      monthlyBase: 2500,
      unemploymentRate: 1.55,
      common: 1410,
      unemployment: 465,
      training: 30,
      mei: 45,
      solidarity: 0,
      total: 1950,
    });
  });

  it('charges 1.60 % of unemployment on temporary contracts and rounds every month', () => {
    // 16.000 / 12 = 1.333,33: 62,67 + 21,33 + 1,33 + 2,00 = 87,33 a month → 1.047,96 a year.
    const ss = socialSecurity(16000, 'short');
    expect(ss.unemploymentRate).toBe(1.6);
    expect(ss.unemployment).toBe(255.96);
    expect(ss.total).toBe(1047.96);
    expect(socialSecurity(16000, 'temporary').total).toBe(1047.96);
  });

  it('stops at the maximum base and adds the solidarity contribution above it', () => {
    // 90.000 / 12 = 7.500 €, base 5.101,20: 239,76 + 79,07 + 5,10 + 7,65 = 331,58 a month.
    // Solidarity: 510,12 × 0,19 % + 1.888,68 × 0,21 % = 0,97 + 3,97 = 4,94 a month → 59,28.
    const ss = socialSecurity(90000, 'indefinite');
    expect(ss.monthlyBase).toBe(5101.2);
    expect(ss.common + ss.unemployment + ss.training + ss.mei).toBeCloseTo(3978.96, 2);
    expect(ss.solidarity).toBe(59.28);
    expect(ss.total).toBe(4038.24);
  });

  it('works out the three tiers of the solidarity contribution', () => {
    expect(solidarityOf(5101.2)).toBe(0);
    expect(solidarityOf(4000)).toBe(0);
    // 510,12 × 0,19 % + 2.040,48 × 0,21 % + 2.348,20 × 0,24 % = 0,9692 + 4,2850 + 5,6357.
    expect(solidarityOf(10000)).toBe(10.89);
  });

  it('is zero without a salary', () => {
    expect(socialSecurity(Number.NaN, 'indefinite').total).toBe(0);
  });
});

describe('familyMinimum', () => {
  it('adds age, children (half when shared), under 3 and disability', () => {
    // 5.550 + (1.150 + 1.400) + (2.400 + 2.700 + 2.800) / 2 + 3.000 = 15.050.
    expect(
      familyMinimum({ age: 80, children: 2, under3: 1, sharedChildren: true, disability: 33 })
    ).toEqual({
      total: 15050,
      parts: [
        { key: 'personal', amount: 5550 },
        { key: 'age', amount: 2550 },
        { key: 'descendants', amount: 3950 },
        { key: 'disability', amount: 3000 },
      ],
    });
  });

  it('counts 65 as old enough, 4.500 € from the fourth child, and help for 65 % disability', () => {
    // 5.550 + 1.150 + (2.400 + 2.700 + 4.000 + 4.500 + 4.500) + 9.000 + 3.000 = 36.800.
    expect(
      familyMinimum({ age: 65, children: 5, under3: 0, sharedChildren: false, disability: 65 })
        .total
    ).toBe(36800);
    expect(
      familyMinimum({ age: 64, children: 0, under3: 0, sharedChildren: false, disability: 0 })
    ).toEqual({ total: 5550, parts: [{ key: 'personal', amount: 5550 }] });
  });

  it('uses the same age rule as the renta: 65 or 75 years turned by 31 December', () => {
    const family = { children: 0, under3: 0, sharedChildren: false, disability: 0 as const };
    const total = (age: number) => familyMinimum({ ...family, age }).total;
    expect([64, 65, 66, 74, 75].map(total)).toEqual([5550, 6700, 6700, 6700, 8100]);
    for (const age of [64, 65, 66, 74, 75, 80]) {
      const renta = {
        age,
        disability: 0 as const,
        children: [],
        ascendants: [],
        sharedChildren: false,
      };
      expect(total(age)).toBe(computeMinimum(renta, rentaState.minimums).total);
    }
  });
});

describe('cleanSalaryInput', () => {
  it('drops nonsense and keeps the family situation possible', () => {
    expect(
      cleanSalaryInput(
        person({ gross: -5, age: Number.NaN, children: 2.7, under3: 9, situation: 1 })
      )
    ).toMatchObject({ gross: 0, age: 0, children: 2, under3: 2, situation: 1 });
    // A single parent needs a child: without one, it is situation 3.
    expect(cleanSalaryInput(person({ situation: 1, children: 0 })).situation).toBe(3);
    expect(cleanSalaryInput(person({ children: 99, age: 300 }))).toMatchObject({
      children: 16,
      age: 120,
    });
  });
});

describe('exemptLimitOf', () => {
  it('reads table 1 by situation and children', () => {
    expect(exemptLimitOf(3, 0)).toBe(15876);
    expect(exemptLimitOf(3, 1)).toBe(16342);
    expect(exemptLimitOf(2, 5)).toBe(19262);
    expect(exemptLimitOf(1, 1)).toBe(17644);
    expect(exemptLimitOf(1, 0)).toBe(15876);
  });
});

describe('withholding and net salary', () => {
  it('works out 30.000 € in 14 payments, single and without children', () => {
    const r = netSalary(person());
    // Net income 30.000 − 1.950 = 28.050; no reduction (over 19.747,50); − 2.000 → base 26.050.
    // Quota 1: 4.225,50 + 5.850 × 30 % = 5.980,50; quota 2: 5.550 × 19 % = 1.054,50 → 4.926.
    // Cap (30.000 − 15.876) × 43 % = 6.073,32 does not bite. Rate 4.926 / 30.000 = 16,42 %.
    expect(r.withholding).toMatchObject({
      netIncome: 28050,
      otherExpenses: 2000,
      workReduction: 0,
      childrenReduction: 0,
      base: 26050,
      quota1: 5980.5,
      quota2: 1054.5,
      quota: 4926,
      exempt: false,
      capped: false,
      minimumRate: false,
      rate: 16.42,
      amount: 4926,
    });
    // 30.000 − 1.950 − 4.926 = 23.124 a year. Each payment 2.142,86 gross:
    // ordinary 2.142,86 − 162,50 − 351,86 = 1.628,50; extra 2.142,86 − 351,86 = 1.791,00.
    // 12 × 1.628,50 + 2 × 1.791 = 23.124.
    expect(r.yearlyNet).toBe(23124);
    expect(r.grossPayment).toBe(2142.86);
    expect(r.regularPayment).toBe(1628.5);
    expect(r.extraPayment).toBe(1791);
    // In 12 payments: 2.500 − 162,50 − 410,50 = 1.927 and no extra payment.
    expect(netSalary(person({ payments: 12 }))).toMatchObject({
      regularPayment: 1927,
      extraPayment: null,
    });
  });

  it('caps the minimum wage at 43 % of what passes the limit', () => {
    const r = netSalary(person({ gross: 17094, payments: 12 }));
    // SS: 1.424,50 a month → 66,95 + 22,08 + 1,42 + 2,14 = 92,59 → 1.111,08 a year.
    expect(r.socialSecurity.total).toBe(1111.08);
    // Net 15.982,92; reduction 7.302 − 1,75 × 1.130,92 = 5.322,89; base 15.982,92 − 2.000 − 5.322,89.
    expect(r.withholding.workReduction).toBe(5322.89);
    expect(r.withholding.base).toBe(8660.03);
    // Quota 8.660,03 × 19 % − 1.054,50 = 590,91, over the cap (17.094 − 15.876) × 43 % = 523,74.
    expect(r.withholding).toMatchObject({ quota1: 1645.41, quota: 523.74, capped: true });
    // 523,74 / 17.094 = 3,0638 % → 3,06 %; 17.094 × 3,06 % = 523,08.
    expect(r.withholding.rate).toBe(3.06);
    expect(r.withholding.amount).toBe(523.08);
    expect(r.yearlyNet).toBe(15459.84);
    // 1.424,50 − 92,59 − 43,59 = 1.288,32.
    expect(r.regularPayment).toBe(1288.32);
  });

  it('withholds nothing up to the limit of table 1, even on short contracts', () => {
    const r = withholding(person({ gross: 15000, contract: 'short' }), 975);
    expect(r).toMatchObject({ exempt: true, exemptLimit: 15876, rate: 0, amount: 0 });
    expect(r.minimumRate).toBe(false);
    // Married, spouse without income and a child: limit 18.130.
    expect(withholding(person({ gross: 18000, situation: 2, children: 1 }), 1170).exempt).toBe(
      true
    );
    expect(withholding(person({ gross: 0 }), 0)).toMatchObject({ exempt: true, rate: 0 });
  });

  it('raises short contracts to 2 %', () => {
    const r = netSalary(person({ gross: 16000, payments: 12, contract: 'short' }));
    // Net 16.000 − 1.047,96 = 14.952,04; reduction 7.302 − 1,75 × 100,04 = 7.126,93;
    // base 5.825,11; quota 1.106,77 − 1.054,50 = 52,27 → 0,32 %, raised to 2 % → 320 €.
    expect(r.withholding).toMatchObject({
      base: 5825.11,
      quota: 52.27,
      capped: false,
      minimumRate: true,
      rate: 2,
      amount: 320,
    });
  });

  it('lowers the base 600 € with more than two children and uses the minimum', () => {
    const r = netSalary(
      person({ gross: 40000, situation: 1, children: 3, under3: 1, age: 40 })
    ).withholding;
    // SS 216,67 × 12 = 2.600,04; net 37.399,96; − 2.000 − 600 = 34.799,96.
    // Minimum 5.550 + 2.400 + 2.700 + 4.000 + 2.800 = 17.450.
    // Quota 1: 4.225,50 + 14.599,96 × 30 % = 8.605,49; quota 2: 2.365,50 + 5.000 × 24 % = 3.565,50.
    // 5.039,99 / 40.000 = 12,5999 % → 12,59 % (over 35.200: no cap) → 5.036 €.
    expect(r).toMatchObject({
      childrenReduction: 600,
      base: 34799.96,
      quota1: 8605.49,
      quota2: 3565.5,
      quota: 5039.99,
      capped: false,
      rate: 12.59,
      amount: 5036,
    });
    expect(r.minimum.total).toBe(17450);
  });

  it('adds the expenses of a disability and never goes below zero', () => {
    const r = netSalary(person({ gross: 24000, payments: 12, age: 70, disability: 65 }));
    // SS 2.000 × 6,50 % = 130 → 1.560; net 22.440; other expenses 2.000 + 7.750 = 9.750 → 12.690.
    // Minimum 5.550 + 1.150 + 9.000 + 3.000 = 18.700: quota 2 (3.865,50) > quota 1 (2.423,10).
    expect(r.withholding).toMatchObject({
      otherExpenses: 9750,
      base: 12690,
      quota1: 2423.1,
      quota2: 3865.5,
      quota: 0,
      rate: 0,
    });
    expect(r.withholding.exempt).toBe(false);
    // 33 %: 2.000 + 3.500.
    expect(withholding(person({ disability: 33 }), 1950).otherExpenses).toBe(5500);
    // The expenses never pass the net income.
    expect(withholding(person({ gross: 1000 }), 65).otherExpenses).toBe(935);
  });
});

describe('smiDeduction (RDL 5/2026)', () => {
  it('is 590,89 € up to the minimum wage and falls 20 cents per euro to 20.048,45 €', () => {
    expect(smiDeduction(17094)).toBe(590.89);
    expect(smiDeduction(10000)).toBe(590.89);
    // 590,89 − 0,2 × (18.000 − 17.094) = 409,69.
    expect(smiDeduction(18000)).toBe(409.69);
    expect(smiDeduction(20048.45)).toBe(0);
    expect(smiDeduction(0)).toBe(0);
  });
});

describe('rentaEstimate', () => {
  it('matches the withholding when the general scale is the default one', () => {
    const e = rentaEstimate(netSalary(person()), DEFAULT_CCAA);
    // Base 26.050: State 1.182,75 + 930 + 877,50 = 2.990,25 − 527,25 = 2.463 (and the same regional).
    expect(e).toEqual({
      base: 26050,
      stateQuota: 2463,
      regionalQuota: 2463,
      smiDeduction: 0,
      quota: 4926,
      difference: 0,
    });
  });

  it('gives back what was withheld from the minimum wage', () => {
    const e = rentaEstimate(netSalary(person({ gross: 17094, payments: 12 })), DEFAULT_CCAA);
    // Base 8.660,03: 822,70 − 527,25 = 295,45 twice = 590,90; − 590,89 → 0,01. Withheld 523,08.
    expect(e).toMatchObject({ base: 8660.03, quota: 0.01, smiDeduction: 590.89 });
    expect(e.difference).toBe(523.07);
  });

  it('can come out to pay, and uses the own scale and minimums of the community', () => {
    const many = netSalary(person({ gross: 40000, situation: 1, children: 3, under3: 1 }));
    // Without the 600 € of the withholding: base 35.399,96. State: 4.399,74 − 1.782,75 = 2.616,99.
    // Twice = 5.233,98, against 5.036 withheld → 197,98 to pay.
    expect(rentaEstimate(many, DEFAULT_CCAA)).toMatchObject({
      base: 35399.96,
      stateQuota: 2616.99,
      quota: 5233.98,
      difference: -197.98,
    });
    const own: RentaCcaa = {
      ...DEFAULT_CCAA,
      scale: [{ from: 0, rate: 10 }],
      minimums: { personal: 6000 },
    };
    // 26.050 × 10 % − 6.000 × 10 % = 2.005.
    expect(rentaEstimate(netSalary(person()), own).regionalQuota).toBe(2005);
  });
});
