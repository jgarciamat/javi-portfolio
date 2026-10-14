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

/** What a deduction gives for the choices the person made. */
export function deductionAmount(d: Deduction, choice: DeductionChoice): number {
  if (!choice.on) return 0;
  let value = 0;
  if (d.kind === 'fixed') {
    const units = Math.max(1, Math.floor(choice.units ?? 1));
    if (d.perChild && d.perChild.length > 0) {
      for (let i = 0; i < units; i++) value += nth(d.perChild, i);
    } else {
      // The limit of a fixed amount is per unit (1,200 € for each child under 3), not for the total.
      value = Math.min(d.amount ?? 0, d.limit ?? Infinity) * units;
    }
    return round2(value);
  } else if (d.kind === 'percent') {
    const spent = positive(choice.amount ?? 0);
    value = (Math.min(spent, d.baseLimit ?? Infinity) * (d.percent ?? 0)) / 100;
  } else {
    value = positive(choice.amount ?? 0);
  }
  return round2(Math.min(value, d.limit ?? Infinity));
}

/** The deductions that are paid out even when there is no tax to pay (maternity, large family, disability). */
export const isRefundable = (d: Deduction): boolean =>
  /maternidad|familia-numerosa|discapacidad/.test(d.id);

// ─── The whole calculation ────────────────────────────────────────────────────

export interface RentaInput {
  /** Gross yearly pay from work. */
  gross: number;
  /** Social security paid by the worker (euros). */
  socialSecurity: number;
  /** Income tax already withheld by the payer. */
  withheld: number;
  /** Own contributions to pension plans (euros). */
  pensionPlan: number;
  family: Family;
  state: RentaState;
  ccaa: RentaCcaa;
  /** The deductions chosen, by id. */
  choices: Record<string, DeductionChoice>;
  /** Reduction of the net income from work for low incomes (see the State's rules). */
  workReduction: (netIncome: number) => number;
}

export interface RentaResult {
  netIncome: number;
  workReduction: number;
  pensionReduction: number;
  taxBase: number;
  minimum: { total: number; items: MinimumItem[]; regionalTotal: number };
  stateQuota: number;
  regionalQuota: number;
  /** What each part of the minimum saves in tax (state + regional). */
  minimumSavings: Record<MinimumItem['key'], number>;
  stateDeductions: number;
  regionalDeductions: number;
  refundable: number;
  netQuota: number;
  withheld: number;
  /** Positive: to pay; negative: to be refunded. */
  result: number;
}

/** Work income minus expenses, reductions and the pension plan: the base the scales are applied to. */
export function computeRenta(input: RentaInput): RentaResult {
  const { state, ccaa, family } = input;
  const expenses =
    state.workExpenses.general +
    (family.disability >= 65
      ? state.workExpenses.disability65
      : family.disability >= 33
      ? state.workExpenses.disability33
      : 0);
  const netIncome = round2(
    Math.max(0, positive(input.gross) - positive(input.socialSecurity) - expenses)
  );
  const reduction = round2(Math.min(netIncome, positive(input.workReduction(netIncome))));
  const pensionLimit = state.baseReductions.pensionPlanLimit;
  const pensionReduction = round2(
    Math.min(positive(input.pensionPlan), pensionLimit, netIncome - reduction)
  );
  const taxBase = round2(Math.max(0, netIncome - reduction - pensionReduction));

  const stateMin = computeMinimum(family, state.minimums);
  const regionMinimums = mergeMinimums(state.minimums, ccaa.minimums);
  const regionMin = computeMinimum(family, regionMinimums);
  const regionScale = ccaa.scale ?? state.defaultRegionalScale;

  const stateQuota = applyMinimum(state.scale, taxBase, stateMin.total);
  const regionalQuota = applyMinimum(regionScale, taxBase, regionMin.total);

  const minimumSavings = {} as RentaResult['minimumSavings'];
  for (const item of stateMin.items) {
    // Both minimums are built from the same family, so the item is always there.
    const regionAmount = (regionMin.items.find((i) => i.key === item.key) as MinimumItem).amount;
    const stateSaving =
      applyMinimum(state.scale, taxBase, stateMin.total - item.amount) - stateQuota;
    const regionSaving =
      applyMinimum(regionScale, taxBase, regionMin.total - regionAmount) - regionalQuota;
    minimumSavings[item.key] = round2(Math.max(0, stateSaving) + Math.max(0, regionSaving));
  }

  let stateDeductions = 0;
  let regionalDeductions = 0;
  let refundable = 0;
  for (const d of state.deductions) {
    const value = deductionAmount(d, input.choices[d.id] ?? { on: false });
    if (isRefundable(d)) refundable += value;
    else stateDeductions += value;
  }
  for (const d of ccaa.deductions) {
    regionalDeductions += deductionAmount(d, input.choices[d.id] ?? { on: false });
  }
  const appliedState = Math.min(stateQuota, stateDeductions);
  const appliedRegional = Math.min(regionalQuota, regionalDeductions);
  const netQuota = round2(
    stateQuota - appliedState + (regionalQuota - appliedRegional) - refundable
  );
  return {
    netIncome,
    workReduction: reduction,
    pensionReduction,
    taxBase,
    minimum: { total: stateMin.total, items: stateMin.items, regionalTotal: regionMin.total },
    stateQuota,
    regionalQuota,
    minimumSavings,
    stateDeductions: round2(appliedState),
    regionalDeductions: round2(appliedRegional),
    refundable: round2(refundable),
    netQuota,
    withheld: round2(positive(input.withheld)),
    result: round2(netQuota - positive(input.withheld)),
  };
}
