import {
  countedChildren,
  disabilityAmount,
  mergeMinimums,
  type FullMinimums,
  type Family,
  type MinimumItem,
  type RentaInput,
  type RentaResult,
} from './rentaCalc';
import { round2 } from './round';

/** The boxes of the return (modelo 100) that the planner also works out, in the order of the form. */
export const COMPARED_BOXES = [
  '0003',
  '0012',
  '0013',
  '0017',
  '0019',
  '0022',
  '0023',
  '0025',
  '0155',
  '0435',
  '0460',
  '0500',
  '0510',
  '0511',
  '0512',
  '0517',
  '0518',
  '0519',
  '0520',
  '0545',
  '0546',
  '0570',
  '0571',
  '0587',
  '0414',
  '0595',
  '0609',
  '0610',
  '0670',
] as const;

export type ComparedBox = (typeof COMPARED_BOXES)[number];

/** The boxes each one is worked out from: a difference there explains the one here. */
const COMES_FROM: Partial<Record<ComparedBox, ComparedBox[]>> = {
  '0012': ['0003'],
  '0017': ['0012', '0013'],
  '0022': ['0003', '0012', '0013', '0017', '0019'],
  '0023': ['0003', '0013', '0017'],
  '0025': ['0022', '0023'],
  '0435': ['0025', '0155'],
  '0500': ['0435'],
  '0510': ['0460'],
  '0519': ['0511', '0517'],
  '0520': ['0512', '0518'],
  '0545': ['0500', '0510', '0519'],
  '0546': ['0500', '0510', '0520'],
  '0570': ['0545'],
  '0571': ['0546'],
  '0587': ['0570', '0571'],
  '0414': ['0003'],
  '0595': ['0587', '0545', '0546', '0414'],
  '0610': ['0595', '0609'],
  '0670': ['0610'],
};

/** Below a cent there is nothing to explain; up to a euro it is the rounding of the steps. */
const CENT = 0.005;
const ROUNDING = 1;

/** The minimum for disabilities: the person's own, the children's and the ascendants' (box 0517). */
export function disabilityMinimum(family: Family, m: FullMinimums): number {
  const children = countedChildren(family).reduce(
    (sum, { child, share }) => sum + disabilityAmount(child.disability, m, true) * share,
    0
  );
  const ascendants = family.ascendants.reduce(
    (sum, a) => sum + disabilityAmount(a.disability, m),
    0
  );
  return round2(
    disabilityAmount(family.disability, m, false, family.assistance) + children + ascendants
  );
}

/** The minimum of the taxpayer: the general amount and the one for age (boxes 0511 and 0512). */
const ownMinimum = (items: MinimumItem[]): number =>
  round2(
    items
      .filter((i) => i.key === 'personal' || i.key === 'age')
      .reduce((sum, i) => sum + i.amount, 0)
  );

/**
 * What the planner gives for each compared box. The liquid quotas (Orden HAC/277/2026, modelo 100
 * 2025, BOE-A-2026-7041, page 22: [0570] = [0545] − deductions, [0571] = [0546] − deductions, and
 * page 23: [0587] = [0585] + [0586]) are taken before the 340 € deduction of box 0414, which the
 * model takes off after them ([0595] = [0587] − [0588] − [0414] − ...).
 */
export function ourBoxes(result: RentaResult, input: RentaInput): Record<ComparedBox, number> {
  // The refundable deductions (maternity, large family...) come after the result of box 0595.
  const quota = round2(result.netQuota + result.refundable);
  const partner = input.joint?.partner ?? null;
  const disability = (m: FullMinimums) =>
    round2(
      disabilityMinimum(input.family, m) + (partner ? disabilityAmount(partner.disability, m) : 0)
    );
  const stateLiquid = round2(result.stateQuota - (result.stateDeductions - result.lowPay));
  const regionalLiquid = round2(result.regionalQuota - result.regionalDeductions);
  return {
    '0003': round2(Math.max(0, input.gross)),
    '0012': result.workGross,
    '0013': round2(Math.max(0, input.socialSecurity)),
    '0017': result.workPrevious,
    '0019': result.otherExpenses,
    '0022': result.netIncome,
    '0023': result.workReduction,
    '0025': round2(result.netIncome - result.workReduction),
    '0155': result.imputedIncome,
    '0435': result.generalBase,
    '0460': result.savingsIncome,
    '0500': result.taxBase,
    '0510': result.savingsBase,
    '0511': ownMinimum(result.minimum.items),
    '0512': ownMinimum(result.minimum.regionalItems),
    '0517': disability(input.state.minimums),
    '0518': disability(mergeMinimums(input.state.minimums, input.ccaa.minimums)),
    '0519': result.minimum.total,
    '0520': result.minimum.regionalTotal,
    '0545': result.stateQuota,
    '0546': result.regionalQuota,
    '0570': stateLiquid,
    '0571': regionalLiquid,
    '0587': round2(stateLiquid + regionalLiquid),
    '0414': result.lowPay,
    '0595': quota,
    '0609': result.withheld,
    '0610': round2(quota - result.withheld),
    '0670': result.result,
  };
}

