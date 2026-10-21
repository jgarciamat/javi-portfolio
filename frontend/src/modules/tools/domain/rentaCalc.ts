import type { RentaWorkExtras } from './rentaExtras';
import {
  activitiesOf,
  type ActivitiesResult,
  type ActivityInput,
  type FarmIndex,
  type ModuleActivity,
} from './rentaActivity';
import { generalBaseOf, savingsOf, type SavingsBreakdown, type SavingsDetail } from './rentaGains';
import type {
  BaseReductions,
  Deduction,
  LowPayRule,
  MinimumAmounts,
  RentaCcaa,
  RentaState,
  TaxBracket,
} from './rentaData';
import { round2 } from './round';
import type { PropertyResult } from './rentaRentals';
import { checkDeduction, type CheckAnswers } from './rentaRequirements';
import { donationChoices, type DonationInput } from './rentaDonations';

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Tax of a progressive scale: every bracket taxes only the part of the base inside it, and the tax
 * of each bracket is rounded to the cent (half up) before they are added, the same way the AEAT's
 * draft rounds each product (see {@link round2} and rentaWork.ts).
 */
export function applyScale(scale: TaxBracket[], base: number): number {
  const amount = positive(base);
  let tax = 0;
  for (let i = 0; i < scale.length; i++) {
    const from = scale[i].from;
    const to = i + 1 < scale.length ? scale[i + 1].from : Infinity;
    if (amount <= from) break;
    tax += round2((Math.min(amount, to) - from) * (scale[i].rate / 100));
  }
  return round2(tax);
}

// ─── Personal and family minimum ──────────────────────────────────────────────

export type Disability = 0 | 33 | 65;

export interface Child {
  /** Age at 31 December of the tax year. */
  age: number;
  disability: Disability;
  /** Adopted or fostered, registered this year or in the two before: the under-3 increase at any age. */
  adopted?: boolean;
  /**
   * The child's own income (art. 58.1): 'over8000' more than 8,000 € a year (the exempt left out);
   * 'ownReturn' files a return with more than 1,800 €. Unset: neither.
   */
  income?: ChildIncome;
}

export type ChildIncome = 'over8000' | 'ownReturn';

/**
 * The increase for a child under 3 (2,800 €): LIRPF art. 58.2 (BOE-A-2006-20764, checked 21-10-2026)
 * gives it, for an adoption or a fostering, "con independencia de la edad del menor, en el período
 * impositivo en que se inscriba en el Registro Civil y en los dos siguientes" (Manual 2025, c14,
 * ejemplo 6: a child adopted at 5).
 */
const under3Of = (child: Child, m: FullMinimums): number =>
  child.age < 3 || child.adopted === true ? m.under3 : 0;

export interface Ascendant {
  over75: boolean;
  disability: Disability;
}

export interface Family {
  /** Age of the taxpayer at 31 December. */
  age: number;
  disability: Disability;
  children: Child[];
  ascendants: Ascendant[];
  /** The children are claimed together with the other parent: each one takes half. */
  sharedChildren: boolean;
  /**
   * The return is the joint one of the taxpayer's unit, which takes the children under this age:
   * that is the return of a child with more than 1,800 € (see {@link descendantShare}).
   */
  jointUnder?: number;
  /**
   * The taxpayer needs the help of third parties or has reduced mobility: the 3,000 € of "gastos de
   * asistencia" also below 65 % (LIRPF art. 60.1, second paragraph).
   */
  assistance?: boolean;
}

export interface MinimumItem {
  key: 'personal' | 'age' | 'descendants' | 'ascendants' | 'disability';
  amount: number;
}

export type FullMinimums = Required<
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
> &
  Pick<MinimumAmounts, 'descendantDisability33' | 'descendantDisability65' | 'personalOver65'>;

