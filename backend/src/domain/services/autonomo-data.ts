/**
 * Rules of the self-employed system used by the tax drafts (Spain, 2026).
 * Sources: Agencia Tributaria (modelos 303 y 130, calendario 2026), Orden PJC/297/2026 (BOE-A-2026-7296,
 * checked on 18 October 2026) and the Seguridad Social tables for the contribution by real net income.
 * The public calculator repeats the RETA table in frontend/src/modules/tools/data/reta2026.ts; a test
 * there checks both stay the same.
 */

/** Total contribution rate 2026: 28.30 common + 1.30 professional + 0.90 cessation + 0.10 training + 0.90 MEI. */
export const RETA_RATE_2026 = 0.315;
/** General expenses deduction applied to the net income when working out the contribution base. */
export const RETA_GENERAL_EXPENSES = 0.07;

export interface RetaBracket {
  id: string;
  /** Monthly net income the bracket starts at (inclusive for the first, exclusive otherwise). */
  from: number;
  /** Monthly net income the bracket ends at (inclusive unless `toExclusive`); null = no limit. */
  to: number | null;
  /** R3 ends at «less than 1,166.70» and G1 starts at 1,166.70 (Orden PJC/297/2026, art. 15). */
  toExclusive?: boolean;
  baseMin: number;
  baseMax: number;
}

/** The 15 brackets of 2026: 3 reduced and 12 general (euros per month). */
export const RETA_BRACKETS_2026: RetaBracket[] = [
  { id: 'R1', from: 0, to: 670, baseMin: 653.59, baseMax: 718.94 },
  { id: 'R2', from: 670, to: 900, baseMin: 718.95, baseMax: 900 },
  { id: 'R3', from: 900, to: 1166.7, toExclusive: true, baseMin: 849.67, baseMax: 1166.7 },
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

/**
 * The table of brackets of an earlier year: the bracket limits are the same, only the bases change.
 * Sources (BOE, read on 22-10-2026): Orden PJC/51/2024 (BOE-A-2024-1691), art. 15, and Orden
 * PJC/178/2025 (BOE-A-2025-3780), art. 15: the tables of the Real Decreto-ley 13/2022, DT 1.ª, with
 * the maximum base of the year (4,720.50 € and 4,909.50 €) in G11 and G12.
 */
const withBases = (bases: [number, number][]): RetaBracket[] =>
  RETA_BRACKETS_2026.map((b, i) => ({ ...b, baseMin: bases[i][0], baseMax: bases[i][1] }));

export interface RetaTable {
  /** The total rate on the base: common + professional + cessation + training + MEI. */
  rate: number;
  brackets: RetaBracket[];
  source: string;
}

/**
 * The table of each year. 2024: 28.30 + 1.30 + 0.90 + 0.10 + 0.70 (MEI) = 31.30 %; 2025: the MEI is
 * 0.80, 31.40 %; 2026: 0.90, 31.50 % (the orders above and Orden PJC/297/2026, art. 37).
 */
export const RETA_TABLES: Record<number, RetaTable> = {
  2024: {
    rate: 0.313,
    brackets: withBases([
      [735.29, 816.98],
      [816.99, 900],
      [872.55, 1166.7],
      [950.98, 1300],
      [960.78, 1500],
      [960.78, 1700],
      [1045.75, 1850],
      [1062.09, 2030],
      [1078.43, 2330],
      [1111.11, 2760],
      [1176.47, 3190],
      [1241.83, 3620],
      [1307.19, 4050],
      [1454.25, 4720.5],
      [1732.03, 4720.5],
    ]),
    source: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1691',
  },
  2025: {
    rate: 0.314,
    brackets: withBases([
      [653.59, 718.94],
      [718.95, 900],
      [849.67, 1166.7],
      [950.98, 1300],
      [960.78, 1500],
      [960.78, 1700],
      [1143.79, 1850],
      [1209.15, 2030],
      [1274.51, 2330],
      [1356.21, 2760],
      [1437.91, 3190],
      [1519.61, 3620],
      [1601.31, 4050],
      [1732.03, 4909.5],
      [1928.1, 4909.5],
    ]),
    source: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-3780',
  },
  2026: {
    rate: RETA_RATE_2026,
    brackets: RETA_BRACKETS_2026,
    source: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296',
  },
};

/**
 * The table of a year and whether it is that year's: a year with no order yet takes the latest one
 * before it (and says so), a year before the first one takes the first.
 */
export function retaTableOf(year: number): { table: RetaTable; known: boolean } {
  const known = RETA_TABLES[year];
  if (known) return { table: known, known: true };
  const years = Object.keys(RETA_TABLES).map(Number);
  const before = years.filter((y) => y < year);
  const pick = before.length ? Math.max(...before) : Math.min(...years);
  return { table: RETA_TABLES[pick], known: false };
}

/** Minimum of the pay-in-advance reduction for low income (modelo 130, box 13): by last year's net income. */
export const LOW_INCOME_REDUCTIONS: { upTo: number; amount: number }[] = [
  { upTo: 9000, amount: 100 },
  { upTo: 10000, amount: 75 },
  { upTo: 11000, amount: 50 },
  { upTo: 12000, amount: 25 },
];

/** Pay-in-advance rate of the income tax (modelo 130, box 04). */
export const IRPF_ADVANCE = 0.2;
/** Section II of the 130, farming, livestock, forestry and fishing: 2 % of the quarter's income (art. 110.1.c RIRPF). */
export const AGRARIAN_ADVANCE = 0.02;
/** Hard-to-justify expenses of the simplified direct estimation: 5 % of the net income, up to 2,000 euros a year. */
export const HARD_TO_JUSTIFY_RATE = 0.05;
export const HARD_TO_JUSTIFY_MAX = 2000;
