/**
 * Why the draft and the planner give different results, in the words a person needs: the
 * deductions the draft already applies (its list of the community's deductions) that are not marked
 * in the planner yet. Each one can be added with the amount the draft shows, so the planner gives the
 * same result; only what is left unexplained is a real difference.
 *
 * A deduction lowers the quota by its amount (LIRPF arts. 68 and 77; modelo 100 of 2025,
 * BOE-A-2026-7041, page 22, box 0571 = 0546 − regional deductions), so the planner's result goes
 * down by what each missing deduction gives, while the quota allows it.
 */
import type { Deduction } from './rentaData';
import { mentionedIn } from './rentaDraft';
import type { Choice } from './rentaForm';
import { round2 } from './round';

/** A deduction the draft applies that the planner does not have yet. */
export interface DraftGap {
  /** The line of the draft, as printed. */
  label: string;
  /** What the draft deducts with it. */
  amount: number;
  /** The deduction of the catalogue it is (null: none matches; it is copied from the draft). */
  deduction: Deduction | null;
  /** What to mark in the planner for it to give that amount (null without a deduction). */
  choice: Choice | null;
}

/** The choice that makes a deduction give `amount`: the units, the base or the amount itself. */
export function choiceFor(d: Deduction, amount: number): Choice {
  if (d.kind === 'fixed') {
    // A fixed amount per unit: as many units as the amount holds (perChild ones by the children).
    const units = d.amount && !d.perChild ? Math.max(1, Math.round(amount / d.amount)) : null;
    return { on: true, amount: '', units: units === null ? '' : String(units) };
  }
  if (d.kind === 'percent' && d.percent)
    return { on: true, amount: String(round2((amount * 100) / d.percent)), units: '' };
  return { on: true, amount: String(amount), units: '' };
}

/** The deductions of the draft not marked in the planner, each with what to mark. */
export function draftGaps(
  applied: { label: string; amount: number }[],
  deductions: Deduction[],
  choices: Record<string, Choice>
): DraftGap[] {
  const gaps: DraftGap[] = [];
  for (const line of applied) {
    const id = mentionedIn([line], deductions)[0];
    const deduction = deductions.find((d) => d.id === id) ?? null;
    if (deduction && choices[deduction.id]?.on) continue;
    gaps.push({
      label: line.label,
      amount: line.amount,
      deduction,
      choice: deduction ? choiceFor(deduction, line.amount) : null,
    });
  }
  return gaps;
}

/** How the planner's result stands next to the draft's: the same, explained, or not explained. */
export interface Verdict {
  kind: 'match' | 'explained' | 'unexplained';
  /** Planner minus draft (to pay over zero). */
  diff: number;
  /** What adding the draft's deductions missing here would change (within what the quotas allow). */
  explained: number;
}

/** Within a euro the rest is the rounding of each box. */
const ROUNDING = 1;

/** The marks that add every gap that has a deduction, over the person's own. */
export function withGaps(
  choices: Record<string, Choice>,
  gaps: DraftGap[]
): Record<string, Choice> {
  const added = { ...choices };
  for (const g of gaps) if (g.deduction && g.choice) added[g.deduction.id] = g.choice;
  return added;
}

/**
 * `draft`: the draft's result; `ours`: the planner's; `added`: the planner's with the gaps added
 * (worked out by the engine, so a deduction over the quota counts only for what it can take off).
 */
export function verdictOf(draft: number, ours: number, added: number): Verdict {
  const diff = round2(ours - draft);
  const explained = round2(ours - added);
  if (Math.abs(diff) < 0.005) return { kind: 'match', diff, explained: 0 };
  if (explained !== 0 && Math.abs(added - draft) <= ROUNDING)
    return { kind: 'explained', diff, explained };
  return { kind: 'unexplained', diff, explained };
}