/** What the person told the planner, as far as it explains a difference. */
export interface CompareContext {
  disability: number;
  retired: boolean;
  mobility: boolean;
  /** The social security was typed (else it is estimated as a share of the pay). */
  socialSecurityTyped: boolean;
  /** Pensions and benefits inside the gross. */
  nonSalary: number;
}

/** A likely reason for a difference: a text key, and the box it comes from when it is carried. */
export interface Why {
  key: string;
  from?: ComparedBox;
}

export interface CompareRow {
  box: ComparedBox;
  draft: number;
  ours: number;
  /** Ours minus the draft's. */
  diff: number;
  differs: boolean;
  why: Why | null;
}

/** The reason of a difference in each box that does not depend on which way it goes. */
const REASONS: Partial<Record<ComparedBox, string>> = {
  '0003': 'gross',
  '0012': 'gross',
  '0017': 'workExpenses',
  '0155': 'otherIncome',
  '0460': 'savings',
  '0510': 'baseReductions',
  '0512': 'age',
  '0518': 'disabilityMinimum',
  '0520': 'familyMinimum',
  '0570': 'deductions',
  '0571': 'deductions',
  '0022': 'workExpenses',
  '0023': 'reduction',
  '0435': 'otherIncome',
  '0500': 'baseReductions',
  '0511': 'age',
  '0517': 'disabilityMinimum',
  '0519': 'familyMinimum',
  '0546': 'regionalScale',
  '0595': 'deductions',
  '0609': 'withheld',
  '0670': 'refundable',
};

/** Other expenses: the extra for a disability is only for people in active work (LIRPF art. 19.2.f). */
function otherExpensesReason(diff: number, ctx: CompareContext): string {
  if (diff > 0 && ctx.disability > 0 && !ctx.retired) return 'disabilityWorker';
  if (diff < 0 && ctx.disability > 0 && ctx.retired) return 'disabilityRetired';
  if (diff > 0 && ctx.mobility) return 'mobility';
  return 'otherExpenses';
}

/** The likely reason of a difference that does not come from an earlier box. */
function reasonFor(box: ComparedBox, diff: number, ctx: CompareContext): string {
  if (box === '0013') return ctx.socialSecurityTyped ? 'socialSecurity' : 'socialSecurityEstimated';
  if (box === '0019') return otherExpensesReason(diff, ctx);
  if (box === '0414') return diff > 0 && ctx.nonSalary <= 0 ? 'lowPayPensions' : 'lowPay';
  // 0025, 0545 and 0610 only add up others: what is left is in the data of the steps.
  return REASONS[box] ?? 'generic';
}

/** The draft's boxes next to ours, with a likely reason for each difference. */
export function compareBoxes(
  draft: Record<string, number>,
  ours: Record<ComparedBox, number>,
  ctx: CompareContext
): CompareRow[] {
  const rows: CompareRow[] = [];
  const differing = new Set<ComparedBox>();
  for (const box of COMPARED_BOXES) {
    const theirs = draft[box];
    if (theirs === undefined) continue;
    const diff = round2(ours[box] - theirs);
    const differs = Math.abs(diff) > CENT;
    let why: Why | null = null;
    if (differs) {
      differing.add(box);
      const from = (COMES_FROM[box] ?? []).find((b) => differing.has(b));
      if (from) why = { key: 'carried', from };
      else if (Math.abs(diff) <= ROUNDING && box !== '0003' && box !== '0609') {
        why = { key: 'rounding' };
      } else why = { key: reasonFor(box, diff, ctx) };
    }
    rows.push({ box, draft: theirs, ours: ours[box], diff, differs, why });
  }
  return rows;
}

/** The result of the draft (to pay > 0, refund < 0): the final box, or the differential quota. */
export function draftResult(draft: Record<string, number>): number | null {
  return draft['0670'] ?? draft['0610'] ?? null;
}
