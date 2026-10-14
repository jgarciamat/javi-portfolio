/**
 * Rules of the self-employed system used by the tax drafts (Spain, 2026).
 * Sources: Agencia Tributaria (modelos 303 y 130, calendario 2026), Orden PJC/297/2026 and the
 * Seguridad Social tables for the contribution by real net income.
 */

/** Total contribution rate 2026: 28.30 common + 1.30 professional + 0.90 cessation + 0.10 training + 0.90 MEI. */
export const RETA_RATE_2026 = 0.315;
/** General expenses deduction applied to the net income when working out the contribution base. */
export const RETA_GENERAL_EXPENSES = 0.07;

export interface RetaBracket {
  id: string;
  /** Monthly net income the bracket starts at (inclusive for the first, exclusive otherwise). */
  from: number;
  /** Monthly net income the bracket ends at (inclusive); null = no limit. */
  to: number | null;
  baseMin: number;
  baseMax: number;
}

/** The 15 brackets of 2026: 3 reduced and 12 general (euros per month). */
export const RETA_BRACKETS_2026: RetaBracket[] = [
  { id: 'R1', from: 0, to: 670, baseMin: 653.59, baseMax: 718.94 },
  { id: 'R2', from: 670, to: 900, baseMin: 718.95, baseMax: 900 },
  { id: 'R3', from: 900, to: 1166.7, baseMin: 849.67, baseMax: 1166.7 },
  { id: 'G1', from: 1166.7, to: 1300, baseMin: 950.98, baseMax: 1300 },
  { id: 'G2', from: 1300, to: 1500, baseMin: 960.78, baseMax: 1500 },
  { id: 'G3', from: 1500, to: 1700, baseMin: 960.78, baseMax: 1700 },
  { id: 'G4', from: 1700, to: 1850, baseMin: 1143.79, baseMax: 1850 },
  { id: 'G5', from: 1850, to: 2030, baseMin: 1209.15, baseMax: 2030 },
  { id: 'G6', from: 2030, to: 2330, baseMin: 1274.51, baseMax: 2330 },
  { id: 'G7', from: 2330, to: 2760, baseMin: 1356.21, baseMax: 2760 },
  { id: 'G8', from: 2760, to: 3190, baseMin: 1437.91, baseMax: 3190 },
  { id: 'G9', from: 3190, to: 3620, baseMin: 1519.61, baseMax: 3620 },
  { id: 'G10', from: 3620, to: 4050, baseMin: 1601.31, baseMax: 4050 },
  { id: 'G11', from: 4050, to: 6000, baseMin: 1732.03, baseMax: 5101.2 },
  { id: 'G12', from: 6000, to: null, baseMin: 1928.1, baseMax: 5101.2 },
];

/** Minimum of the pay-in-advance reduction for low income (modelo 130, box 13): by last year's net income. */
export const LOW_INCOME_REDUCTIONS: { upTo: number; amount: number }[] = [
  { upTo: 9000, amount: 100 },
  { upTo: 10000, amount: 75 },
  { upTo: 11000, amount: 50 },
  { upTo: 12000, amount: 25 },
];

/** Pay-in-advance rate of the income tax (modelo 130, box 04). */
export const IRPF_ADVANCE = 0.2;
/** Hard-to-justify expenses of the simplified direct estimation: 5 % of the net income, up to 2,000 euros a year. */
export const HARD_TO_JUSTIFY_RATE = 0.05;
export const HARD_TO_JUSTIFY_MAX = 2000;
