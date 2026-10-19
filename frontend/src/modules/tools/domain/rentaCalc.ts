import type { RentaWorkExtras } from './rentaExtras';
import type { Deduction, MinimumAmounts, RentaCcaa, RentaState, TaxBracket } from './rentaData';
import { round2 } from './round';

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
}

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
  Pick<MinimumAmounts, 'descendantDisability33' | 'descendantDisability65'>;

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

const nth = (list: number[], index: number): number => list[Math.min(index, list.length - 1)];
/**
 * The minimum for a disability of `level` (a descendant's can have its own amounts). From 65 % it
 * includes the "gastos de asistencia" (3,000 €, or the community's own amount): LIRPF art. 60.1, 60.2
 * and 60.3 give them to the taxpayer, descendants and ascendants with a degree "igual o superior al
 * 65 por ciento" (BOE-A-2006-20764, consolidated text; AEAT Manual práctico de Renta 2025, c14,
 * "Mínimo por discapacidad", checked 19-10-2026). Third-party help or reduced mobility below 65 % is
 * not asked by the planner, so it is not counted.
 */
export const disabilityAmount = (
  level: Disability,
  m: FullMinimums,
  descendant = false
): number => {
  if (level >= 65)
    return ((descendant ? m.descendantDisability65 : undefined) ?? m.disability65) + m.assistance;
  if (level >= 33) return (descendant ? m.descendantDisability33 : undefined) ?? m.disability33;
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
  const share = family.sharedChildren ? 0.5 : 1;
  const items: MinimumItem[] = [{ key: 'personal', amount: m.personal }];
  // LIRPF art. 57.2 ("edad superior a 65/75 años"), with the age at the accrual date, 31 December
  // (art. 61.1.ª). The AEAT Manual práctico de Renta 2025 applies it to taxpayers "de edad igual o
  // superior a 65 años" (and 75): turning 65 (or 75) by 31 December is enough.
  const ageExtra = ageAmount(family.age, m);
  if (ageExtra > 0) items.push({ key: 'age', amount: ageExtra });

  const children = family.children.filter(countsAsDescendant).sort((a, b) => b.age - a.age);
  // The order is by date of birth: the oldest is the first.
  const descendants = children.reduce((sum, child, i) => {
    const base = nth(m.descendants, i) + (child.age < 3 ? m.under3 : 0);
    return sum + (base + disabilityAmount(child.disability, m, true)) * share;
  }, 0);
  if (descendants > 0) items.push({ key: 'descendants', amount: round2(descendants) });

  const ascendants = family.ascendants.reduce(
    (sum, a) =>
      sum + m.ascendants + (a.over75 ? m.ascendantsOver75 : 0) + disabilityAmount(a.disability, m),
    0
  );
  if (ascendants > 0) items.push({ key: 'ascendants', amount: ascendants });

  const own = disabilityAmount(family.disability, m);
  if (own > 0) items.push({ key: 'disability', amount: own });

  return { total: round2(items.reduce((sum, i) => sum + i.amount, 0)), items };
}

