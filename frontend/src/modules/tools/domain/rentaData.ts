/** Data of the income tax return (IRPF) for Spain, by tax year, taken from the Tax Agency manual. */

/** A bracket of a progressive scale: the rate (%) applies from `from` euros up to the next bracket. */
export interface TaxBracket {
  from: number;
  rate: number;
}

export type DeductionGroup = 'family' | 'housing' | 'health' | 'education' | 'donations' | 'other';

/**
 * Limit on the tax base (general + savings) to use a deduction. Over `individual` it cannot be used;
 * between `phaseOutFrom` and `phaseOutTo` (when set) the amount goes down in proportion.
 */
export interface IncomeLimit {
  individual: number;
  joint?: number;
  phaseOutFrom?: number;
  phaseOutTo?: number;
  /** How the limit works, in plain words, when it is not a simple threshold. */
  note?: string;
}

/**
 * - fixed: a fixed amount in euros (`amount`, or `perChild` by order of birth).
 * - percent: a percentage (`percent`) of what was spent or invested, with its limits.
 * - special: anything else (tiers by income, several cases...): explained in `summary`.
 */
export type DeductionKind = 'fixed' | 'percent' | 'special';

export interface Deduction {
  /** Unique, kebab-case, prefixed by the place: `madrid-nacimiento-adopcion`. */
  id: string;
  group: DeductionGroup;
  /** Short title in plain Spanish ("Por nacimiento o adopción de hijos"). */
  title: string;
  /** One or two plain sentences: who can use it and what it gives (max 220 characters). */
  summary: string;
  kind: DeductionKind;
  /** fixed: euros per year, per `unit`. */
  amount?: number;
  /** fixed: what the amount is per ("hijo", "contribuyente", "persona a cargo"...). */
  unit?: string;
  /** fixed: amounts for the 1st, 2nd, 3rd and following children (the last one repeats). */
  perChild?: number[];
  /** percent: percentage of the amount spent or invested. */
  percent?: number;
  /** Maximum deduction in euros per year (when there is one). */
  limit?: number;
  /** percent: maximum amount of the expense or investment the percentage applies to. */
  baseLimit?: number;
  /** Limit on the taxpayer's base to apply it (the checker warns when the person is over it). */
  incomeLimit?: IncomeLimit;
  /** Key conditions in plain language: income limits, ages, who it is for (max 280 characters). */
  requirements: string;
  /** The Tax Agency page that explains it. */
  url: string;
}

/** Minimums (euros) that a community sets for its own part of the tax; missing = the State's. */
export interface MinimumAmounts {
  personal?: number;
  /** By order of birth: 1st, 2nd, 3rd, 4th and following. */
  descendants?: number[];
  /** Extra per descendant under 3 years old. */
  under3?: number;
  ascendants?: number;
  /** Extra for the ascendant over 75. */
  ascendantsOver75?: number;
  /** Extra of the taxpayer over 65 / over 75. */
  over65?: number;
  over75?: number;
  /** Disability of the taxpayer, of descendants or ascendants: from 33 % / from 65 %. */
  disability33?: number;
  disability65?: number;
  /** Disability of descendants only, when the community sets it apart from the rest (La Rioja). */
  descendantDisability33?: number;
  descendantDisability65?: number;
  /** Extra for help of third parties (disability of 65 % or more, or reduced mobility). */
  assistance?: number;
}

export interface RentaCcaa {
  /** kebab-case: `madrid`, `comunitat-valenciana`... */
  id: string;
  name: string;
  /** Foral communities (País Vasco, Navarra) file with their own Tax Agency, not with the AEAT. */
  regime: 'common' | 'foral';
  /** The community's own scale (its half of the general tax); undefined for foral ones. */
  scale?: TaxBracket[];
  /** Where the scale comes from. */
  scaleSource?: string;
  minimums?: MinimumAmounts;
  deductions: Deduction[];
  /** The Tax Agency page of the community's deductions. */
  source: string;
}

export interface StateReduction {
  title: string;
  detail: string;
}

/** The rules of the State for a tax year. */
export interface RentaState {
  year: number;
  /** State scale (general tax base). */
  scale: TaxBracket[];
  /** Scale that applies to the community's half when it did not approve its own. */
  defaultRegionalScale: TaxBracket[];
  minimums: Required<
    Pick<
      MinimumAmounts,
      | 'personal'
      | 'descendants'
      | 'under3'
      | 'ascendants'
      | 'ascendantsOver75'
      | 'over65'
      | 'over75'
      | 'disability33'
      | 'disability65'
      | 'assistance'
    >
  >;
  /** Expenses deductible from the income from work, and the extra for disability. */
  workExpenses: { general: number; disability33: number; disability65: number };
  /** Reduction of the net income from work for low incomes. */
  workReduction: { maxReduction: number; fullUntil: number; zeroFrom: number; notes: string };
  /** Reductions of the tax base. */
  baseReductions: { pensionPlanLimit: number; pensionPlanEmployerLimit: number; notes: string };
  /** The deductions of the State on the tax (maternity, large family, donations...). */
  deductions: Deduction[];
  source: string;
}
