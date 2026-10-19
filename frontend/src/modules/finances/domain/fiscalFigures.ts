/**
 * The figures of the self-employed forms that the law sets year by year, kept apart from the rules
 * that use them: each year has its own set, with the source it was checked on. A figure the app
 * could not confirm for a year is null (NO CONFIRMADO) and is not used.
 *
 * Sources (all checked on 19 October 2026):
 * - [RGAT] Real Decreto 1065/2007, https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984 : arts. 32.c
 *   and 33.1 (347: more than 3,005.06 euros a year with one person), 34.1.h (cash over 6,000 euros),
 *   42 bis, 42 ter and 54 bis (720: 50,000 euros by block, again after a rise of more than 20,000)
 *   and 42 quater (721, virtual currencies abroad: the same figures; first due for 2023, not for 2022).
 * - [LIP] Ley 19/1991 del Impuesto sobre el Patrimonio, https://www.boe.es/buscar/act.php?id=BOE-A-1991-14392 :
 *   art. 4.Nueve (main home exempt up to 300,000 euros), 28.Dos (700,000 euros when the region sets
 *   none) and 37 (714 due with a quota to pay or more than 2,000,000 euros of assets).
 * - [I131] Instructions of the modelo 131, https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-131-irpf______sionales-estimacion-objetiva-fraccionado_/instrucciones.html :
 *   2, 3 or 4 % by employees, 2 % of the income (II and III), 25 % less for young farmers, × 0.4 in
 *   Ceuta and Melilla, the reduction for low income (box 09) and the home deduction (box 12).
 * - [RIRPF] Real Decreto 439/2007, arts. 75.3.g (900 euros of rent), 95.1 (15 % and 7 %), 100 (19 %)
 *   and 110 (20 % of the 130), https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820 .
 * - [RETA] Ley 20/2007, art. 38 ter: the reduced fee is set by each budget law; 80 euros a month for
 *   2023-2025 by the transitional provision 5.ª of the Real Decreto-ley 13/2022 (BOE-A-2022-12482),
 *   which leaves later years to the budget law. For 2026 and 2027
 *   no budget law has set it (NO CONFIRMADO).
 */

export interface FiscalFigures {
  year: number;
  /** True when the order of the year is not out yet: today's law is assumed to carry on. */
  provisional: boolean;
  m347: { threshold: number; cash: number };
  withholding: { professional: number; starting: number; rent: number; rentExemptUpTo: number };
  m130: { rate: number };
  m131: {
    /** Percent of the net income of section I by employees (units of the module). */
    noStaff: number;
    upToOne: number;
    more: number;
    /** Percent of the income of sections II and III. */
    volume: number;
    agrarian: number;
    /** Young farmers (DA 6.ª LIRPF) take a quarter off the box 06. */
    youngCut: number;
    /** Ceuta and Melilla: the percentages are multiplied by this. */
    ceutaMelilla: number;
    /** Home deduction (DT 18.ª LIRPF): rates, yearly cap and the ceiling of income above which it is not applied. */
    home: { rate: number; volumeRate: number; agrarianRate: number; cap: number; ceiling: number };
  };
  /** Reduction of the instalment for low income last year (box 13 of the 130, 09 of the 131). */
  lowIncome: { upTo: number; amount: number }[];
  abroad: { threshold: number; rise: number };
  wealth: { mustFileAbove: number; exemptMinimum: number; homeExempt: number };
  /** RETA reduced fee for new self-employed (euros a month); null: not confirmed for that year. */
  retaFlatRate: number | null;
}

const LOW_INCOME = [
  { upTo: 9000, amount: 100 },
  { upTo: 10000, amount: 75 },
  { upTo: 11000, amount: 50 },
  { upTo: 12000, amount: 25 },
];

const BASE: Omit<FiscalFigures, 'year' | 'provisional' | 'retaFlatRate'> = {
  m347: { threshold: 3005.06, cash: 6000 },
  withholding: { professional: 15, starting: 7, rent: 19, rentExemptUpTo: 900 },
  m130: { rate: 20 },
  m131: {
    noStaff: 2,
    upToOne: 3,
    more: 4,
    volume: 2,
    agrarian: 2,
    youngCut: 0.25,
    ceutaMelilla: 0.4,
    home: { rate: 0.5, volumeRate: 2, agrarianRate: 2, cap: 660.14, ceiling: 33007.2 },
  },
  lowIncome: LOW_INCOME,
  abroad: { threshold: 50000, rise: 20000 },
  wealth: { mustFileAbove: 2000000, exemptMinimum: 700000, homeExempt: 300000 },
};

const YEARS: Record<number, FiscalFigures> = {
  2025: { ...BASE, year: 2025, provisional: false, retaFlatRate: 80 },
  2026: { ...BASE, year: 2026, provisional: false, retaFlatRate: null },
  2027: { ...BASE, year: 2027, provisional: true, retaFlatRate: null },
};

/** The figures of a year, or null when the app has none for it. */
export const figuresFor = (year: number): FiscalFigures | null => YEARS[year] ?? null;

/** The years with figures. */
export const FIGURE_YEARS = Object.keys(YEARS).map(Number);
