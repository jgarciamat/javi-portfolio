import { modules2025 } from '@modules/tools/data/renta/modulos-2025';
import {
  isCommission,
  seasonIndex,
  vatActivityFor,
  vatSimplified,
  vatSimplifiedQuarters,
  vatTableOf,
  vatUnitsOf,
  type VatSimplifiedInput,
} from '@modules/finances/domain/vatSimplified';
import { vatModules2025 } from '@modules/finances/domain/vatModules2025';

/**
 * Invented taxi (721.2) in the simplified regime of VAT, hand calculation with the annex II of the
 * Orden HAC/1347/2024 (the same in 2026): personal empleado 1.5 (the owner and a driver at half
 * time) × 903.46 = 1,355.19; 45 (thousand km) × 8.78 = 395.10; C = 1,750.29. Ingreso a cuenta 5 %:
 * 87.51 (1T-3T). 4T: G = 900 (VAT on fuel and repairs) + 1 % of C (17.50) = 917.50;
 * I = 832.79; cuota mínima 10 % of C = 175.03; M = 832.79; 49 = 3 × 87.51 = 262.53; 50 = 570.26.
 */
const taxiVat = vatActivityFor('m59', 2026)!;
const base: VatSimplifiedInput = {
  year: 2026,
  quarter: 1,
  activity: taxiVat,
  unitsStart: [1.5, 45],
  unitsYear: [1.5, 45],
  reduction: 0,
  seasonDays: 0,
  shares: [1, 1, 1, 1],
  supported: 900,
  compensationsPaid: 0,
  refundsAbroad: 0,
  intraAcquisitions: 0,
  fixedAssetSales: 0,
  reverseCharge: 0,
  fixedAssets: 0,
  investmentAdjust: 0,
  toOffset: 0,
  refund: false,
};
const boxOf = (r: ReturnType<typeof vatSimplified>, id: string) =>
  r.boxes.find((b) => b.box === id)?.amount;

