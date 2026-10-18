import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RETA_BRACKETS_2026,
  RETA_GENERAL_EXPENSES,
  RETA_RATE_2026,
  RETA_RATE_PARTS_2026,
} from '@modules/tools/data/reta2026';
import { bracketFor, feeOf, monthlyNetOf, retaQuote } from '@modules/tools/domain/retaCalc';

/** Worked examples with the 2026 tables of Orden PJC/297/2026 (art. 15) and a rate of 31,5 %. */
describe('retaQuote', () => {
  it('takes 7 % off a monthly net income of 2.000 € and lands in G5', () => {
    // 2.000 − 7 % (140) = 1.860 → G5 (1.850–2.030): base 1.209,15–2.030.
    // Fee 1.209,15 × 31,5 % = 380,88; 2.030 × 31,5 % = 639,45.
    expect(retaQuote({ monthlyNet: 2000, person: 'individual', flatRate: false })).toEqual({
      deduction: 140,
      deductionRate: 0.07,
      computable: 1860,
      bracket: RETA_BRACKETS_2026[7],
      feeMin: 380.88,
      feeMax: 639.45,
      flatFee: null,
      flatRateExtension: false,
    });
  });

  it('takes only 3 % off company partners', () => {
    // 2.000 − 3 % (60) = 1.940, still G5.
    expect(retaQuote({ monthlyNet: 2000, person: 'company', flatRate: false })).toMatchObject({
      deduction: 60,
      deductionRate: 0.03,
      computable: 1940,
      bracket: { id: 'G5' },
    });
  });

  it('puts 1.000 € in the third reduced bracket', () => {
    // 1.000 − 70 = 930 → R3: 849,67 × 31,5 % = 267,65; 1.166,70 × 31,5 % = 367,51.
    expect(retaQuote({ monthlyNet: 1000, person: 'individual', flatRate: false })).toMatchObject({
      computable: 930,
      bracket: { id: 'R3' },
      feeMin: 267.65,
      feeMax: 367.51,
    });
  });

  it('charges 80 € with the flat rate, extendable under the minimum wage', () => {
    // 930 × 12 = 11.160 € < 17.094 €: another 12 months possible.
    expect(retaQuote({ monthlyNet: 1000, person: 'individual', flatRate: true })).toMatchObject({
      flatFee: 80,
      flatRateExtension: true,
    });
    // 1.860 × 12 = 22.320 € ≥ 17.094 €.
    expect(retaQuote({ monthlyNet: 2000, person: 'individual', flatRate: true })).toMatchObject({
      flatFee: 80,
      flatRateExtension: false,
    });
  });

  it('treats losses and nonsense as no income: the lowest bracket', () => {
    for (const monthlyNet of [-500, Number.NaN]) {
      expect(retaQuote({ monthlyNet, person: 'individual', flatRate: false })).toMatchObject({
        computable: 0,
        bracket: { id: 'R1' },
        feeMin: 205.88,
      });
    }
  });
});

describe('bracketFor', () => {
  it('follows the limits of the order', () => {
    expect(bracketFor(0).id).toBe('R1');
    expect(bracketFor(670).id).toBe('R1');
    expect(bracketFor(670.01).id).toBe('R2');
    // R3 is «> 900 and < 1.166,70»; G1 starts at 1.166,70.
    expect(bracketFor(1166.69).id).toBe('R3');
    expect(bracketFor(1166.7).id).toBe('G1');
    expect(bracketFor(6000).id).toBe('G11');
    expect(bracketFor(6000.01).id).toBe('G12');
    expect(bracketFor(1e9).id).toBe('G12');
  });
});

describe('monthlyNetOf and feeOf', () => {
  it('turns the year into months and a base into a fee', () => {
    // (36.000 − 12.000) / 12 = 2.000.
    expect(monthlyNetOf(36000, 12000)).toBe(2000);
    expect(monthlyNetOf(Number.NaN, 1200)).toBe(-100);
    // 5.101,20 × 31,5 % = 1.606,878 → 1.606,88.
    expect(feeOf(5101.2)).toBe(1606.88);
  });
});

describe('the RETA table', () => {
  it('adds up to 31,5 %', () => {
    const sum = Object.values(RETA_RATE_PARTS_2026).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(RETA_RATE_2026 * 100, 10);
  });

  it('is the same table the server uses for the quarterly draft', () => {
    const server = readFileSync(
      resolve(__dirname, '../../../../backend/src/domain/services/autonomo-data.ts'),
      'utf8'
    );
    const rows = [...server.matchAll(/\{ id: '(\w+)',[^}]*\}/g)].map((m) => m[0]);
    expect(rows).toHaveLength(RETA_BRACKETS_2026.length);
    RETA_BRACKETS_2026.forEach((b, i) => {
      const row = rows[i];
      expect(row).toContain(`id: '${b.id}'`);
      expect(row).toContain(`from: ${b.from},`);
      expect(row).toContain(`to: ${b.to},`);
      expect(row).toContain(`baseMin: ${b.baseMin},`);
      expect(row).toContain(`baseMax: ${b.baseMax} }`);
      expect(row.includes('toExclusive: true')).toBe(!!b.toExclusive);
    });
    expect(server).toContain(`RETA_RATE_2026 = ${RETA_RATE_2026};`);
    expect(server).toContain(`RETA_GENERAL_EXPENSES = ${RETA_GENERAL_EXPENSES};`);
  });
});
