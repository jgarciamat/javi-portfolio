/**
 * Donations (LIRPF art. 68.3 and Ley 49/2002 arts. 19-20): what was given, not the deduction, is
 * asked; the deduction is worked out with the percentages of the year and held to the limit of the
 * tax base.
 *
 * Sources (checked 19-10-2026):
 * - Ley 49/2002 art. 19.1 (BOE-A-2002-25039, as of 2025): 80 % of the first 250 € of the year, 40 %
 *   of the rest, 45 % when the person gave to the same entity in the two years before, each year as
 *   much or more than the one before. AEAT Manual práctico de Renta 2025, c16 «Porcentajes de
 *   deducción»: "se eleva del 40 al 45 por 100".
 * - Ley 49/2002 art. 22: five points more for the priority activities of patronage (85 / 45 / 50 %);
 *   the Manual's example: 250 × 80 % + 750 × 40 % (an NGO) + 1,000 × 50 % (a priority foundation,
 *   recurrent) = 1,000 €.
 * - LIRPF art. 68.3.b: 10 % of what is given to foundations and associations of public utility
 *   outside Ley 49/2002.
 * - LIRPF art. 69.1 and Manual 2025, c16 «Límite aplicable»: the base of the deduction cannot pass
 *   10 % of the tax base ([0500] + [0510]); for the priority activities it can reach 15 %.
 * - LIRPF arts. 67.1.b and 77.1.b: half lowers the State quota and half the regional one (the
 *   catalogue's `regionalShare`).
 */
import type { DeductionChoice } from './rentaCalc';
import { round2 } from './round';

/** What was given in the year, in euros. */
export interface DonationInput {
  /** To entities of Ley 49/2002 (NGOs, foundations...). */
  general: number;
  /** Of that, to an entity given to the two years before, each year as much or more. */
  recurrent: number;
  /** To priority activities of patronage. */
  priority: number;
  /** Of that, recurrent in the same way. */
  priorityRecurrent: number;
  /** To foundations and associations of public utility outside Ley 49/2002. */
  other: number;
}

/** The deductions of the State's catalogue the donations go to. */
export const DONATION_IDS = {
  general: 'estado-donativos-ley-49-2002',
  priority: 'estado-donativos-actividades-prioritarias',
  other: 'estado-donativos-otras-entidades',
} as const;

const FIRST = 250;
const LIMIT = 0.1;
const PRIORITY_LIMIT = 0.15;

export interface DonationResult {
  /** The deduction of each kind, in euros (`other` is the base: the catalogue takes its 10 %). */
  general: number;
  priority: number;
  otherBase: number;
  /** What the limit of the tax base left out of what was given. */
  overLimit: number;
}

const pos = (n: number) => Math.max(0, Number.isFinite(n) ? n : 0);

/**
 * The deductions for what was given, with `taxBase` the tax base ([0500] + [0510]). The first 250 €
 * of the year go first to what is not recurrent (as in the Manual's example) and to the general
 * donations before the priority ones.
 */
export function donationResult(d: DonationInput, taxBase: number): DonationResult {
  const base = pos(taxBase);
  const given = { general: pos(d.general), priority: pos(d.priority), other: pos(d.other) };
  // Held to 10 % of the tax base, the priority ones up to 15 % in all.
  const room = base * LIMIT;
  const ordinary = Math.min(given.general + given.other, room);
  const general = Math.min(given.general, ordinary);
  const otherBase = Math.min(given.other, ordinary - general);
  const priority = Math.min(given.priority, Math.max(0, base * PRIORITY_LIMIT - ordinary));
  const overLimit = round2(given.general + given.other + given.priority - ordinary - priority);

  let first = FIRST;
  const take = (amount: number) => {
    const part = Math.min(amount, first);
    first -= part;
    return part;
  };
  const kind = (total: number, recurrent: number, extra: number) => {
    const rec = Math.min(pos(recurrent), total);
    const once = total - rec;
    const a = take(once);
    const b = take(rec);
    return (a + b) * (0.8 + extra) + (once - a) * (0.4 + extra) + (rec - b) * (0.45 + extra);
  };
  return {
    general: round2(kind(general, d.recurrent, 0)),
    priority: round2(kind(priority, d.priorityRecurrent, 0.05)),
    otherBase: round2(otherBase),
    overLimit,
  };
}

/** The choices of the catalogue's deductions for the donations (null when nothing was given). */
export function donationChoices(
  d: DonationInput | undefined,
  taxBase: number
): Record<string, DeductionChoice> | null {
  if (!d || pos(d.general) + pos(d.priority) + pos(d.other) <= 0) return null;
  const r = donationResult(d, taxBase);
  return {
    [DONATION_IDS.general]: { on: r.general > 0, amount: r.general },
    [DONATION_IDS.priority]: { on: r.priority > 0, amount: r.priority },
    [DONATION_IDS.other]: { on: r.otherBase > 0, amount: r.otherBase },
  };
}