describe('the simplified regime of VAT (303, page 2)', () => {
  it('maps the activities of the income tax and derives the units', () => {
    expect(taxiVat).toMatchObject({ epigrafe: '721.2', minimum: 10, quarterly: 5 });
    expect(vatActivityFor('m05', 2025)).toBeNull();
    const waste = vatModules2025.find(
      (v) => v.activity === 'Transporte de residuos por carretera'
    )!;
    expect(vatActivityFor('m60', 2025, waste.id)).toBe(waste);
    expect(waste.quarterly).toBe(1);
    expect(vatActivityFor('m60', 2025)?.quarterly).toBe(5);
    expect(vatTableOf(2030)).toBe(vatModules2025);
    expect(vatModules2025).toHaveLength(49);
    const irpfTaxi = modules2025.find((m) => m.id === 'm59')!;
    // Personal empleado = salaried + non-salaried; the distance is the same module.
    expect(vatUnitsOf(taxiVat, irpfTaxi, [0.5, 1, 45])).toEqual([1.5, 45]);
    expect(vatUnitsOf(taxiVat, irpfTaxi, [0.5, 1, 45], [2, null])).toEqual([2, 45]);
    expect(vatUnitsOf(taxiVat, null, [])).toEqual([0, 0]);
    // A module of the VAT the income tax does not have stays at 0 until it is typed.
    const bar = vatActivityFor('m45', 2025)!;
    const irpfBar = modules2025.find((m) => m.id === 'm45')!;
    expect(vatUnitsOf(bar, irpfBar, [3, 1, 35, 8, 10, 0, 1])).toEqual([4, 35, 8, 0, 0, 1, 0]);
    expect(isCommission(bar.modules[6])).toBe(true);
  });

  it('works out the ingreso a cuenta of 1T-3T and the year in the 4T (hand calculation)', () => {
    const q1 = vatSimplified(base);
    expect(q1.parts).toEqual({ C: 1750.29, D: 0, Z: 1, E: 5, F: 87.51 });
    expect(boxOf(q1, '47')).toBe(87.51);
    expect(boxOf(q1, '71')).toBe(87.51);
    expect(q1.result).toBe('pay');
    const q4 = vatSimplified({ ...base, quarter: 4 });
    expect(q4.parts).toMatchObject({
      C: 1750.29,
      G: 917.5,
      I: 832.79,
      J: 10,
      L: 175.03,
      M: 832.79,
    });
    expect([boxOf(q4, '48'), boxOf(q4, '49'), boxOf(q4, '50'), boxOf(q4, '58')]).toEqual([
      832.79, 262.53, 570.26, 570.26,
    ]);
    expect(boxOf(q4, '47')).toBeUndefined();
  });

  it('takes the cuota mínima when the VAT paid is high', () => {
    // G = 1,700 + 17.50 → I = 32.79 < L = 175.03.
    const q4 = vatSimplified({ ...base, quarter: 4, supported: 1700 });
    expect(q4.parts.M).toBe(175.03);
  });

  it('adds intra-EU acquisitions, reverse charge and sales of fixed assets, and deducts fixed assets', () => {
    const q2 = vatSimplified({
      ...base,
      quarter: 2,
      intraAcquisitions: 10,
      fixedAssetSales: 20,
      reverseCharge: 30,
      fixedAssets: 4200,
    });
    // 54 = 87.51 + 60 = 147.51; 57 = 4,200; 58 = −4,052.49: to offset.
    expect([boxOf(q2, '54'), boxOf(q2, '57'), boxOf(q2, '71')]).toEqual([147.51, 4200, -4052.49]);
    expect(q2.result).toBe('offset');
    expect(q2.due).toBe(0);
  });

  it('carries a negative quarter to the next ones and refunds a negative 4T when asked', () => {
    const ops = [0, 1, 2, 3].map((i) => ({
      intraAcquisitions: 0,
      fixedAssetSales: 0,
      reverseCharge: 0,
      fixedAssets: i === 0 ? 150 : 0,
    }));
    const year = vatSimplifiedQuarters({ ...base, quarter: 4, toOffset: 0 }, ops);
    // 1T: 87.51 − 150 = −62.49; 2T: 87.51 − 62.49 = 25.02; 3T 87.51.
    expect(year.map((r) => boxOf(r, '71'))).toEqual([-62.49, 25.02, 87.51, 570.26]);
    expect(boxOf(year[1], '78')).toBe(62.49);
    const refund = vatSimplified({
      ...base,
      quarter: 4,
      supported: 0,
      fixedAssets: 2000,
      refund: true,
    });
    expect(refund.result).toBe('refund');
    expect(vatSimplified({ ...base, unitsStart: [0, 0] }).result).toBe('zero');
  });

  it('applies the season index, the reductions and the commissions', () => {
    expect([
      seasonIndex(0),
      seasonIndex(60),
      seasonIndex(90),
      seasonIndex(150),
      seasonIndex(200),
    ]).toEqual([1, 1.5, 1.35, 1.25, 1]);
    // Season of 90 days, 30 of them in the quarter over 90 of last year: (1,750.29 × 5 %) × 1.35 / 3.
    const season = vatSimplified({ ...base, seasonDays: 90, shares: [1 / 3, 1, 1, 1] });
    expect(season.parts.F).toBe(39.38);
    // 10 % authorised reduction: D = 175.03; F = (1,750.29 − 175.03) × 5 % = 78.76.
    expect(vatSimplified({ ...base, reduction: 10 }).parts).toMatchObject({ D: 175.03, F: 78.76 });
    // Bar with 1,000 € of lottery commissions: ITL = 210 goes whole on top of the 2 %.
    const bar = vatActivityFor('m45', 2025)!;
    const units = [4, 35, 8, 10, 0, 1, 1000];
    const r = vatSimplified({ ...base, activity: bar, unitsStart: units, unitsYear: units });
    // C = 4 × 3,294.97 + 35 × 69.09 + 8 × 60.23 + 10 × 77.95 + 655.45 + 210 = 17,724.82.
    expect(r.parts.C).toBe(17724.82);
    // F = (17,724.82 − 210) × 2 % + 210 = 560.30.
    expect(r.parts.F).toBe(560.3);
    // An accessory activity of commissions only: no percentage, only the commissions.
    const lottery = vatTableOf(2025).find((v) => v.quarterly === null)!;
    expect(vatSimplified({ ...base, activity: lottery, unitsStart: [1000] }).parts.F).toBe(210);
  });
});
