import { manualMovements, type ManualData } from '@domain/services/autonomo-expenses';
import { prepareDraft, type DraftInputs, type QuarterExtras } from '@domain/services/autonomo';
import {
  hardToJustifyRate,
  percentLabel,
  reducedInstalment,
} from '@domain/services/autonomo-territory';

/**
 * The 8 % of the modelo 130 in Ceuta, Melilla and La Palma (art. 110.2 RIRPF; DA 57.ª and DA 64.ª
 * LIRPF; sources in autonomo-territory.ts). Invented figures, worked out by hand.
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

function draftOf(
  year: number,
  quarter: 1 | 2 | 3 | 4,
  income: number[],
  expenses: number[],
  options: Partial<DraftInputs>
) {
  const data: ManualData = {
    profile,
    quarters: [0, 1, 2, 3].map((i) => ({
      ...empty,
      income: { ...empty.income, r0: income[i] },
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
  return prepareDraft(year, quarter, manualMovements(year, data).movements, inputs);
}

const box = (draft: ReturnType<typeof draftOf>, id: string) =>
  draft.irpf.boxes.find((b) => b.box === id)?.amount;

/**
 * Persona 49 (docs/casos-practicos/personas/p2-49-abogada-ceuta-130-al-8-sin-iva/calculo.md):
 * a lawyer in Ceuta, simplified modality with the hard-to-justify expenses. Quarterly income
 * 9,000 / 11,000 / 8,000 / 12,000 and expenses 2,451.63 each (fee of 1,281.63 included).
 *   1T: 9,000 − 2,451.63 = 6,548.37; 5 % = 327.42; 03 = 6,220.95; 8 % = 497.68
 *   2T: 20,000 − 4,903.26 = 15,096.74; 5 % = 754.84; 03 = 14,341.90; 8 % = 1,147.35 − 497.68 = 649.67
 *   3T: 28,000 − 7,354.89 = 20,645.11; 5 % = 1,032.26; 03 = 19,612.85; 8 % = 1,569.03 − 1,147.35 = 421.68
 *   4T: 40,000 − 9,806.52 = 30,193.48
 *       Ceuta, DA 64.ª: 10 % = 3,019.35, capped at 2,000; 03 = 28,193.48; 8 % = 2,255.48 − 1,569.03 = 686.45
 *       Melilla (no DA 64.ª): 5 % = 1,509.67; 03 = 28,683.81; 8 % = 2,294.70 − 1,569.03 = 725.67
 */
const P49_INCOME = [9000, 11000, 8000, 12000];
const P49_EXPENSES = [2451.63, 2451.63, 2451.63, 2451.63];
const p49 = (quarter: 1 | 2 | 3 | 4, territory: DraftInputs['territory']) =>
  draftOf(2026, quarter, P49_INCOME, P49_EXPENSES, { hardToJustify: true, territory });

describe('Modelo 130 in Ceuta and Melilla: 8 % (art. 110.2 RIRPF)', () => {
  it('gives the four quarters of the lawyer in Ceuta, with the 10 % of the DA 64.ª in the 4T', () => {
    expect([1, 2, 3, 4].map((q) => p49(q as 1 | 2 | 3 | 4, 'ceuta').irpf.amountDue)).toEqual([
      497.68, 649.67, 421.68, 686.45,
    ]);
    const first = p49(1, 'ceuta');
    expect([box(first, '02'), box(first, '03'), box(first, '04')]).toEqual([
      2779.05, 6220.95, 497.68,
    ]);
    expect(first.irpf.boxes.find((b) => b.box === '04')?.label).toBe('8 % del rendimiento neto');
    expect(first.irpf.rate).toBe(0.08);
    const fourth = p49(4, 'ceuta');
    // Box 02: expenses 9,806.52 plus the 2,000 € cap of the hard-to-justify expenses.
    expect([box(fourth, '02'), box(fourth, '03'), box(fourth, '04'), box(fourth, '05')]).toEqual([
      11806.52, 28193.48, 2255.48, 1569.03,
    ]);
  });

  it('keeps the 5 % in the 4T of Melilla (the DA 64.ª is for Ceuta only)', () => {
    expect(p49(4, 'melilla').irpf.amountDue).toBe(725.67);
    expect(box(p49(4, 'melilla'), '03')).toBe(28683.81);
  });

  it('gives 20 % elsewhere, and when the territory is not sent (older apps)', () => {
    // 1T: 6,220.95 × 20 % = 1,244.19.
    expect(p49(1, 'general').irpf.amountDue).toBe(1244.19);
    expect(p49(1, undefined).irpf.amountDue).toBe(1244.19);
    expect(p49(1, undefined).irpf.boxes.find((b) => b.box === '04')?.label).toBe(
      '20 % del rendimiento neto'
    );
    expect(p49(1, undefined).irpf.rate).toBe(0.2);
  });

  it('cuts the 2 % of farming to 0.8 % (section II)', () => {
    // 10,000 € of income in the quarter: 0.8 % = 80; elsewhere 2 % = 200.
    const farm = (territory: DraftInputs['territory']) =>
      draftOf(2026, 1, [10000, 0, 0, 0], [0, 0, 0, 0], { agrarian: true, territory });
    expect([box(farm('melilla'), '09'), farm('melilla').irpf.amountDue]).toEqual([80, 80]);
    expect(farm('melilla').irpf.boxes.find((b) => b.box === '09')?.label).toBe(
      '0,8 % del volumen de ingresos'
    );
    expect(farm('melilla').irpf.rate).toBe(0.008);
    expect(farm('general').irpf.amountDue).toBe(200);
  });

  it('says the rate of a professional who does not file the 130', () => {
    const exempt = draftOf(2026, 1, P49_INCOME, P49_EXPENSES, {
      exempt130: true,
      territory: 'ceuta',
    });
    expect(exempt.irpf).toMatchObject({ required: false, amountDue: 0, rate: 0.08 });
  });
});

