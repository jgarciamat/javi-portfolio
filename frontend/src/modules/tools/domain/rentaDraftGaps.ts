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
import { deductionAmount } from './rentaCalc';
import type { Deduction } from './rentaData';
import { mentionedIn, normalize, type AppliedDeduction } from './rentaDraft';
import type { Choice } from './rentaForm';
import { round2 } from './round';
import { allYes } from './rentaRequirements';

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

/**
 * The choice that makes a deduction give `amount`: the units, the base or the amount itself. The
 * draft already applies it, so its questions of requirements are taken as answered «yes» (the person
 * sees them and can change them).
 */
export function choiceFor(d: Deduction, amount: number): Choice {
  return { ...valueFor(d, amount), ...confirmed(d) };
}

const confirmed = (d: Deduction): Pick<Choice, 'checks'> => {
  const checks = allYes(d.checks);
  return checks ? { checks } : {};
};

function valueFor(d: Deduction, amount: number): Choice {
  if (d.kind === 'fixed') {
    // A fixed amount per unit: as many units as the amount holds (perChild ones by the children).
    const units = d.amount && !d.perChild ? Math.max(1, Math.round(amount / d.amount)) : null;
    return { on: true, amount: '', units: units === null ? '' : String(units) };
  }
  if (d.kind === 'percent' && d.percent)
    return { on: true, amount: String(round2((amount * 100) / d.percent)), units: '' };
  return { on: true, amount: String(amount), units: '' };
}

/**
 * Lines of the draft that are one box for several deductions of the catalogue: the Valencian health
 * deduction («Por cantidades satisfechas en determinados gastos de salud», box 1959 of 2025, Ley
 * 13/1997 art. 4.1.ñ) adds up dentist, mental health, glasses, chronic and rare diseases, and brain
 * damage or Alzheimer. Without the detail (the PDF), the amount is spread over them in this order,
 * each up to its maximum: the result is the same, and the person can move it to the right one.
 */
const GROUPED: { pattern: RegExp; ids: string[] }[] = [
  {
    pattern: /determinados gastos de salud/,
    ids: [
      'comunitat-valenciana-salud-bucodental',
      'comunitat-valenciana-salud-mental',
      'comunitat-valenciana-salud-optica',
      'comunitat-valenciana-salud-cronicas-raras',
      'comunitat-valenciana-salud-dano-cerebral-alzheimer',
    ],
  },
];

/** One deduction of the catalogue a line of the draft is, with what to mark for it. */
export interface DraftMatch {
  deduction: Deduction;
  /** The part of the line's amount that goes to it. */
  amount: number;
  choice: Choice;
}

/** The base spent, as the planner marks it (its requirements answered, as with `choiceFor`). */
const spent = (d: Deduction, base: number): Choice => ({
  on: true,
  amount: String(base),
  units: '',
  ...confirmed(d),
});

/** The amount of a grouped line spread over its deductions, each up to its maximum. */
function spread(amount: number, list: Deduction[]): DraftMatch[] {
  const parts: DraftMatch[] = [];
  let left = amount;
  list.forEach((d, i) => {
    const part = i === list.length - 1 ? left : Math.min(left, d.limit ?? left);
    if (part <= 0) return;
    parts.push({ deduction: d, amount: round2(part), choice: choiceFor(d, part) });
    left = round2(left - part);
  });
  return parts;
}

/**
 * The deductions of the catalogue a line of the draft is: by its id (the State ones read by box), by
 * what was spent on each (the Agency's file details it), by the words of its title, or spread over
 * the deductions of a grouped line. Empty: none matches (it is copied from the draft).
 */
export function matchApplied(line: AppliedDeduction, deductions: Deduction[]): DraftMatch[] {
  const byId = (id: string) => deductions.find((d) => d.id === id);
  const direct = line.id ? byId(line.id) : undefined;
  if (direct)
    return [{ deduction: direct, amount: line.amount, choice: choiceFor(direct, line.amount) }];
  if (line.bases) {
    const found = Object.entries(line.bases).flatMap(([id, base]) => {
      const d = byId(id);
      return d
        ? [
            {
              deduction: d,
              amount: deductionAmount(d, { on: true, amount: base }),
              choice: spent(d, base),
            },
          ]
        : [];
    });
    // The draft's amount is the one that counts: the bases only say how it is made up.
    const total = round2(found.reduce((s, m) => s + m.amount, 0));
    if (found.length > 0 && Math.abs(total - line.amount) < 0.005) return found;
  }
  const id = mentionedIn([line], deductions)[0];
  const named = id ? byId(id) : undefined;
  if (named)
    return [{ deduction: named, amount: line.amount, choice: choiceFor(named, line.amount) }];
  const label = normalize(line.label);
  const group = GROUPED.find((g) => g.pattern.test(label));
  const list = (group?.ids ?? []).map(byId).filter((d): d is Deduction => d !== undefined);
  return list.length ? spread(line.amount, list) : [];
}

/** The ids of the catalogue the draft already applies (to mark them «already in your draft»). */
export function draftDeductionIds(applied: AppliedDeduction[], deductions: Deduction[]): string[] {
  return [
    ...new Set(
      applied.flatMap((line) => matchApplied(line, deductions).map((m) => m.deduction.id))
    ),
  ];
}

/** The deductions of the draft not marked in the planner, each with what to mark. */
export function draftGaps(
  applied: AppliedDeduction[],
  deductions: Deduction[],
  choices: Record<string, Choice>
): DraftGap[] {
  const gaps: DraftGap[] = [];
  for (const line of applied) {
    const matches = matchApplied(line, deductions);
    if (matches.length === 0) {
      gaps.push({ label: line.label, amount: line.amount, deduction: null, choice: null });
      continue;
    }
    for (const m of matches) {
      if (choices[m.deduction.id]?.on) continue;
      gaps.push({
        label: matches.length > 1 ? `${line.label} (${m.deduction.title})` : line.label,
        amount: m.amount,
        deduction: m.deduction,
        choice: m.choice,
      });
    }
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