/** The minimums of a community: its own amounts where it has them, the State's for the rest. */
export function mergeMinimums(state: FullMinimums, own?: MinimumAmounts): FullMinimums {
  const merged: FullMinimums = { ...state };
  if (!own) return merged;
  for (const key of Object.keys(own) as (keyof MinimumAmounts)[]) {
    const value = own[key];
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

/** Whether a child counts for the minimum: under 25, or with a disability of 33 % or more. */
export const countsAsDescendant = (c: Child): boolean => c.age < 25 || c.disability >= 33;

/**
 * The part of a child's minimum that is the taxpayer's: 0, half (shared with the other parent) or
 * all. LIRPF art. 58.1 (BOE-A-2006-20764): none with "rentas anuales, excluidas las exentas,
 * superiores a 8.000 euros", nor when the child files a return with more than 1,800 €. Manual
 * 2025, c14, «Concepto y requisitos» and ejemplo 2 (checked 22-10-2026): a child in the joint
 * return of one parent with more than 1,800 € gives that parent the whole minimum, and the other
 * none; with 1,800 € or less it is shared between both, even in the joint return.
 */
export function descendantShare(c: Child, family: Pick<Family, 'sharedChildren' | 'jointUnder'>) {
  if (!countsAsDescendant(c) || c.income === 'over8000') return 0;
  if (c.income === 'ownReturn') return c.age < (family.jointUnder ?? 0) ? 1 : 0;
  return family.sharedChildren ? 0.5 : 1;
}

/**
 * The children that give the minimum, with their part, the oldest first: the order (first, second…)
 * counts only them (Manual 2025, c14, «Cuantías aplicables», checked 22-10-2026).
 */
export const countedChildren = (family: Family): { child: Child; share: number }[] =>
  family.children
    .map((child) => ({ child, share: descendantShare(child, family) }))
    .filter((c) => c.share > 0)
    .sort((a, b) => b.child.age - a.child.age);

const nth = (list: number[], index: number): number => list[Math.min(index, list.length - 1)];
/**
 * The minimum for a disability of `level` (a descendant's can have its own amounts). The "gastos de
 * asistencia" (3,000 €, or the community's own amount) are added from 65 %, and below it when the
 * person "acredite necesitar ayuda de terceras personas o movilidad reducida" (`assistance`): LIRPF
 * art. 60.1, 60.2 and 60.3 (BOE-A-2006-20764, consolidated text; AEAT Manual práctico de Renta 2025,
 * c14, "Mínimo por discapacidad", checked 19-10-2026). The planner asks it for the taxpayer only.
 */
export const disabilityAmount = (
  level: Disability,
  m: FullMinimums,
  descendant = false,
  assistance = false
): number => {
  if (level >= 65)
    return ((descendant ? m.descendantDisability65 : undefined) ?? m.disability65) + m.assistance;
  if (level >= 33)
    return (
      ((descendant ? m.descendantDisability33 : undefined) ?? m.disability33) +
      (assistance ? m.assistance : 0)
    );
  return 0;
};

/** The extra of the minimum for age: from 65, and more from 75. */
const ageAmount = (age: number, m: FullMinimums): number =>
  age >= 75 ? m.over65 + m.over75 : age >= 65 ? m.over65 : 0;

/**
 * The minimum of a couple's joint return: one minimum of the taxpayer (5,550 €), with the age and
 * disability of each spouse (LIRPF art. 84.2; AEAT Manual práctico de Renta 2025, "Mínimo del
 * contribuyente", checked 19-10-2026: "se tendrán en cuenta las circunstancias personales de cada
 * uno de los cónyuges").
 */
function withPartner(
  min: { total: number; items: MinimumItem[] },
  partner: JointMember | null,
  m: FullMinimums
): { total: number; items: MinimumItem[] } {
  if (!partner) return min;
  const items = min.items.map((i) => ({ ...i }));
  const add = (key: MinimumItem['key'], amount: number) => {
    if (amount <= 0) return;
    const item = items.find((i) => i.key === key);
    if (item) item.amount = round2(item.amount + amount);
    else items.push({ key, amount });
  };
  add('age', ageAmount(partner.age, m));
  add('disability', disabilityAmount(partner.disability, m));
  return { total: round2(items.reduce((sum, i) => sum + i.amount, 0)), items };
}

/** The personal and family minimum, item by item (it lowers the tax, see {@link applyMinimum}). */
export function computeMinimum(
  family: Family,
  m: FullMinimums
): { total: number; items: MinimumItem[] } {
  // A community can raise the general amount only from 65 (Illes Balears, see `personalOver65`).
  const personal = family.age >= 65 ? (m.personalOver65 ?? m.personal) : m.personal;
  const items: MinimumItem[] = [{ key: 'personal', amount: personal }];
  // LIRPF art. 57.2 ("edad superior a 65/75 años"), with the age at the accrual date, 31 December
  // (art. 61.1.ª). The AEAT Manual práctico de Renta 2025 applies it to taxpayers "de edad igual o
  // superior a 65 años" (and 75): turning 65 (or 75) by 31 December is enough.
  const ageExtra = ageAmount(family.age, m);
  if (ageExtra > 0) items.push({ key: 'age', amount: ageExtra });

  // The order is by date of birth: the oldest is the first.
  const descendants = countedChildren(family).reduce((sum, { child, share }, i) => {
    const base = nth(m.descendants, i) + under3Of(child, m);
    return sum + (base + disabilityAmount(child.disability, m, true)) * share;
  }, 0);
  if (descendants > 0) items.push({ key: 'descendants', amount: round2(descendants) });

  const ascendants = family.ascendants.reduce(
    (sum, a) =>
      sum + m.ascendants + (a.over75 ? m.ascendantsOver75 : 0) + disabilityAmount(a.disability, m),
    0
  );
  if (ascendants > 0) items.push({ key: 'ascendants', amount: ascendants });

  const own = disabilityAmount(family.disability, m, false, family.assistance);
  if (own > 0) items.push({ key: 'disability', amount: own });

  return { total: round2(items.reduce((sum, i) => sum + i.amount, 0)), items };
}

/** The amount each child adds to the minimum, in the order they count (the oldest first). */
export function descendantBreakdown(
  family: Family,
  m: FullMinimums
): { age: number; amount: number; under3: number; disability: number }[] {
  return countedChildren(family).map(({ child, share }, i) => {
    const under3 = under3Of(child, m);
    const disability = disabilityAmount(child.disability, m, true);
    return {
      age: child.age,
      amount: round2((nth(m.descendants, i) + under3 + disability) * share),
      under3: round2(under3 * share),
      disability: round2(disability * share),
    };
  });
}

/** Quota of a scale for a base, once the minimum is lowered from it (never below zero). */
export function applyMinimum(scale: TaxBracket[], base: number, minimum: number): number {
  return round2(Math.max(0, applyScale(scale, base) - applyScale(scale, minimum)));
}

/**
 * The tax of the general base. With maintenance paid to the children by a court decision below the
 * base, the scale is applied apart to the maintenance and to the rest of the base, and what the
 * scale gives for the part of the base of the minimum "incrementado en 1.980 euros anuales" is taken
 * off, never below zero (LIRPF art. 64 for the State's scale and art. 75 for the regional one;
 * AEAT Manual práctico de Renta 2025, c15, "Anualidades por alimentos a favor de los hijos").
 */
export function generalQuota(
  scale: TaxBracket[],
  base: number,
  minimum: number,
  childSupport = 0
): number {
  if (childSupport <= 0 || childSupport >= base) return applyMinimum(scale, base, minimum);
  const tax = applyScale(scale, childSupport) + applyScale(scale, base - childSupport);
  return round2(Math.max(0, tax - applyScale(scale, Math.min(base, minimum + 1980))));
}

// ─── Deductions ───────────────────────────────────────────────────────────────

export interface DeductionChoice {
  /** The deduction applies to the person. */
  on: boolean;
  /** percent: euros spent or invested. special: the deduction itself, in euros. */
  amount?: number;
  /** fixed: how many times (children, people...); defaults to 1, or to the children for `perChild`. */
  units?: number;
  /** A refundable deduction collected in advance in the year (modelos 140 and 143), in euros. */
  advance?: number;
  /** For a deduction by months (maternity): the months with the right to it, of all the children. */
  months?: number;
  /** For a deduction with a `startBonus` (maternity): the children that get it this year. */
  bonusUnits?: number;
  /** The answers to the questions of its requirements (rentaRequirements.ts). */
  checks?: CheckAnswers;
}

/** The base a deduction's income limit is measured on: general + savings, less the minimum when it says so. */
export function limitBaseFor(
  d: Deduction,
  base: { taxBase: number; savingsBase: number; minimum: { total: number } }
): number {
  const total = base.taxBase + base.savingsBase;
  return d.incomeLimit?.afterMinimum ? total - base.minimum.total : total;
}

/** How much of a deduction the person can use given their tax base: 1 = all, 0 = none. */
export function incomeFactor(d: Deduction, taxBase: number, joint = false): number {
  const limit = d.incomeLimit;
  if (!limit) return 1;
  const max = joint && limit.joint !== undefined ? limit.joint : limit.individual;
  const base = positive(taxBase);
  if (limit.phaseOutFrom !== undefined && limit.phaseOutTo !== undefined) {
    if (base <= limit.phaseOutFrom) return 1;
    if (base >= limit.phaseOutTo) return 0;
    return (limit.phaseOutTo - base) / (limit.phaseOutTo - limit.phaseOutFrom);
  }
  return base > max ? 0 : 1;
}

/** A fixed deduction for `units` times: by position for `perChild`, else the amount (capped per unit). */
function fixedValue(d: Deduction, units: number): number {
  let value = 0;
  if (d.perChild && d.perChild.length > 0) {
    for (let i = 0; i < units; i++) value += nth(d.perChild, i);
  } else {
    // The limit of a fixed amount is per unit (1,200 € for each child under 3), not for the total.
    value = Math.min(d.amount ?? 0, d.limit ?? Infinity) * units;
  }
  return value;
}

/** A percent deduction gives a share of what was spent (up to its base); a special one, the amount itself. */
function spentValue(d: Deduction, choice: DeductionChoice): number {
  if (d.kind === 'percent') {
    const spent = positive(choice.amount ?? 0);
    return (Math.min(spent, d.baseLimit ?? Infinity) * (d.percent ?? 0)) / 100;
  }
  return positive(choice.amount ?? 0);
}

/**
 * What a deduction gives for the choices the person made (`factor`: share allowed by the income
 * limit). The factor lowers what the law lowers (see `IncomeLimit.phaseOutOf`): the maximum base of
 * the State's rent of before 2015 (9,040 − 1.4125 × (base − 17,707.20), LIRPF DT 15.ª; AEAT Manual
 * práctico de Renta 2025, c16, example 6,900 € paid with a base of 22,100 €: 2,835.17 × 10.05 % =
 * 284.93), the maximum in euros of the Valencian ones (Ley 13/1997 art. 4; AEAT guide of the
 * Comunitat Valenciana 2025: "multiplicar el límite de la deducción ... por un porcentaje"), or else
 * the deduction itself. Checked 19-10-2026.
 */
export function deductionAmount(d: Deduction, choice: DeductionChoice, factor = 1): number {
  if (!choice.on) return 0;
  if (d.kind === 'fixed') {
    const units = Math.max(1, Math.floor(choice.units ?? 1));
    const full = fixedValue(d, units);
    // By months (art. 81.3): what the months give, never more than the whole year of each child.
    const value =
      d.monthly && choice.months !== undefined
        ? Math.min(d.monthly * Math.max(0, choice.months), full)
        : full;
    return round2(withStartBonus(d, choice, units, value) * factor);
  }
  return round2(loweredValue(d, choice, factor));
}

/** The 150 € of art. 81.1, once for each child that has it, within the limit of each (1,350 €). */
function withStartBonus(d: Deduction, choice: DeductionChoice, units: number, value: number) {
  const children = Math.min(units, Math.max(0, Math.floor(choice.bonusUnits ?? 0)));
  if (!d.startBonus || children === 0) return value;
  return Math.min(value + d.startBonus * children, (d.limit ?? Infinity) * units);
}

/** A percent or special deduction with the income limit's `factor` on what the law lowers. */
function loweredValue(d: Deduction, choice: DeductionChoice, factor: number): number {
  const target = d.incomeLimit?.phaseOutOf;
  const limit = d.limit ?? Infinity;
  if (target === 'base' && d.kind === 'percent' && d.baseLimit !== undefined) {
    const lowered = { ...d, baseLimit: round2(d.baseLimit * factor) };
    return Math.min(spentValue(lowered, choice), limit);
  }
  if (target === 'limit' && d.limit !== undefined)
    return Math.min(spentValue(d, choice), d.limit * factor);
  return Math.min(spentValue(d, choice), limit) * factor;
}

/**
 * The State and regional parts of a deduction with a regional `share`. The regional part is rounded
 * and the State one is the rest, so the two always add up to the deduction (the AEAT Manual práctico
 * de Renta 2025, c16, example of the rent of before 2015, checked 19-10-2026, puts "el 50 por 100
 * del total de la deducción" in each box; it prints 142.46 twice for 284.93, we keep the odd cent
 * in one part so the boxes add up to the deduction).
 */
export function splitDeduction(amount: number, share: number): { state: number; regional: number } {
  const regional = round2(amount * share);
  return { state: round2(amount - regional), regional };
}

/**
 * The deductions that are paid out even when there is no tax to pay (maternity and nursery, large
 * family, disability in care, separated parent with two children): those marked in the data. AEAT
 * Manual práctico de Renta 2025, c18, "Resultado de la declaración" (checked 19-10-2026): they are
 * taken from the differential quota. It used to be a pattern on the id, which left out the nursery
 * and the separated parent and took in the works for disability of the home (a quota deduction).
 */
export const isRefundable = (d: Deduction): boolean => d.refundable === true;

// ─── The whole calculation ────────────────────────────────────────────────────

export interface RentalInput {
  /** Rent charged in the year. */
  income: number;
  /** Deductible expenses (interest, IBI, community fees, insurance, repairs...). */
  expenses: number;
  /** Yearly depreciation of the building. */
  amortization: number;
  /** Share of the net rent that is not taxed (0 to 90). */
  reductionPercent: number;
  /** Interest and repairs of earlier years applied this year (box 0104), inside `expenses`. */
  pendingApplied?: number;
  /** Interest and repairs of this year over the limit, for the next four years (box 0108). */
  excessCarry?: number;
  /** Each property worked out on its own (rentaRentals.ts): the net is the sum of theirs. */
  items?: PropertyResult[];
}

export interface RentaInput {
  /** Gross yearly pay from work. */
  gross: number;
  /** Social security paid by the worker (euros). */
  socialSecurity: number;
  /** Income tax already withheld by the payer. */
  withheld: number;
  /** Part of the gross that is a pension or a benefit, not pay from a job: it does not count for the low-pay deduction. */
  nonSalaryIncome?: number;
  /** Pensioner: the extra expenses for a disability are only for people who work. */
  retired?: boolean;
  /** Union fees, professional association and legal defence (already within their limits). */
  workExpensesExtra: number;
  /**
   * The part of a pension plan collected as a lump sum that comes from contributions made up to
   * 31-12-2006, within the year of the contingency or the two after: it is reduced by 40 % (LIRPF DT
   * 12.ª, with art. 17.2.b of the TRLIRPF in force on 31-12-2006), box 0011.
   */
  pensionCapital2006?: number;
  /** Maintenance paid to the children by a court decision, without their minimum (LIRPF arts. 64 and 75). */
  childSupport?: number;
  /** Change of residence for work reasons. */
  geographicMobility: boolean;
  /** Own contributions to pension plans, and those the employer makes (euros). */
  pensionPlan: number;
  pensionPlanEmployer: number;
  /**
   * The worker's own contributions to the employer's plan (flexible pay put into it too): within the
   * table of art. 52.1.b.1.º they use the 8,500 € of the employer.
   */
  pensionEmploymentOwn?: number;
  /** Premiums the employer pays to a collective dependency insurance (art. 51.5: 5,000 € of its own). */
  dependencyPremiums?: number;
  /** What did not fit in the five years before (art. 52.2): of plans and of dependency insurance. */
  pensionExcess?: { plans: number; dependency: number };
  /** Contributions to the plan of a spouse with low income. */
  spousePlan: number;
  /** Compensatory pension paid to an ex-spouse. */
  compensatoryPension: number;
  /** Rented properties, all together. */
  rental: RentalInput | null;
  /** Cadastral value of properties that are not rented, with revised and not revised values. */
  imputedValues: { standard: number; revised: number };
  /** Interest, dividends and capital gains (net), taxed on the savings base. */
  savings: number;
  /**
   * The savings income in detail (see rentaGains.ts): when given, it is worked out from it (FIFO,
   * integration and compensation) and `savings` is not used; its gains that do not come from a
   * transmission go to the general base.
   */
  savingsDetail?: SavingsDetail;
  /** Economic activities, with the tables of the módulos of the year (see rentaActivity.ts). */
  activities?: { list: ActivityInput[]; modules: ModuleActivity[]; farm: FarmIndex[] };
  family: Family;
  state: RentaState;
  ccaa: RentaCcaa;
  extras: Pick<RentaWorkExtras, 'savingsScale' | 'geographicMobilityExtra'>;
  /** Rates (%) of the imputed income of properties that are not rented. */
  imputationRates: { standard: number; revised: number };
  /** The deductions chosen, by id. */
  choices: Record<string, DeductionChoice>;
  /** What was given to NGOs and foundations: it replaces the choices of the donations (rentaDonations.ts). */
  donations?: DonationInput;
  /** Reduction of the net income from work for low incomes (see the State's rules). */
  workReduction: (netIncome: number) => number;
  /** A joint return: the person files together with their family unit (see {@link JointInput}). */
  joint?: JointInput;
}

/** The spouse in a joint return: their own pay, age, disability and basic income. */
export interface JointMember {
  gross: number;
  socialSecurity: number;
  withheld: number;
  nonSalaryIncome?: number;
  retired?: boolean;
  age: number;
  disability: Disability;
  savings: number;
  pensionPlan: number;
}

export interface JointInput {
  /** The spouse (couple); null for one parent with the children, who are taken to have no income. */
  partner: JointMember | null;
  /** Reduction of the base for the family unit (3,400 or 2,150 euros, or 0). */
  reduction: number;
  /** Only one 2,000 € of "other expenses" for the whole unit (to show what that reading would cost). */
  oneGeneralExpense?: boolean;
}

export interface RentaResult {
  /** The "other expenses" of work (2,000 €, more with a disability or a move): box 0019. */
  otherExpenses: number;
  netIncome: number;
  workReduction: number;
  rentalNet: number;
  imputedIncome: number;
  pensionReduction: number;
  /** What does not fit this year, for the next five (art. 52.2): of plans and of dependency. */
  pensionExcessNext: { plans: number; dependency: number };
  /** Other reductions of the general base: spouse plan and compensatory pension. */
  otherReductions: number;
  /** The economic activities and the reductions of art. 32 (null when there are none). */
  activities: ActivitiesResult | null;
  /** The savings income worked out in detail (null when only the net amount was given). */
  savingsDetail: SavingsBreakdown | null;
  /** The general base with the gains that do not come from a transmission (boxes 0431-0434). */
  generalGains: ReturnType<typeof generalBaseOf> | null;
  /** The part of the compensatory pension that did not fit in the general base: off the savings one. */
  savingsReduction: number;
  /** Reduction for the joint return (0 in an individual one). */
  jointReduction: number;
  /** Joint return: the 340 € deduction was left out because its joint rules are not clear. */
  lowPayLeftOut: boolean;
  /** Gross pay from work of the return (box 0012; in a joint one, of the whole unit). */
  workGross: number;
  /** The person's own pay (box 0003) and social security (box 0013), as Renta WEB prints them. */
  workPay: number;
  workSocialSecurity: number;
  /** The reductions of the gross pay (box 0011: the 40 % of the DT 12.ª). */
  workReductions: number;
  /** Net pay before the "other expenses" of art. 19.2.f (box 0017). */
  workPrevious: number;
  /** General taxable base, before the reductions of the base (box 0435). */
  generalBase: number;
  /** General tax base, after them (box 0500). */
  taxBase: number;
  /** Savings taxable base, before the reductions that can reach it (box 0460). */
  savingsIncome: number;
  /** Savings tax base (box 0510). */
  savingsBase: number;
  minimum: {
    total: number;
    items: MinimumItem[];
    regionalTotal: number;
    /** The regional minimum item by item (boxes 0512 and 0518). */
    regionalItems: MinimumItem[];
  };
  stateQuota: number;
  regionalQuota: number;
  /** The part of the quotas that comes from the savings base. */
  savingsQuota: number;
  /** What each part of the minimum saves in tax (state + regional). */
  minimumSavings: Record<MinimumItem['key'], number>;
  stateDeductions: number;
  regionalDeductions: number;
  refundable: number;
  /**
   * The refundable deductions already collected in advance in the year (modelos 140 and 143): they
   * are added back to the result, boxes 0612, 0624, 0637, 0249, 0661 and 0663.
   */
  advanceReceived: number;
  /** Deduction for low pay from work (box 0414), already inside `stateDeductions`. */
  lowPay: number;
  /** Deduction for international double taxation of the savings read from the files (box 0588). */
  doubleTaxation: number;
  /** Deductions that were chosen but cannot be used: the income limit, or a requirement not met. */
  blocked: string[];
  /** Deductions marked with a question of their requirements still to answer: not applied yet. */
  unconfirmed: string[];
  /** What each chosen deduction gives (after the income limit), State's first. */
  lines: DeductionLine[];
  netQuota: number;
  withheld: number;
  /** Positive: to pay; negative: to be refunded. */
  result: number;
}

export interface DeductionLine {
  id: string;
  title: string;
  group: Deduction['group'];
  scope: 'state' | 'regional';
  amount: number;
}

/** Other income (not exempt) over which there is no reduction of art. 20 (the same in 2024-2026). */
const OTHER_INCOME_LIMIT = 6500;

/**
 * The deduction for low pay of 2025 (LIRPF DA 61.ª as added by Ley 5/2025, BOE-A-2025-15424, with
 * effect from 1-1-2025; checked 22-10-2026): 340 € up to 16,576 € of gross pay, falling by 20 cents
 * per euro to nothing at 18,276 €. Each year has its own in its rules (data/renta/ejercicios).
 */
export const LOW_PAY_2025: LowPayRule = {
  amount: 340,
  fullUntil: 16576,
  end: 18276,
  slope: 0.2,
  otherIncomeLimit: OTHER_INCOME_LIMIT,
};

/** Deduction for low pay from work (DA 61.ª): the full amount, then down by the slope to nothing. */
export function lowPayDeduction(
  grossPay: number,
  otherIncome: number,
  rule: LowPayRule = LOW_PAY_2025
): number {
  if (otherIncome > rule.otherIncomeLimit || grossPay >= rule.end || grossPay <= 0) return 0;
  if (grossPay < rule.fullUntil) return rule.amount;
  return round2(rule.amount - rule.slope * (grossPay - rule.fullUntil));
}

/** Rent after expenses, depreciation and the reduction (it can be negative). */
export function rentalNet(rental: RentalInput | null): number {
  if (!rental) return 0;
  // Property by property, each with its own reduction (box 0156 = sum of the 0154).
  if (rental.items) return round2(rental.items.reduce((s, r) => s + r.reducedNet, 0));
  const net = positive(rental.income) - positive(rental.expenses) - positive(rental.amortization);
  const percent = Math.min(90, positive(rental.reductionPercent));
  return round2(net > 0 ? net * (1 - percent / 100) : net);
}

/** One earner of the return: the person, or the spouse in a joint one. */
interface Earner {
  gross: number;
  socialSecurity: number;
  /** Union fees, professional association and legal defence (only the person's are asked). */
  extra: number;
  /** Works in a job: the extra expenses for a disability are only for active workers. */
  active: boolean;
  disability: Disability;
  /** Needs help of third people or has reduced mobility (only the person's is asked). */
  assistance: boolean;
  /** Own contributions to pension plans, and the employer's. */
  pensionPlan: number;
  pensionEmployer: number;
  /** Own contributions to the employer's plan, dependency premiums and the excess of years before. */
  employmentOwn: number;
  dependency: number;
  excess: { plans: number; dependency: number };
  /** The person: their 2,000 € always count, as in an individual return. */
  main: boolean;
}

/** The reductions of box 0011 (only the 40 % of the DT 12.ª is asked). */
export const transitionalReduction = (input: Pick<RentaInput, 'pensionCapital2006'>): number =>
  round2(positive(input.pensionCapital2006 ?? 0) * 0.4);

function earnersOf(input: RentaInput): Earner[] {
  const main: Earner = {
    // Box 0012: the gross pay less the reductions of box 0011.
    gross: Math.max(0, positive(input.gross) - transitionalReduction(input)),
    socialSecurity: positive(input.socialSecurity),
    extra: positive(input.workExpensesExtra),
    active: !input.retired,
    disability: input.family.disability,
    assistance: input.family.assistance === true,
    pensionPlan: positive(input.pensionPlan),
    pensionEmployer: positive(input.pensionPlanEmployer),
    employmentOwn: positive(input.pensionEmploymentOwn ?? 0),
    dependency: positive(input.dependencyPremiums ?? 0),
    excess: {
      plans: positive(input.pensionExcess?.plans ?? 0),
      dependency: positive(input.pensionExcess?.dependency ?? 0),
    },
    main: true,
  };
  const partner = input.joint?.partner;
  if (!partner) return [main];
  return [
    main,
    {
      gross: positive(partner.gross),
      socialSecurity: positive(partner.socialSecurity),
      extra: 0,
      active: !partner.retired,
      disability: partner.disability,
      assistance: false,
      pensionPlan: positive(partner.pensionPlan),
      pensionEmployer: 0,
      employmentOwn: 0,
      dependency: 0,
      excess: { plans: 0, dependency: 0 },
      main: false,
    },
  ];
}

/**
 * The increase of art. 19.2.f for an active worker with a disability: 3,500 €, or 7,750 € from 65 %
 * or when they "acrediten necesitar ayuda de terceras personas o movilidad reducida".
 */
const disabilityExpense = (
  state: RentaState,
  e: Pick<Earner, 'disability' | 'assistance'>
): number =>
  e.disability >= 65 || (e.disability >= 33 && e.assistance)
    ? state.workExpenses.disability65
    : e.disability >= 33
      ? state.workExpenses.disability33
      : 0;

/**
 * Net pay from work after the "other expenses" of art. 19.2.f (2,000 euros, more for an active
 * worker with a disability or who moved), for one earner or for a family unit.
 *
 * Joint return, AEAT Manual práctico de Renta 2025, "En particular, análisis de los gastos del artículo
 * 19.2.f)" (checked 19-10-2026, page of 17-03-2026): the increase for disability is a single one, the
 * one of the active worker with the highest degree, and the increase for mobility is 2,000 € in all.
 * The manual gives the 2,000 € "a todos los contribuyentes que obtengan rendimientos del trabajo" but
 * also says these expenses "se aplican por unidad familiar" without spelling out this amount: we give
 * 2,000 € to each earner and `oneGeneralExpense` shows what the other reading would cost.
 */
function workIncome(input: RentaInput, earners: Earner[]) {
  const { state } = input;
  // Net pay before the "other expenses": the reduction of art. 20 is measured on it.
  const before = earners.map((e) => Math.max(0, e.gross - e.socialSecurity - e.extra));
  let shares = earners.map((e) => (e.main || e.gross > 0 ? state.workExpenses.general : 0));
  if (input.joint?.oneGeneralExpense) {
    const top = before.indexOf(Math.max(...before));
    shares = shares.map((_, i) => (i === top ? state.workExpenses.general : 0));
  }
  const increments = earners.map(() => 0);
  const workers = earners.filter((e) => e.active && (e.main || e.gross > 0));
  const disabled = workers.reduce<Earner | null>(
    (best, e) =>
      disabilityExpense(state, e) > (best ? disabilityExpense(state, best) : 0) ? e : best,
    null
  );
  if (disabled) increments[earners.indexOf(disabled)] = disabilityExpense(state, disabled);
  if (input.geographicMobility) increments[0] += input.extras.geographicMobilityExtra;

  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
  const afterShares = sum(before.map((b, i) => Math.max(0, b - shares[i])));
  return {
    // Box 0019: art. 19.2.f, "tendrán como límite el rendimiento íntegro del trabajo una vez minorado
    // por el resto de gastos deducibles" (BOE-A-2006-20764, checked 19-10-2026): 0 without pay.
    otherExpenses: round2(sum(before.map((b, i) => Math.min(b, shares[i] + increments[i])))),
    netIncome: round2(Math.max(0, afterShares - sum(increments))),
    reductionBase: round2(sum(before)),
    /** The gross pay of the return (box 0012), and the net before the "other expenses" (box 0017). */
    gross: round2(sum(earners.map((e) => e.gross))),
    /** Each earner's own net pay: the 30 % limit of the pension plans is per member (art. 84.2.1.º). */
    each: before.map((b, i) => Math.max(0, b - shares[i] - increments[i])),
  };
}

/** The savings base, worked out from the detail when there is one, and the general gains. */
function savingsPart(input: RentaInput, partner: JointMember | null) {
  const detail = input.savingsDetail ? savingsOf(input.savingsDetail, input.state.year) : null;
  const ownSavings = detail ? detail.boxes['0460'] : positive(input.savings);
  return {
    detail,
    ownSavings,
    savingsTotal: round2(ownSavings + positive(partner?.savings ?? 0)),
    generalGains: detail?.general.positive ?? 0,
  };
}

/** The activities worked out for a given reduction of art. 20 (for the joint limit of 3,700 €). */
function activityRunner(input: RentaInput, otherIncome: number) {
  const activities = input.activities;
  const ctx = {
    otherIncome,
    // Art. 32.2.2.º.e: no pay from work, except unemployment or pensions up to 4,000 € a year.
    hasWork:
      positive(input.gross) > 0 &&
      !(positive(input.gross) <= 4000 && positive(input.nonSalaryIncome ?? 0) >= input.gross),
    disability: input.family.disability,
    assistance: input.family.assistance === true,
  };
  return (workReduction: number) =>
    activities
      ? activitiesOf(
          activities.list,
          { ...ctx, workReduction },
          activities.modules,
          activities.farm
        )
      : null;
}

/**
 * The most the worker's own contributions to the employer's plan can use of the 8,500 €, by what the
 * employer puts in (the table of LIRPF art. 52.1.b.1.º, BOE-A-2006-20764, checked 22-10-2026).
 * `pay`: the gross pay, taken as from that employer.
 */
export function employmentTableMax(
  employer: number,
  pay: number,
  t: BaseReductions['employmentTable']
): number {
  if (pay > t.highPayFrom || employer > t.midUpTo) return round2(employer * t.highTimes);
  if (employer <= t.lowUpTo) return round2(employer * t.lowTimes);
  return round2(t.midBase + t.midTimes * (employer - t.lowUpTo));
}

type PensionPart = 'gross' | 'pensionPlan' | 'pensionEmployer' | 'employmentOwn' | 'dependency';

/**
 * The pension plans and dependency insurance of one person (LIRPF arts. 51.5 and 52; Manual práctico
 * de Renta 2025, c13, «Límites y exceso de aportaciones» and its example, checked 22-10-2026). The
 * excess of the years before goes first and, like this year's, «con sujeción a los límites máximos»;
 * then the plans, then the dependency premiums (the Manual's choice, the better one). `room`: the 30 %
 * of the net work and activity income, and the base left.
 */
export function pensionOf(
  e: Pick<Earner, PensionPart | 'excess'>,
  room: number,
  r: BaseReductions
): { reduction: number; next: { plans: number; dependency: number } } {
  const table = employmentTableMax(e.pensionEmployer, e.gross, r.employmentTable);
  const inTable = Math.min(e.employmentOwn, table);
  const plansCap = r.pensionPlanLimit + r.pensionPlanEmployerLimit;
  // 1,500 € for all, raised by the employer's contributions and the own ones within the table.
  const plans = Math.min(
    e.pensionPlan + e.employmentOwn + e.pensionEmployer,
    r.pensionPlanLimit + Math.min(r.pensionPlanEmployerLimit, e.pensionEmployer + inTable)
  );
  const dependency = Math.min(e.dependency, r.dependencyLimit);
  let left = Math.max(0, room);
  const take = (amount: number, cap: number) => {
    const used = Math.min(amount, cap, left);
    left -= used;
    return used;
  };
  const oldPlans = take(e.excess.plans, plansCap);
  const oldDependency = take(e.excess.dependency, r.dependencyLimit);
  const newPlans = take(plans, plansCap - oldPlans);
  const newDependency = take(dependency, r.dependencyLimit - oldDependency);
  return {
    reduction: round2(oldPlans + oldDependency + newPlans + newDependency),
    // Only what the 30 % or the base left out carries (art. 52.2), not what passes the caps.
    next: {
      plans: round2(e.excess.plans - oldPlans + plans - newPlans),
      dependency: round2(e.excess.dependency - oldDependency + dependency - newDependency),
    },
  };
}

/** From the net pay to the general and savings bases: other income, the reductions of the base. */
function basesOf(input: RentaInput, earners: Earner[], work: ReturnType<typeof workIncome>) {
  const { state } = input;
  const partner = input.joint?.partner ?? null;
  const rentNet = rentalNet(input.rental);
  const imputed = round2(
    (positive(input.imputedValues.standard) * input.imputationRates.standard +
      positive(input.imputedValues.revised) * input.imputationRates.revised) /
      100
  );
  const { detail, ownSavings, savingsTotal, generalGains } = savingsPart(input, partner);
  // The reduction for low pay only applies when the other income does not pass 6,500 euros; in a
  // joint return it is one, on the net pay and the other income of the whole unit (AEAT Manual
  // práctico de Renta 2025, "Fase 3.ª: rendimiento neto reducido", checked 19-10-2026).
  const nonWork = Math.max(0, rentNet) + imputed + savingsTotal + generalGains;
  const activityOf = activityRunner(input, work.netIncome + nonWork);
  // The net income of the activities, before the reductions of art. 32, is other income for art. 20.
  const raw = activityOf(0);
  const activityNet = raw ? raw.each.reduce((sum, a) => sum + a.net, 0) : 0;
  const otherIncome = nonWork + Math.max(0, activityNet);
  const reduction = round2(
    otherIncome > OTHER_INCOME_LIMIT
      ? 0
      : Math.min(work.netIncome, positive(input.workReduction(work.reductionBase)))
  );

  // Box 0432 (work, capital and property income and imputations), and the gains that do not come
  // from a transmission on top of it (LIRPF art. 48).
  // The reductions of art. 32.2.3.º and art. 20 together up to 3,700 €.
  const act = activityOf(reduction);
  const income = work.netIncome - reduction + rentNet + imputed + (act?.total ?? 0);
  const general = detail ? generalBaseOf(income, detail.general, state.year) : null;
  const beforeReductions = general ? general.base : income;
  // Joint return (LIRPF art. 84.2.4.º; AEAT Manual 2025, "Reducción por tributación conjunta" and the
  // order of the reductions of the general base, checked 19-10-2026): it goes first, lowers the
  // general base down to zero and what is left lowers the savings base, also down to zero.
  const jointAmount = positive(input.joint?.reduction ?? 0);
  const jointGeneral = Math.min(jointAmount, Math.max(0, beforeReductions));
  const jointSavings = Math.min(jointAmount - jointGeneral, savingsTotal);
  const afterJoint = beforeReductions - jointGeneral;
  // Pension plans: up to 30 % of the net work and activity income (the activities before the
  // reductions of art. 32, Manual 2025, c13), for each member of the unit on their own (art.
  // 84.2.1.º), and never more than the base left.
  const r = state.baseReductions;
  let baseLeft = Math.max(0, afterJoint);
  const plans = earners.map((e, i) => {
    const own = work.each[i] + (i === 0 ? activityNet : 0);
    const p = pensionOf(e, Math.min((Math.max(0, own) * r.percentLimit) / 100, baseLeft), r);
    baseLeft -= p.reduction;
    return p;
  });
  const pensionReduction = round2(plans.reduce((sum, p) => sum + p.reduction, 0));
  // The spouse's plan (art. 51.7) goes with the pension plans, before the compensatory pension.
  const leftAfterPlans = Math.max(0, afterJoint - pensionReduction);
  const spouse = Math.min(Math.min(positive(input.spousePlan), 1000), leftAfterPlans);
  const compensatory = positive(input.compensatoryPension);
  const compensatoryGeneral = Math.min(compensatory, leftAfterPlans - spouse);
  // What is left of the compensatory pension (art. 55) lowers the savings base, never below zero:
  // LIRPF art. 50.2 (BOE-A-2006-20764, consolidated text, checked 19-10-2026): "disminuir la base
  // imponible del ahorro en el remanente, si lo hubiera, de la reducción prevista en el artículo 55".
  const compensatorySavings = round2(
    Math.min(compensatory - compensatoryGeneral, savingsTotal - jointSavings)
  );
  const otherReductions = round2(spouse + compensatoryGeneral);
  return {
    rentNet,
    imputed,
    reduction,
    beforeReductions,
    jointReduction: round2(jointGeneral + jointSavings),
    pensionReduction,
    pensionExcessNext: plans[0].next,
    otherReductions,
    taxBase: round2(Math.max(0, afterJoint - pensionReduction - otherReductions)),
    savingsIncome: savingsTotal,
    activities: act,
    ownSavings,
    detail,
    general,
    savingsReduction: compensatorySavings,
    savingsBase: round2(savingsTotal - jointSavings - compensatorySavings),
  };
}

/**
 * The deduction for low pay of the year (DA 61.ª: 340 € in 2025), held to the tax that is left. The AEAT Manual 2025
 * (c18, "Deducción por obtención de rendimientos del trabajo", checked 19-10-2026) says nothing of
 * joint returns: when all the pay and other income belong to one member every reading gives the
 * same; otherwise it is left out (`clear` false) and the result says so.
 */
function lowPayOf(input: RentaInput, otherIncome: number, quotaLeft: number) {
  const partner = input.joint?.partner ?? null;
  // Pay from a job (not pensions or benefits) and the other income of each one.
  const pay = (gross: number, nonSalary = 0) => Math.max(0, positive(gross) - positive(nonSalary));
  const ownPay = pay(input.gross, input.nonSalaryIncome);
  const partnerPay = partner ? pay(partner.gross, partner.nonSalaryIncome) : 0;
  const partnerOther = positive(partner?.savings ?? 0);
  const clear =
    !partner || (partnerPay === 0 && partnerOther === 0) || (ownPay === 0 && otherIncome === 0);
  // A State made by hand without the field is of 2025; null: the year has no such deduction.
  const rule = input.state.lowPay === undefined ? LOW_PAY_2025 : input.state.lowPay;
  const amount =
    clear && rule
      ? Math.min(quotaLeft, lowPayDeduction(ownPay + partnerPay, otherIncome + partnerOther, rule))
      : 0;
  // Without the deduction in the year there is nothing left out of a joint return.
  return { amount, clear: clear || !rule };
}

/** The refundable deductions marked that were collected in advance (modelos 140 and 143). */
function advanceOf(input: RentaInput): number {
  return input.state.deductions
    .filter((d) => isRefundable(d) && d.advance && input.choices[d.id]?.on)
    .reduce((sum, d) => sum + positive(input.choices[d.id].advance ?? 0), 0);
}

/** A deduction with what the person's age changes in it (a higher maximum while young). */
function adapted(d: Deduction, input: RentaInput): Deduction {
  return d.ageLimit && input.family.age <= d.ageLimit.maxAge
    ? { ...d, limit: d.ageLimit.limit }
    : d;
}

/** The social security of the year of an active person (art. 81 bis.2), or null when not held. */
function contributionsOf(input: RentaInput): number | null {
  // Only "los contribuyentes a que se refiere el primer párrafo": those who work, on their own or
  // for others; pensioners and the unemployed have no limit.
  const works = !input.retired && positive(input.gross) > positive(input.nonSalaryIncome ?? 0);
  const own = (input.activities?.list ?? []).reduce(
    (sum, a) => sum + (a.kind === 'direct' ? positive(a.data.expenses.ownSocialSecurity) : 0),
    0
  );
  if (!works && own <= 0) return null;
  return positive(input.socialSecurity) + own;
}

/** A deduction of art. 81 bis held to the contributions: each one, and for each relative on its own. */
function capped(d: Deduction, choice: DeductionChoice, amount: number, input: RentaInput): number {
  const cap = d.contributionCap ? contributionsOf(input) : null;
  if (cap === null || !choice.on) return amount;
  if (d.contributionCap === 'base') return round2(Math.min(1200, cap) + Math.max(0, amount - 1200));
  const units = Math.max(1, Math.floor(choice.units ?? 1));
  return round2(Math.min(amount, Math.min(amount / units, cap) * units));
}

/** The chosen deductions: what each one gives, split by quota, and those the income rules out. */
/**
 * The share of what was spent that counts for each group of deductions held together to a share of
 * the tax base (`Deduction.baseCap`): 1 when the group fits.
 */
function capFactors(
  input: RentaInput,
  liquidable: number,
  applies: (d: Deduction) => boolean
): Record<string, number> {
  const spent: Record<string, { total: number; share: number }> = {};
  for (const d of [...input.state.deductions, ...input.ccaa.deductions]) {
    const choice = input.choices[d.id];
    if (!d.baseCap || d.kind !== 'percent' || !applies(d)) continue;
    const g = (spent[d.baseCap.group] ??= { total: 0, share: d.baseCap.share });
    g.total += positive((choice as DeductionChoice).amount ?? 0);
  }
  return Object.fromEntries(
    Object.entries(spent).map(([group, g]) => {
      const cap = positive(liquidable) * g.share;
      return [group, g.total > cap ? cap / g.total : 1];
    })
  );
}

function deductionsOf(input: RentaInput, limitBase: (d: Deduction) => number, liquidable: number) {
  const blocked: string[] = [];
  const unconfirmed: string[] = [];
  const joint = input.joint !== undefined;
  // Only what can be applied (income limit and requirements) counts for the caps of a group.
  const applies = (d: Deduction) => {
    const c = input.choices[d.id];
    return (
      c?.on === true &&
      incomeFactor(d, limitBase(d), joint) > 0 &&
      checkDeduction(d.checks, input.family, c.checks).status === 'ok'
    );
  };
  const caps = capFactors(input, liquidable, applies);
  const lines: DeductionLine[] = [];
  const amountOf = (data: Deduction) => {
    const d = adapted(data, input);
    const marked = input.choices[d.id] ?? { on: false };
    const factor = incomeFactor(d, limitBase(d), input.joint !== undefined);
    if (marked.on && factor === 0) blocked.push(d.id);
    // Then its requirements: one not met leaves it out, one not answered keeps it waiting.
    const check =
      marked.on && factor > 0 ? checkDeduction(d.checks, input.family, marked.checks) : null;
    if (check?.status === 'fail') blocked.push(d.id);
    if (check?.status === 'missing') unconfirmed.push(d.id);
    const checked = check && check.status !== 'ok' ? { ...marked, on: false } : marked;
    // Held with the rest of its group to a share of the tax base (regional donations).
    const cap = d.baseCap ? (caps[d.baseCap.group] ?? 1) : 1;
    const choice = cap < 1 ? { ...checked, amount: positive(checked.amount ?? 0) * cap } : checked;
    const amount = capped(d, choice, deductionAmount(d, choice, factor), input);
    return {
      on: choice.on,
      amount: d.splitBetweenParents && input.family.sharedChildren ? round2(amount / 2) : amount,
    };
  };
  const line = (d: Deduction, scope: DeductionLine['scope'], amount: number) =>
    lines.push({ id: d.id, title: d.title, group: d.group, scope, amount });
  let stateDeductions = 0;
  let regionalDeductions = 0;
  let refundable = 0;
  // What was already collected each month is given back in the return (see computeRenta).
  const advanceReceived = advanceOf(input);
  for (const d of input.state.deductions) {
    const { on, amount } = amountOf(d);
    if (isRefundable(d)) {
      refundable += amount;
      if (on) line(d, 'state', amount);
      continue;
    }
    // A State deduction with a regional part lowers each quota by its share, each up to its quota.
    const parts = splitDeduction(amount, d.regionalShare ?? 0);
    stateDeductions += parts.state;
    regionalDeductions += parts.regional;
    if (on) line(d, 'state', parts.state);
    if (on && parts.regional > 0) line(d, 'regional', parts.regional);
  }
  for (const d of input.ccaa.deductions) {
    const { on, amount } = amountOf(d);
    regionalDeductions += amount;
    if (on) line(d, 'regional', amount);
  }
  return {
    blocked,
    unconfirmed,
    lines,
    stateDeductions,
    regionalDeductions,
    refundable,
    advanceReceived,
  };
}

/**
 * Box 0588, international double taxation (LIRPF art. 80.1, BOE-A-2006-20764, checked 19-10-2026):
 * "la menor de" the tax paid abroad and "el resultado de aplicar el tipo medio efectivo de gravamen a
 * la parte de base liquidable gravada en el extranjero", with the rate of the savings (art. 80.2).
 * The liquid quota of the savings is taken in the share the deductions left of the whole quota.
 */
function doubleTaxationOf(
  detail: SavingsBreakdown | null,
  savingsQuota: number,
  savingsBase: number,
  quota: { left: number; total: number },
  room: number
): number {
  if (!detail || savingsBase <= 0 || quota.total <= 0) return 0;
  const rate = (savingsQuota * quota.left) / quota.total / savingsBase;
  const total = detail.foreignTax.reduce(
    (sum, f) => sum + Math.min(positive(f.tax), positive(f.income) * rate),
    0
  );
  return round2(Math.min(total, Math.max(0, room)));
}

/** Work income minus expenses, reductions and the pension plan: the base the scales are applied to. */
export function computeRenta(input: RentaInput): RentaResult {
  const { state, ccaa, family } = input;
  const partner = input.joint?.partner ?? null;
  const earners = earnersOf(input);
  const work = workIncome(input, earners);
  const { otherExpenses, netIncome } = work;
  const {
    rentNet,
    imputed,
    reduction,
    beforeReductions,
    jointReduction,
    pensionReduction,
    pensionExcessNext,
    otherReductions,
    taxBase,
    savingsIncome,
    activities,
    ownSavings,
    detail,
    general,
    savingsReduction,
    savingsBase,
  } = basesOf(input, earners, work);

  const stateMin = withPartner(computeMinimum(family, state.minimums), partner, state.minimums);
  const regionMinimums = mergeMinimums(state.minimums, ccaa.minimums);
  const regionMin = withPartner(computeMinimum(family, regionMinimums), partner, regionMinimums);
  const regionScale = ccaa.scale ?? state.defaultRegionalScale;
  const { savingsScale } = input.extras;

  /** State and regional tax for a given minimum: the minimum that does not fit in the general base goes to savings. */
  const quotas = (minState: number, minRegion: number) => {
    const general = (scale: TaxBracket[], min: number) =>
      generalQuota(scale, taxBase, min, positive(input.childSupport ?? 0));
    const savings = (scale: TaxBracket[], min: number) =>
      applyScale(scale, Math.max(0, savingsBase - Math.max(0, min - taxBase)));
    return {
      stateGeneral: general(state.scale, minState),
      regionalGeneral: general(regionScale, minRegion),
      stateSavings: savings(savingsScale.state, minState),
      regionalSavings: savings(savingsScale.regional, minRegion),
    };
  };
  const base = quotas(stateMin.total, regionMin.total);
  const stateQuota = round2(base.stateGeneral + base.stateSavings);
  const regionalQuota = round2(base.regionalGeneral + base.regionalSavings);

  const minimumSavings = {} as RentaResult['minimumSavings'];
  for (const item of stateMin.items) {
    // Both minimums are built from the same family, so the item is always there.
    const regionAmount = (regionMin.items.find((i) => i.key === item.key) as MinimumItem).amount;
    const without = quotas(stateMin.total - item.amount, regionMin.total - regionAmount);
    const saved =
      without.stateGeneral +
      without.stateSavings +
      without.regionalGeneral +
      without.regionalSavings -
      (stateQuota + regionalQuota);
    minimumSavings[item.key] = round2(Math.max(0, saved));
  }
  // What was given (not the deduction) is turned into the deductions with the limit of the base.
  const donated = donationChoices(input.donations, taxBase + savingsBase);
  const withDonations = donated ? { ...input, choices: { ...input.choices, ...donated } } : input;
  const {
    blocked,
    unconfirmed,
    lines,
    stateDeductions,
    regionalDeductions,
    refundable,
    advanceReceived,
  } = deductionsOf(
    withDonations,
    (d) => limitBaseFor(d, { taxBase, savingsBase, minimum: stateMin }),
    taxBase + savingsBase
  );
  const appliedState = Math.min(stateQuota, stateDeductions);
  const appliedRegional = Math.min(regionalQuota, regionalDeductions);
  const quotaLeft = stateQuota - appliedState + (regionalQuota - appliedRegional);
  const low = lowPayOf(
    input,
    Math.max(0, rentNet) +
      imputed +
      ownSavings +
      (detail?.general.positive ?? 0) +
      Math.max(0, activities?.total ?? 0),
    quotaLeft
  );
  const lowPay = low.amount;
  const doubleTaxation = doubleTaxationOf(
    detail,
    base.stateSavings + base.regionalSavings,
    savingsBase,
    { left: quotaLeft, total: stateQuota + regionalQuota },
    quotaLeft - lowPay
  );
  if (lowPay > 0) {
    lines.push({
      id: 'estado-rendimientos-trabajo-bajos',
      title: 'Deducción por rendimientos del trabajo bajos',
      group: 'other',
      scope: 'state',
      amount: round2(lowPay),
    });
  }
  const netQuota = round2(quotaLeft - lowPay - doubleTaxation - refundable);
  // Box 0609: also the withholdings of the activities (0599), the quarterly payments (0604) and the
  // savings read from the investment files (0597 capital, 0603 fund gains).
  const withheld = round2(
    positive(input.withheld) +
      positive(partner?.withheld ?? 0) +
      (activities ? activities.withheld + activities.payments : 0) +
      (detail ? detail.withheld.capital + detail.withheld.gains : 0)
  );
  return {
    otherExpenses,
    netIncome,
    workGross: work.gross,
    workPay: round2(positive(input.gross)),
    workSocialSecurity: round2(positive(input.socialSecurity)),
    workReductions: transitionalReduction(input),
    workPrevious: work.reductionBase,
    workReduction: reduction,
    rentalNet: rentNet,
    imputedIncome: imputed,
    pensionReduction,
    pensionExcessNext,
    otherReductions,
    savingsReduction,
    activities,
    savingsDetail: detail,
    generalGains: general,
    jointReduction,
    lowPayLeftOut: !low.clear,
    generalBase: round2(Math.max(0, beforeReductions)),
    taxBase,
    savingsIncome,
    savingsBase,
    minimum: {
      total: stateMin.total,
      items: stateMin.items,
      regionalTotal: regionMin.total,
      regionalItems: regionMin.items,
    },
    stateQuota,
    regionalQuota,
    savingsQuota: round2(base.stateSavings + base.regionalSavings),
    minimumSavings,
    stateDeductions: round2(appliedState + lowPay),
    regionalDeductions: round2(appliedRegional),
    refundable: round2(refundable),
    advanceReceived: round2(advanceReceived),
    lowPay: round2(lowPay),
    doubleTaxation,
    blocked,
    unconfirmed,
    lines,
    netQuota,
    withheld,
    // Orden HAC/277/2026 (modelo 100 de 2025, BOE-A-2026-7041, page 25): [0670] = [0610] − [0611]
    // + [0612] − [0613] − [0623] + [0624] − [0636] + [0637] − [0248] + [0249] − [0660] + [0661]
    // − [0662] + [0663] ...: each deduction is taken off and its advance payment added back.
    result: round2(netQuota - withheld + advanceReceived),
  };
}