/**
 * La Palma: income 10,000 / 10,000 / 10,000 / 40,000 and expenses 4,000 a quarter, no 5 %.
 * Cumulative net income 6,000 / 12,000 / 18,000 / 54,000.
 *   2026 (8 % in the 3T and 4T): 1T 1,200; 2T 2,400 − 1,200 = 1,200; 3T 1,440 − 2,400 = −960 → 0;
 *        4T 4,320 − 2,400 = 1,920
 *   2025 (8 % in the 4T): 1T, 2T and 3T 1,200 each (3,600 at 20 %); 4T 4,320 − 3,600 = 720
 *   2024 (8 % from the 2T): 1T 1,200; 2T 960 − 1,200 = −240 → 0
 *   2027 (no extension in the BOE): 4T 10,800 − 3,600 = 7,200, as anywhere else
 */
const LP_INCOME = [10000, 10000, 10000, 40000];
const LP_EXPENSES = [4000, 4000, 4000, 4000];
const laPalma = (year: number, quarter: 1 | 2 | 3 | 4, territory: DraftInputs['territory']) =>
  draftOf(year, quarter, LP_INCOME, LP_EXPENSES, { territory }).irpf;

describe('Modelo 130 in La Palma: 8 % only in some quarters (DA 57.ª LIRPF)', () => {
  it('2026: 20 % in the 1T and 2T, 8 % in the 3T and 4T', () => {
    expect(laPalma(2026, 1, 'laPalma')).toMatchObject({ amountDue: 1200, rate: 0.2 });
    expect(laPalma(2026, 2, 'laPalma')).toMatchObject({ amountDue: 1200, rate: 0.2 });
    const third = laPalma(2026, 3, 'laPalma');
    expect(third).toMatchObject({ amountDue: 0, result: 'zero', rate: 0.08 });
    expect(third.boxes.find((b) => b.box === '07')?.amount).toBe(-960);
    expect(laPalma(2026, 4, 'laPalma')).toMatchObject({ amountDue: 1920, rate: 0.08 });
  });

  it('2025: only the 4T at 8 %', () => {
    expect(laPalma(2025, 3, 'laPalma')).toMatchObject({ amountDue: 1200, rate: 0.2 });
    expect(laPalma(2025, 4, 'laPalma')).toMatchObject({ amountDue: 720, rate: 0.08 });
  });

  it('2024: from the 2T', () => {
    expect(laPalma(2024, 1, 'laPalma')).toMatchObject({ amountDue: 1200, rate: 0.2 });
    expect(laPalma(2024, 2, 'laPalma')).toMatchObject({ amountDue: 0, rate: 0.08 });
  });

  it('2027 and the general territory: 20 %', () => {
    expect(laPalma(2027, 4, 'laPalma')).toMatchObject({ amountDue: 7200, rate: 0.2 });
    expect(laPalma(2026, 4, 'general')).toMatchObject({ amountDue: 7200, rate: 0.2 });
  });
});

describe('the rules by territory, year and quarter', () => {
  it('reduces the instalment where the norm says', () => {
    expect(reducedInstalment('ceuta', 2025, 1)).toBe(true);
    expect(reducedInstalment('melilla', 2027, 2)).toBe(true);
    expect(reducedInstalment('laPalma', 2023, 1)).toBe(true);
    expect(reducedInstalment('laPalma', 2022, 4)).toBe(false);
    expect(reducedInstalment('general', 2026, 4)).toBe(false);
    expect(reducedInstalment(undefined, 2026, 4)).toBe(false);
  });

  it('takes 10 % of hard-to-justify expenses only in the 4T of 2026 in Ceuta', () => {
    expect(hardToJustifyRate('ceuta', 2026, 4)).toBe(0.1);
    expect(hardToJustifyRate('ceuta', 2026, 3)).toBe(0.05);
    expect(hardToJustifyRate('ceuta', 2027, 4)).toBe(0.05);
    expect(hardToJustifyRate('melilla', 2026, 4)).toBe(0.05);
  });

  it('writes the rates as the boxes do', () => {
    expect([0.2, 0.08, 0.02, 0.008].map(percentLabel)).toEqual(['20 %', '8 %', '2 %', '0,8 %']);
  });
});
