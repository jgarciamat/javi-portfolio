import { incomeFactor, limitBaseFor, type RentaResult } from './rentaCalc';
import type { Deduction } from './rentaData';
import type { DraftState } from './rentaDraft';
import { number, type Choice, type RentaForm } from './rentaForm';
import { isRelevant, type DraftSituation } from './rentaRelevance';
import type { DeductionSaving } from './rentaSavings';

/** What the person said in the review of the deductions that could apply, kept with the form. */
export interface ReviewState {
  /** "It does not apply to me": never asked again (with the draft's dismissed ones). */
  dismissed: string[];
  /** "I will decide later": pending, at the end of the review. */
  later: string[];
}

export const NO_REVIEW: ReviewState = { dismissed: [], later: [] };

export type Decision = 'marked' | 'dismissed' | 'later';

/** A yes/no that the person may not have answered yet: `null` when they did not. */
function known(value: string | undefined, map: Record<string, boolean>): boolean | null {
  const answer = value === undefined ? undefined : map[value];
  return typeof answer === 'boolean' ? answer : null;
}

/** Rent of the home: the guided question, else the draft's question, else not known. */
function rentsOf(form: RentaForm, draft: Pick<DraftState, 'reading' | 'rents'>): boolean | null {
  const answer = known(form.answers.housing, {
    rent: true,
    both: true,
    no: false,
    mortgage: false,
  });
  if (answer !== null) return answer;
  if (draft.rents) return true;
  return draft.reading ? false : null;
}

/** Everything the form says about the person that tells which deductions could apply. */
export function situationOf(
  form: RentaForm,
  draft: Pick<DraftState, 'reading' | 'rents'>
): DraftSituation {
  const gross = number(form.gross);
  return {
    childAges: form.children.map((c) => number(c.age)),
    ascendants: form.ascendants.length,
    disability: [
      form.disability,
      ...form.children.map((c) => c.disability),
      ...form.ascendants.map((a) => a.disability),
    ].some((level) => level > 0),
    rents: rentsOf(form, draft),
    age: form.age.trim() === '' ? null : number(form.age),
    ownDisability: form.disability,
    childDisability: form.children.some((c) => c.disability > 0),
    ascendantDisability: form.ascendants.some((a) => a.disability > 0),
    ascendantOver75: form.ascendants.some((a) => a.over75),
    spouseDisability:
      form.joint === 'couple'
        ? form.partner.disability > 0
        : form.joint === 'single'
          ? false
          : null,
    mortgage: known(form.answers.housing, { mortgage: true, both: true, no: false, rent: false }),
    landlord: form.rentalOn || form.unrented.length > 0,
    // Pay from a job: more gross than pensions and benefits, and not retired.
    works: gross <= 0 ? null : !form.retired && gross > number(form.nonSalary),
    gross,
    singleParent: known(form.joint, { single: true, couple: false }),
    benefits: known(form.answers.income, {
      benefits: true,
      mixed: true,
      work: false,
      pension: false,
    }),
    ccaaId: form.ccaaId || undefined,
  };
}

export interface Review {
  /** Could apply, not marked yet and allowed by the income: in the order to ask about them. */
  candidates: Deduction[];
  /** Could apply, but the income does not allow them. */
  outOfReach: Deduction[];
}

/** The State's first, then the community's; inside each, the highest saving first. */
export function reviewOrder(
  deductions: Deduction[],
  savings: Record<string, DeductionSaving>
): Deduction[] {
  const block = (d: Deduction) => (d.id.startsWith('estado-') ? 0 : 1);
  const saving = (d: Deduction) => savings[d.id]?.saving ?? 0;
  // The sort is stable: ties keep the order of the data.
  return [...deductions].sort((a, b) => block(a) - block(b) || saving(b) - saving(a));
}

/** The deductions that could apply to the person, and the ones the income leaves out. */
export function reviewOf(
  deductions: Deduction[],
  situation: DraftSituation,
  options: {
    result: RentaResult;
    savings: Record<string, DeductionSaving>;
    choices: Record<string, Choice>;
    /** Already in the draft: nothing to ask. */
    mentioned: string[];
  }
): Review {
  const open = deductions.filter(
    (d) =>
      !options.choices[d.id]?.on && !options.mentioned.includes(d.id) && isRelevant(d, situation)
  );
  const allowed = (d: Deduction) => incomeFactor(d, limitBaseFor(d, options.result)) > 0;
  return {
    candidates: reviewOrder(open.filter(allowed), options.savings),
    outOfReach: open.filter((d) => !allowed(d)),
  };
}

const without = (list: string[], id: string) => list.filter((x) => x !== id);

/** The review after a decision on one deduction (marking it is kept in the form, not here). */
export function decide(review: ReviewState, id: string, decision: Decision): ReviewState {
  const next = { dismissed: without(review.dismissed, id), later: without(review.later, id) };
  if (decision !== 'marked') next[decision].push(id);
  return next;
}

/** What to go through: the ones not decided yet, then the ones left for later. */
export function queueOf(
  candidates: Deduction[],
  review: ReviewState,
  dismissed: string[]
): string[] {
  const open = candidates.map((d) => d.id).filter((id) => !dismissed.includes(id));
  return [
    ...open.filter((id) => !review.later.includes(id)),
    ...open.filter((id) => review.later.includes(id)),
  ];
}

/** A deduction computed on an amount: it is asked for when the person says it applies. */
export const needsAmount = (d: Deduction) => d.kind === 'percent' || d.kind === 'special';