/** The amount each child adds to the minimum, in the order they count (the oldest first). */
export function descendantBreakdown(
  family: Family,
  m: FullMinimums
): { age: number; amount: number; under3: number; disability: number }[] {
  const share = family.sharedChildren ? 0.5 : 1;
  return family.children
    .filter(countsAsDescendant)
    .sort((a, b) => b.age - a.age)
    .map((child, i) => {
      const under3 = child.age < 3 ? m.under3 : 0;
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

// ─── Deductions ───────────────────────────────────────────────────────────────

export interface DeductionChoice {
  /** The deduction applies to the person. */
  on: boolean;
  /** percent: euros spent or invested. special: the deduction itself, in euros. */
  amount?: number;
  /** fixed: how many times (children, people...); defaults to 1, or to the children for `perChild`. */
  units?: number;
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

/** What a deduction gives for the choices the person made (`factor`: share allowed by the income limit). */
export function deductionAmount(d: Deduction, choice: DeductionChoice, factor = 1): number {
  if (!choice.on) return 0;
  if (d.kind === 'fixed') {
    const units = Math.max(1, Math.floor(choice.units ?? 1));
    return round2(fixedValue(d, units) * factor);
  }
  return round2(Math.min(spentValue(d, choice), d.limit ?? Infinity) * factor);
}

/** The deductions that are paid out even when there is no tax to pay (maternity, large family, disability). */
export const isRefundable = (d: Deduction): boolean =>
  /maternidad|familia-numerosa|discapacidad/.test(d.id);

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
  /** Change of residence for work reasons. */
  geographicMobility: boolean;
  /** Own contributions to pension plans, and those the employer makes (euros). */
  pensionPlan: number;
  pensionPlanEmployer: number;
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
  family: Family;
  state: RentaState;
  ccaa: RentaCcaa;
  extras: Pick<RentaWorkExtras, 'savingsScale' | 'geographicMobilityExtra'>;
  /** Rates (%) of the imputed income of properties that are not rented. */
  imputationRates: { standard: number; revised: number };
  /** The deductions chosen, by id. */
  choices: Record<string, DeductionChoice>;
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
  /** Other reductions: spouse plan and compensatory pension. */
  otherReductions: number;
  /** Reduction for the joint return (0 in an individual one). */
  jointReduction: number;
  /** Joint return: the 340 € deduction was left out because its joint rules are not clear. */
  lowPayLeftOut: boolean;
  /** General taxable base, before the reductions of the base (box 0435). */
  generalBase: number;
  /** General tax base, after them (box 0500). */
  taxBase: number;
  /** Savings tax base. */
  savingsBase: number;
  minimum: { total: number; items: MinimumItem[]; regionalTotal: number };
  stateQuota: number;
  regionalQuota: number;
  /** The part of the quotas that comes from the savings base. */
  savingsQuota: number;
  /** What each part of the minimum saves in tax (state + regional). */
  minimumSavings: Record<MinimumItem['key'], number>;
  stateDeductions: number;
  regionalDeductions: number;
  refundable: number;
  /** Deduction for low pay from work (box 0414), already inside `stateDeductions`. */
  lowPay: number;
  /** Deductions that were chosen but cannot be used because of the income limit. */
  blocked: string[];
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

const OTHER_INCOME_LIMIT = 6500;
const LOW_PAY_FULL = 16576;
const LOW_PAY_END = 18276;
const LOW_PAY_AMOUNT = 340;

/** Deduction for low pay (Renta 2025): 340 euros up to 16,576 of gross pay, falling by 20 cents per euro to zero at 18,276. */
export function lowPayDeduction(grossPay: number, otherIncome: number): number {
  if (otherIncome > OTHER_INCOME_LIMIT || grossPay >= LOW_PAY_END || grossPay <= 0) return 0;
  if (grossPay < LOW_PAY_FULL) return LOW_PAY_AMOUNT;
  return round2(LOW_PAY_AMOUNT - 0.2 * (grossPay - LOW_PAY_FULL));
}

/** Rent after expenses, depreciation and the reduction (it can be negative). */
export function rentalNet(rental: RentalInput | null): number {
  if (!rental) return 0;
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
  /** Own and employer's contributions to pension plans. */
  pensionPlan: number;
  /** The person: their 2,000 € always count, as in an individual return. */
  main: boolean;
}

function earnersOf(input: RentaInput): Earner[] {
  const main: Earner = {
    gross: positive(input.gross),
    socialSecurity: positive(input.socialSecurity),
    extra: positive(input.workExpensesExtra),
    active: !input.retired,
    disability: input.family.disability,
    pensionPlan: positive(input.pensionPlan) + positive(input.pensionPlanEmployer),
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
      pensionPlan: positive(partner.pensionPlan),
      main: false,
    },
  ];
}

const disabilityExpense = (state: RentaState, level: Disability): number =>
  level >= 65 ? state.workExpenses.disability65 : level >= 33 ? state.workExpenses.disability33 : 0;

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
      disabilityExpense(state, e.disability) >
      (best ? disabilityExpense(state, best.disability) : 0)
        ? e
        : best,
    null
  );
  if (disabled)
    increments[earners.indexOf(disabled)] = disabilityExpense(state, disabled.disability);
  if (input.geographicMobility) increments[0] += input.extras.geographicMobilityExtra;

  const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
  const afterShares = sum(before.map((b, i) => Math.max(0, b - shares[i])));
  return {
    otherExpenses: sum(shares) + sum(increments),
    netIncome: round2(Math.max(0, afterShares - sum(increments))),
    reductionBase: round2(sum(before)),
    /** Each earner's own net pay: the 30 % limit of the pension plans is per member (art. 84.2.1.º). */
    each: before.map((b, i) => Math.max(0, b - shares[i] - increments[i])),
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
  const savingsTotal = round2(positive(input.savings) + positive(partner?.savings ?? 0));
  // The reduction for low pay only applies when the other income does not pass 6,500 euros; in a
  // joint return it is one, on the net pay and the other income of the whole unit (AEAT Manual
  // práctico de Renta 2025, "Fase 3.ª: rendimiento neto reducido", checked 19-10-2026).
  const otherIncome = Math.max(0, rentNet) + imputed + savingsTotal;
  const reduction = round2(
    otherIncome > OTHER_INCOME_LIMIT
      ? 0
      : Math.min(work.netIncome, positive(input.workReduction(work.reductionBase)))
  );

  const beforeReductions = work.netIncome - reduction + rentNet + imputed;
  // Joint return (LIRPF art. 84.2.4.º; AEAT Manual 2025, "Reducción por tributación conjunta" and the
  // order of the reductions of the general base, checked 19-10-2026): it goes first, lowers the
  // general base down to zero and what is left lowers the savings base, also down to zero.
  const jointAmount = positive(input.joint?.reduction ?? 0);
  const jointGeneral = Math.min(jointAmount, Math.max(0, beforeReductions));
  const jointSavings = Math.min(jointAmount - jointGeneral, savingsTotal);
  const afterJoint = beforeReductions - jointGeneral;
  // Pension plans: own and employer's together up to the limit, and up to 30 % of the net work
  // income, for each member of the unit on their own (art. 84.2.1.º).
  const pensionLimit =
    state.baseReductions.pensionPlanLimit + state.baseReductions.pensionPlanEmployerLimit;
  const pensionReduction = round2(
    Math.min(
      earners.reduce(
        (sum, e, i) => sum + Math.min(e.pensionPlan, pensionLimit, work.each[i] * 0.3),
        0
      ),
      Math.max(0, afterJoint)
    )
  );
  const otherReductions = round2(
    Math.min(
      Math.min(positive(input.spousePlan), 1000) + positive(input.compensatoryPension),
      Math.max(0, afterJoint - pensionReduction)
    )
  );
  return {
    rentNet,
    imputed,
    reduction,
    beforeReductions,
    jointReduction: round2(jointGeneral + jointSavings),
    pensionReduction,
    otherReductions,
    taxBase: round2(Math.max(0, afterJoint - pensionReduction - otherReductions)),
    savingsBase: round2(savingsTotal - jointSavings),
  };
}

/**
 * The 340 € deduction for low pay (Renta 2025), held to the tax that is left. The AEAT Manual 2025
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
  const amount = clear
    ? Math.min(quotaLeft, lowPayDeduction(ownPay + partnerPay, otherIncome + partnerOther))
    : 0;
  return { amount, clear };
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
    otherReductions,
    taxBase,
    savingsBase,
  } = basesOf(input, earners, work);

  const stateMin = withPartner(computeMinimum(family, state.minimums), partner, state.minimums);
  const regionMinimums = mergeMinimums(state.minimums, ccaa.minimums);
  const regionMin = withPartner(computeMinimum(family, regionMinimums), partner, regionMinimums);
  const regionScale = ccaa.scale ?? state.defaultRegionalScale;
  const { savingsScale } = input.extras;

  /** State and regional tax for a given minimum: the minimum that does not fit in the general base goes to savings. */
  const quotas = (minState: number, minRegion: number) => {
    const general = (scale: TaxBracket[], min: number) => applyMinimum(scale, taxBase, min);
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
  const blocked: string[] = [];
  const lines: DeductionLine[] = [];
  const amountOf = (d: Deduction, scope: DeductionLine['scope']): number => {
    const choice = input.choices[d.id] ?? { on: false };
    const factor = incomeFactor(
      d,
      limitBaseFor(d, { taxBase, savingsBase, minimum: stateMin }),
      input.joint !== undefined
    );
    if (choice.on && factor === 0) blocked.push(d.id);
    const amount = deductionAmount(d, choice, factor);
    if (choice.on) lines.push({ id: d.id, title: d.title, group: d.group, scope, amount });
    return amount;
  };
  let stateDeductions = 0;
  let regionalDeductions = 0;
  let refundable = 0;
  for (const d of state.deductions) {
    const value = amountOf(d, 'state');
    if (isRefundable(d)) refundable += value;
    else stateDeductions += value;
  }
  for (const d of ccaa.deductions) regionalDeductions += amountOf(d, 'regional');
  const appliedState = Math.min(stateQuota, stateDeductions);
  const appliedRegional = Math.min(regionalQuota, regionalDeductions);
  const quotaLeft = stateQuota - appliedState + (regionalQuota - appliedRegional);
  const low = lowPayOf(input, Math.max(0, rentNet) + imputed + positive(input.savings), quotaLeft);
  const lowPay = low.amount;
  if (lowPay > 0) {
    lines.push({
      id: 'estado-rendimientos-trabajo-bajos',
      title: 'Deducción por rendimientos del trabajo bajos',
      group: 'other',
      scope: 'state',
      amount: round2(lowPay),
    });
  }
  const netQuota = round2(quotaLeft - lowPay - refundable);
  const withheld = round2(positive(input.withheld) + positive(partner?.withheld ?? 0));
  return {
    otherExpenses,
    netIncome,
    workReduction: reduction,
    rentalNet: rentNet,
    imputedIncome: imputed,
    pensionReduction,
    otherReductions,
    jointReduction,
    lowPayLeftOut: !low.clear,
    generalBase: round2(Math.max(0, beforeReductions)),
    taxBase,
    savingsBase,
    minimum: { total: stateMin.total, items: stateMin.items, regionalTotal: regionMin.total },
    stateQuota,
    regionalQuota,
    savingsQuota: round2(base.stateSavings + base.regionalSavings),
    minimumSavings,
    stateDeductions: round2(appliedState + lowPay),
    regionalDeductions: round2(appliedRegional),
    refundable: round2(refundable),
    lowPay: round2(lowPay),
    blocked,
    lines,
    netQuota,
    withheld,
    result: round2(netQuota - withheld),
  };
}
