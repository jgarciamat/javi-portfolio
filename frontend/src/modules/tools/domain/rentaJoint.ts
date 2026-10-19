import {
  computeRenta,
  countsAsDescendant,
  type Child,
  type JointMember,
  type RentaInput,
  type RentaResult,
} from './rentaCalc';
import { round2 } from './round';

/** couple: spouses and their minor children; single: one parent with the children who live with them. */
export type JointKind = 'couple' | 'single';

export interface JointRules {
  coupleReduction: number;
  singleParentReduction: number;
  /** Children under this age are part of the family unit. */
  minorUntil: number;
}

export interface JointComparison {
  kind: JointKind;
  you: RentaResult;
  /** The spouse's own return (null for a single parent). */
  partner: RentaResult | null;
  /** The individual returns together: positive to pay, negative to be refunded. */
  individual: number;
  joint: RentaResult;
  /** Positive: what the joint return saves; negative: what it costs. */
  saving: number;
  best: 'joint' | 'individual' | 'same';
  /**
   * All the children in one parent's return instead of half each, the better of the two. Only shown:
   * when both parents live with the children the minimum is split in equal parts (LIRPF art. 61.1.ª).
   */
  childrenToOne: { to: 'you' | 'partner'; individual: number } | null;
  /** The joint result with a single 2,000 € of "other expenses" for the unit (two earners only). */
  oneGeneralExpense: number | null;
  /** The 340 € deduction of the individual returns that the joint one leaves out. */
  lowPayLeftOut: number;
}

/** Whether the family unit exists: a couple always; one parent needs a minor child (LIRPF art. 82.1). */
export function canFileJointly(kind: JointKind, children: Child[], rules: JointRules): boolean {
  return kind === 'couple' || children.some((c) => c.age < rules.minorUntil);
}

/** The spouse's own return: their pay, age and basic income, with the children given, no deductions. */
export function partnerInput(
  input: RentaInput,
  partner: JointMember,
  children: Child[],
  shared: boolean
): RentaInput {
  return {
    ...input,
    gross: partner.gross,
    socialSecurity: partner.socialSecurity,
    withheld: partner.withheld,
    nonSalaryIncome: partner.nonSalaryIncome,
    retired: partner.retired,
    workExpensesExtra: 0,
    geographicMobility: false,
    pensionPlan: partner.pensionPlan,
    pensionPlanEmployer: 0,
    spousePlan: 0,
    compensatoryPension: 0,
    rental: null,
    imputedValues: { standard: 0, revised: 0 },
    savings: partner.savings,
    family: {
      age: partner.age,
      disability: partner.disability,
      children,
      ascendants: [],
      sharedChildren: shared,
    },
    choices: {},
    joint: undefined,
  };
}

/** All the children with one parent and none with the other: the better of the two ways. */
function childrenToOneOf(input: RentaInput, spouse: JointMember): JointComparison['childrenToOne'] {
  const { family } = input;
  if (!family.children.some(countsAsDescendant)) return null;
  const toYou =
    computeRenta({ ...input, family: { ...family, sharedChildren: false } }).result +
    computeRenta(partnerInput(input, spouse, [], false)).result;
  const toPartner =
    computeRenta({ ...input, family: { ...family, children: [] } }).result +
    computeRenta(partnerInput(input, spouse, family.children, false)).result;
  return toYou <= toPartner
    ? { to: 'you', individual: round2(toYou) }
    : { to: 'partner', individual: round2(toPartner) };
}

/** The input of the joint return: the unit, with the reduction of the base. */
export function jointInputOf(
  input: RentaInput,
  spouse: JointMember | null,
  reduction: number
): RentaInput {
  return {
    ...input,
    // In a couple's return the children are part of the unit: their whole minimum is there.
    family: spouse ? { ...input.family, sharedChildren: false } : input.family,
    joint: { partner: spouse, reduction },
  };
}

/** The joint return, and the same with a single 2,000 € of "other expenses" when both earn. */
function jointOf(
  input: RentaInput,
  spouse: JointMember | null,
  reduction: number
): { joint: RentaResult; oneGeneralExpense: number | null } {
  const jointInput = jointInputOf(input, spouse, reduction);
  const twoEarners = spouse !== null && input.gross > 0 && spouse.gross > 0;
  return {
    joint: computeRenta(jointInput),
    oneGeneralExpense: twoEarners
      ? computeRenta({
          ...jointInput,
          joint: { partner: spouse, reduction, oneGeneralExpense: true },
        }).result
      : null,
  };
}

/** The reduction of the base: a couple's, or a single parent's unless they live with the other parent. */
const reductionOf = (
  couple: boolean,
  options: { livesWithOtherParent: boolean; rules: JointRules }
) =>
  couple
    ? options.rules.coupleReduction
    : options.livesWithOtherParent
    ? 0
    : options.rules.singleParentReduction;

const bestOf = (saving: number): JointComparison['best'] =>
  saving > 0 ? 'joint' : saving < 0 ? 'individual' : 'same';

/**
 * Two individual returns against the joint one. The deductions marked and the properties stay in the
 * person's own return; the children's minimum is split between the parents in the individual returns
 * and whole in the joint one, where they are part of the unit. The children are taken to have no income.
 */
export function compareJoint(
  input: RentaInput,
  kind: JointKind,
  partner: JointMember | null,
  options: { livesWithOtherParent: boolean; rules: JointRules }
): JointComparison | null {
  const { rules } = options;
  const { family } = input;
  if (!canFileJointly(kind, family.children, rules)) return null;
  const spouse = kind === 'couple' ? partner : null;

  const you = computeRenta(
    spouse ? { ...input, family: { ...family, sharedChildren: true } } : input
  );
  const partnerResult = spouse
    ? computeRenta(partnerInput(input, spouse, family.children, true))
    : null;
  const individual = round2(you.result + (partnerResult?.result ?? 0));
  const reduction = reductionOf(spouse !== null, options);
  const { joint, oneGeneralExpense } = jointOf(input, spouse, reduction);
  const saving = round2(individual - joint.result);
  return {
    kind,
    you,
    partner: partnerResult,
    individual,
    joint,
    saving,
    best: bestOf(saving),
    childrenToOne: spouse ? childrenToOneOf(input, spouse) : null,
    oneGeneralExpense,
    // Only a couple can leave it out: a single parent's unit has no other earner.
    lowPayLeftOut: joint.lowPayLeftOut
      ? round2(you.lowPay + (partnerResult as RentaResult).lowPay)
      : 0,
  };
}
