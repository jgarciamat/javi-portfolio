/**
 * The reductions of the general base for a person with a disability: the pension plans made for
 * them (LIRPF art. 53) and the contributions to their protected patrimony (art. 54). BOE-A-2006-20764,
 * consolidated text, and AEAT Manual práctico de Renta 2025, c13, «Reducciones por aportaciones y
 * contribuciones a sistemas de previsión social constituidos a favor de personas con discapacidad»
 * and «Reducciones por aportaciones a patrimonios protegidos», with its caso práctico (checked
 * 22-10-2026). They go after the pension plans and before the compensatory pension, the Manual's
 * order of the reductions.
 */
import { round2 } from './round';

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** The yearly limits (the same since 2008 in the law: 10,000 € and 24,250 €). */
export interface DisabilityLimits {
  /** Art. 53.1.a and 54.1: what each relative can reduce. */
  perContributor: number;
  /** Art. 53.1.b and 54.1: the person's own plan, and everything given to one person or patrimony. */
  joint: number;
  /** Art. 53.1.c: years in which a plan's contribution that the base left out can be reduced. */
  planYears: number;
  /** Art. 54.2: years in which an excess of the patrimony can be reduced. */
  patrimonyYears: number;
}

export const DISABILITY_LIMITS: DisabilityLimits = {
  perContributor: 10000,
  joint: 24250,
  planYears: 5,
  patrimonyYears: 4,
};

/** What was not reduced of one year before, still to use. */
export interface YearAmount {
  year: number;
  amount: number;
}

/** What the person puts in for someone with a disability, or for themselves (in euros). */
export interface DisabilitySupport {
  /**
   * The person has the disability: contributions to their own plan (art. 53.1.b), up to 24,250 €
   * together with their other plans (the Manual: «el límite máximo conjunto» is the higher one).
   */
  ownPlan?: number;
  /**
   * To the plan of a relative with a disability (art. 53.1.a): `mine`, what that person put in their
   * own plan (`theirs`, it goes first) and what the other relatives put in (`others`, each up to
   * 10,000 €); the relatives share what is left of the 24,250 € in proportion.
   */
  relativePlan?: { mine: number; theirs: number; others: number };
  /**
   * To the protected patrimony of a relative (art. 54): `mine`, what the others put in this year
   * (`others`, each up to 10,000 €) and the excess of the four years before (`pending`).
   */
  patrimony?: { mine: number; others: number; pending: YearAmount[] };
}

export interface DisabilityResult {
  /** Box 0494: the plans (own and for a relative). */
  plans: number;
  ownPlan: number;
  relativePlan: number;
  /** Box 0495: the protected patrimony. */
  patrimony: number;
  total: number;
  /** What the base left out of this year's plans, for the next five years (art. 53.1.c). */
  plansNext: number;
  /** The excess of the patrimony left, by year, with the last return it can be used in. */
  patrimonyLeft: (YearAmount & { lastYear: number })[];
  /** The excess of the patrimony whose last year this was: it is lost. */
  patrimonyLost: number;
}

/**
 * A relative's share of the 24,250 € once the person's own contributions are taken: «de forma
 * proporcional» among the relatives (art. 53.1.b), each one up to 10,000 € (art. 53.1.a).
 */
export function relativePlanShare(
  plan: NonNullable<DisabilitySupport['relativePlan']>,
  l: DisabilityLimits = DISABILITY_LIMITS
): number {
  const mine = Math.min(positive(plan.mine), l.perContributor);
  const room = Math.max(0, l.joint - positive(plan.theirs));
  const all = mine + positive(plan.others);
  return round2(all > room ? (room * mine) / all : mine);
}

/**
 * The part of the patrimony's 24,250 € of one contributor: each one up to 10,000 € (the excess of
 * the years before inside it, «sujeta a los mismos límites máximos»), and «minoradas de forma
 * proporcional» when all of them pass the 24,250 € (art. 54.1; caso práctico of the Manual 2025, c13:
 * 24,250 / 26,250 × 6,250 = 5,773.81).
 */
export function patrimonyShare(
  claim: number,
  others: number,
  l: DisabilityLimits = DISABILITY_LIMITS
): number {
  const own = Math.min(positive(claim), l.perContributor);
  const all = own + positive(others);
  return round2(all > l.joint ? (l.joint * own) / all : own);
}

/**
 * The patrimony: the excess of the years before first, the oldest first (art. 54.2: «se practicarán
 * en primer lugar las reducciones procedentes de los ejercicios anteriores»), then this year's; what
 * is not reduced, by the limits or by the base, carries four years.
 */
function patrimonyOf(
  p: NonNullable<DisabilitySupport['patrimony']>,
  room: number,
  year: number,
  l: DisabilityLimits
) {
  const pending = p.pending
    .filter((x) => x.year < year && x.year >= year - l.patrimonyYears && positive(x.amount) > 0)
    .sort((a, b) => a.year - b.year);
  const queue = [...pending, { year, amount: positive(p.mine) }];
  const claim = queue.reduce((s, x) => s + positive(x.amount), 0);
  let left = Math.min(patrimonyShare(claim, p.others, l), Math.max(0, room));
  const after = queue.map((x) => {
    const used = Math.min(positive(x.amount), left);
    left -= used;
    return {
      year: x.year,
      amount: round2(positive(x.amount) - used),
      lastYear: x.year + l.patrimonyYears,
    };
  });
  const reduced = round2(claim - after.reduce((s, x) => s + x.amount, 0));
  return {
    reduced,
    left: after.filter((x) => x.lastYear !== year && x.amount > 0),
    lost: round2(after.filter((x) => x.lastYear === year).reduce((s, x) => s + x.amount, 0)),
  };
}

/**
 * The reductions of arts. 53 and 54 of one person, held to the base left (`room`). `plansUsed`: what
 * the person's other plans reduced, which shares the 24,250 € of their own plan. `disabled`: the
 * person has a disability that gives the plan of art. 53 (33 % or more; the law asks 65 % if it is
 * physical or sensory, which the person says by typing it).
 */
export function disabilityReductions(
  support: DisabilitySupport | undefined,
  ctx: { room: number; plansUsed: number; disabled: boolean; year: number },
  l: DisabilityLimits = DISABILITY_LIMITS
): DisabilityResult | null {
  if (!support) return null;
  let room = Math.max(0, ctx.room);
  const take = (amount: number) => {
    const used = Math.min(amount, room);
    room -= used;
    return round2(used);
  };
  const ownMax = ctx.disabled
    ? Math.min(positive(support.ownPlan ?? 0), Math.max(0, l.joint - ctx.plansUsed))
    : 0;
  const relativeMax = support.relativePlan ? relativePlanShare(support.relativePlan, l) : 0;
  const ownPlan = take(ownMax);
  const relativePlan = take(relativeMax);
  const patrimony = support.patrimony
    ? patrimonyOf(support.patrimony, room, ctx.year, l)
    : { reduced: 0, left: [], lost: 0 };
  const plans = round2(ownPlan + relativePlan);
  return {
    plans,
    ownPlan,
    relativePlan,
    patrimony: patrimony.reduced,
    total: round2(plans + patrimony.reduced),
    // Only what the base left out carries, not what passes the limits (art. 53.1.c).
    plansNext: round2(ownMax + relativeMax - plans),
    patrimonyLeft: patrimony.left,
    patrimonyLost: patrimony.lost,
  };
}
