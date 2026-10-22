/** Data of the income tax return (IRPF) for Spain, by tax year, taken from the Tax Agency manual. */
import type { Check } from './rentaRequirements';
import type { DisabilityLimits } from './rentaDisability';

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
  /** The base is measured after taking off the personal and family minimum (Castilla y León). */
  afterMinimum?: boolean;
  /** How the limit works, in plain words, when it is not a simple threshold. */
  note?: string;
  /**
   * What goes down between `phaseOutFrom` and `phaseOutTo`: the deduction itself (`amount`, the
   * default), its maximum base (`base`: the State's rent of before 2015, LIRPF DT 15.ª) or its
   * maximum in euros (`limit`: the Comunitat Valenciana's, Ley 13/1997 art. 4). Without that base
   * or maximum in the data, the amount goes down.
   */
  phaseOutOf?: 'amount' | 'base' | 'limit';
}

/**
 * - fixed: a fixed amount in euros (`amount`, or `perChild` by order of birth).
 * - percent: a percentage (`percent`) of what was spent or invested, with its limits.
 * - special: anything else (tiers by income, several cases...): explained in `summary`.
 */
export type DeductionKind = 'fixed' | 'percent' | 'special';

/** Some refundable deductions can be collected monthly, before the return, by filing a model. */
export interface AdvancePayment {
  /** The tax form that asks for it ("140", "143"). */
  model: string;
  /** The Tax Agency page about the advance payment. */
  url: string;
}

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
  /**
   * A State deduction that is split between the two quotas: the share (0 to 1) that lowers the
   * regional one (LIRPF arts. 67.1.b and 77.1.b: half of those of art. 68.2 to 68.5; DT 15.ª and
   * 18.ª: the regional half of the rent and the home of the transitional regime). Unset: all State.
   */
  regionalShare?: number;
  /**
   * Paid out even when there is no tax to pay: it lowers the differential quota, not the quota (LIRPF
   * arts. 81 and 81 bis: maternity and its increase for nursery, large family, and people with a
   * disability or the separated parent with two children in their care).
   */
  refundable?: boolean;
  /** Can be paid monthly in advance with a model (maternity: 140; large family and disability: 143). */
  advance?: AdvancePayment;
  /** Euros per month with the right to it (maternity: 100 €, LIRPF art. 81.3): the months are asked. */
  monthly?: number;
  /**
   * Once per child, on top of the months (maternity: 150 € when the mother reaches 30 days of social
   * security after the birth, LIRPF art. 81.1): the children with it are asked.
   */
  startBonus?: number;
  /**
   * Held to the person's social security contributions of the year (LIRPF art. 81 bis.2): `each`
   * deduction (and each relative) on its own, or only its first 1,200 € (`base`: the increase of a
   * large family of the special category is not held, art. 81 bis.1.c).
   */
  contributionCap?: 'each' | 'base';
  /** A higher maximum up to an age (the Valencian rent: 950 € up to 35 years). */
  ageLimit?: { maxAge: number; limit: number };
  /** Split in halves between the two parents when each files on their own (births, adoptions). */
  splitBetweenParents?: boolean;
  /** Key conditions in plain language: income limits, ages, who it is for (max 280 characters). */
  requirements: string;
  /**
   * The requirements checked before it is applied (rentaRequirements.ts): the age, the children
   * and a disability are checked by themselves; the rest is asked yes or no.
   */
  checks?: Check[];
  /** The box of the modelo 100 (annex B for the communities) where it goes. */
  box?: string;
  /** The rule it comes from (the community's law and article). */
  norm?: string;
  /**
   * What is spent on the deductions of the same `group` cannot pass `share` of the tax base
   * ([0500] + [0510]) all together: the regional donations (30 % in the Comunitat Valenciana, 10 % in
   * Castilla y León). Only for percent deductions (what was spent is known).
   */
  baseCap?: { group: string; share: number };
  /** The Tax Agency page that explains it. */
  url: string;
}

/** Minimums (euros) that a community sets for its own part of the tax; missing = the State's. */
export interface MinimumAmounts {
  personal?: number;
  /**
   * The general minimum of a taxpayer of 65 or more, when the community raises it only for them (Illes
   * Balears: 6,105 € instead of 5,550 €, plus the 1,265 € for age).
   */
  personalOver65?: number;
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
  /** Deductions of the year that the app does not calculate (copied from the draft, if they apply). */
  notInApp?: string[];
}

export interface StateReduction {
  title: string;
  detail: string;
}

/**
 * Deduction for low pay from work (LIRPF DA 61.ª): `amount` with gross pay from a job up to
 * `fullUntil`, then `amount − slope × (pay − fullUntil)`, nothing from `end`; only with other income
 * (not exempt) up to `otherIncomeLimit`.
 */
export interface LowPayRule {
  amount: number;
  fullUntil: number;
  end: number;
  slope: number;
  otherIncomeLimit: number;
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
  baseReductions: BaseReductions;
  /** The deductions of the State on the tax (maternity, large family, donations...). */
  deductions: Deduction[];
  /**
   * The deduction for low pay of the year (DA 61.ª); null: the year has none (2024). Left out only in
   * the States made by hand in the tests, which take the one of 2025.
   */
  lowPay?: LowPayRule | null;
  /** The reduction for artistic activities of the year (DA 60.ª); null: the year has none (2024). */
  artistic?: ArtisticRule | null;
  source: string;
}

/** Reductions of the tax base for pension plans and similar (LIRPF arts. 51 and 52). */
export interface BaseReductions {
  pensionPlanLimit: number;
  pensionPlanEmployerLimit: number;
  /**
   * Art. 52.1.b.1.º: the worker's own contributions to the employer's plan that can use the increase,
   * by the employer's contribution: up to `lowUpTo`, × `lowTimes`; up to `midUpTo`, `midBase` +
   * `midTimes` × (contribution − `lowUpTo`); above, × `highTimes`, and always × `highTimes` with a pay
   * from that employer of more than `highPayFrom`.
   */
  employmentTable: {
    lowUpTo: number;
    lowTimes: number;
    midUpTo: number;
    midBase: number;
    midTimes: number;
    highTimes: number;
    highPayFrom: number;
  };
  /** Art. 51.5: the own limit of the premiums the employer pays to a collective dependency insurance. */
  dependencyLimit: number;
  /** Art. 52.1.a: percent of the net income from work and activities of each person. */
  percentLimit: number;
  /** Art. 52.2: years in which what did not fit can still be reduced. */
  excessYears: number;
  /** Arts. 53 and 54 (a person with a disability); unset: the limits of 2025 (rentaDisability.ts). */
  disability?: DisabilityLimits;
  notes: string;
}

/**
 * LIRPF DA 60.ª.2 (Ley 7/2024, from 2025): 30 % off the net income of artistic activities that
 * exceeds 130 % of the average of the three years before, on at most 150,000 € a year.
 */
export interface ArtisticRule {
  /** IAE groups (section 2) and agrupaciones (section 3) it applies to. */
  groups: string[];
  percent: number;
  /** Percent of the average of the three years before that is not reduced. */
  over: number;
  cap: number;
}
