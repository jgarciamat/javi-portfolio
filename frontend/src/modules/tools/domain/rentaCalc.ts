import type { RentaWorkExtras } from './rentaExtras';
import type { Deduction, MinimumAmounts, RentaCcaa, RentaState, TaxBracket } from './rentaData';

const round2 = (n: number) => Math.round(n * 100) / 100;
const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Tax of a progressive scale: every bracket taxes only the part of the base inside it. */
export function applyScale(scale: TaxBracket[], base: number): number {
  const amount = positive(base);
  let tax = 0;
  for (let i = 0; i < scale.length; i++) {
    const from = scale[i].from;
    const to = i + 1 < scale.length ? scale[i + 1].from : Infinity;
    if (amount <= from) break;
    tax += (Math.min(amount, to) - from) * (scale[i].rate / 100);
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
const disabilityAmount = (level: Disability, m: FullMinimums, descendant = false): number => {
  if (level >= 65) return (descendant ? m.descendantDisability65 : undefined) ?? m.disability65;
  if (level >= 33) return (descendant ? m.descendantDisability33 : undefined) ?? m.disability33;
  return 0;
};

/** The personal and family minimum, item by item (it lowers the tax, see {@link applyMinimum}). */
export function computeMinimum(
  family: Family,
  m: FullMinimums
): { total: number; items: MinimumItem[] } {
  const share = family.sharedChildren ? 0.5 : 1;
  const items: MinimumItem[] = [{ key: 'personal', amount: m.personal }];
  const ageExtra = family.age > 75 ? m.over65 + m.over75 : family.age > 65 ? m.over65 : 0;
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
}

export interface RentaResult {
  netIncome: number;
  workReduction: number;
  rentalNet: number;
  imputedIncome: number;
  pensionReduction: number;
  /** Other reductions: spouse plan and compensatory pension. */
  otherReductions: number;
  /** General tax base. */
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

/** Deductible expenses of work: the general amount, more with a disability or a move, plus the extra ones. */
function workExpenses(input: RentaInput): number {
  const { state, family } = input;
  return (
    state.workExpenses.general +
    (family.disability >= 65
      ? state.workExpenses.disability65
      : family.disability >= 33
      ? state.workExpenses.disability33
      : 0) +
    (input.geographicMobility ? input.extras.geographicMobilityExtra : 0) +
    positive(input.workExpensesExtra)
  );
}

/** Work income minus expenses, reductions and the pension plan: the base the scales are applied to. */
export function computeRenta(input: RentaInput): RentaResult {
  const { state, ccaa, family } = input;
  const expenses = workExpenses(input);
  const netIncome = round2(
    Math.max(0, positive(input.gross) - positive(input.socialSecurity) - expenses)
  );

  const rentNet = rentalNet(input.rental);
  const imputed = round2(
    (positive(input.imputedValues.standard) * input.imputationRates.standard +
      positive(input.imputedValues.revised) * input.imputationRates.revised) /
      100
  );
  const savingsBase = round2(positive(input.savings));
  // The reduction for low pay only applies when the other income does not pass 6,500 euros.
  const otherIncome = Math.max(0, rentNet) + imputed + savingsBase;
  const reduction = round2(
    otherIncome > OTHER_INCOME_LIMIT
      ? 0
      : Math.min(netIncome, positive(input.workReduction(netIncome)))
  );

  const beforeReductions = netIncome - reduction + rentNet + imputed;
  // Pension plans: own and employer's together up to the limit, and up to 30 % of the net work income.
  const pensionCap = Math.min(
    state.baseReductions.pensionPlanLimit + state.baseReductions.pensionPlanEmployerLimit,
    netIncome * 0.3
  );
  const pensionReduction = round2(
    Math.min(
      positive(input.pensionPlan) + positive(input.pensionPlanEmployer),
      pensionCap,
      Math.max(0, beforeReductions)
    )
  );
  const otherReductions = round2(
    Math.min(
      Math.min(positive(input.spousePlan), 1000) + positive(input.compensatoryPension),
      Math.max(0, beforeReductions - pensionReduction)
    )
  );
  const taxBase = round2(Math.max(0, beforeReductions - pensionReduction - otherReductions));

  const stateMin = computeMinimum(family, state.minimums);
  const regionMinimums = mergeMinimums(state.minimums, ccaa.minimums);
  const regionMin = computeMinimum(family, regionMinimums);
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
    const factor = incomeFactor(d, limitBaseFor(d, { taxBase, savingsBase, minimum: stateMin }));
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
  const lowPay = Math.min(
    quotaLeft,
    lowPayDeduction(input.gross, Math.max(0, rentNet) + imputed + positive(input.savings))
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
  const netQuota = round2(quotaLeft - lowPay - refundable);
  return {
    netIncome,
    workReduction: reduction,
    rentalNet: rentNet,
    imputedIncome: imputed,
    pensionReduction,
    otherReductions,
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
    blocked,
    lines,
    netQuota,
    withheld: round2(positive(input.withheld)),
    result: round2(netQuota - positive(input.withheld)),
  };
}
