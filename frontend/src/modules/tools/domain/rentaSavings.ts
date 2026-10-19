import { computeRenta, type DeductionChoice, type RentaInput, type RentaResult } from './rentaCalc';
import type { Deduction } from './rentaData';
import { round2 } from './round';
import { DONATION_IDS, type DonationInput } from './rentaDonations';

/** What each donation deduction is made of: taken out to know what it saves. */
const DONATION_KINDS: Record<string, Partial<DonationInput>> = {
  [DONATION_IDS.general]: { general: 0, recurrent: 0 },
  [DONATION_IDS.priority]: { priority: 0, priorityRecurrent: 0 },
  [DONATION_IDS.other]: { other: 0 },
};

/** Amounts used when the person has not typed one, always shown as an example. */
export const EXAMPLE_SPENT = 1000;
export const EXAMPLE_SPECIAL = 100;

export interface DeductionSaving {
  /** How much lower the result is with the deduction than without it (0 when it gives nothing). */
  saving: number;
  /** The income limit does not allow it. */
  blocked: boolean;
  /** The amount the saving was worked out with when none was typed; null when it is the person's. */
  example: number | null;
}

/** The example for a deduction that depends on an amount: what was spent, or the deduction itself. */
export function exampleAmount(d: Deduction): number {
  if (d.kind === 'percent') return Math.min(EXAMPLE_SPENT, d.baseLimit ?? EXAMPLE_SPENT);
  return d.amount ?? d.limit ?? EXAMPLE_SPECIAL;
}

const withChoice = (input: RentaInput, id: string, choice: DeductionChoice): RentaInput => ({
  ...input,
  choices: { ...input.choices, [id]: choice },
});

/**
 * What each deduction saves with the rest of the data as it is: the result with it applied and
 * without it. The difference already counts the limits (no tax left, income limit, low pay).
 */
export function deductionSavings(
  input: RentaInput,
  deductions: Deduction[],
  current: RentaResult
): Record<string, DeductionSaving> {
  const savings: Record<string, DeductionSaving> = {};
  for (const d of deductions) {
    // The donations typed as what was given: their saving is the result without that kind.
    const kind = DONATION_KINDS[d.id];
    if (input.donations && kind) {
      const without = computeRenta({ ...input, donations: { ...input.donations, ...kind } });
      savings[d.id] = {
        saving: round2(Math.max(0, without.result - current.result)),
        blocked: false,
        example: null,
      };
      continue;
    }
    const chosen = input.choices[d.id];
    const typed = (chosen?.amount ?? 0) > 0;
    const example = d.kind !== 'fixed' && !typed ? exampleAmount(d) : null;
    const applied =
      chosen?.on && example === null
        ? current
        : computeRenta(
            withChoice(input, d.id, {
              on: true,
              amount: example ?? chosen?.amount,
              // As in the form: one per child by default, and at least one.
              units: chosen?.units ?? Math.max(1, input.family.children.length),
            })
          );
    const without = chosen?.on ? computeRenta(withChoice(input, d.id, { on: false })) : current;
    savings[d.id] = {
      saving: round2(Math.max(0, without.result - applied.result)),
      blocked: applied.blocked.includes(d.id),
      example,
    };
  }
  return savings;
}

/** What all the marked deductions save together (less than the sum when the tax runs out). */
export function markedSaving(input: RentaInput, current: RentaResult): number {
  const none = Object.fromEntries(Object.keys(input.choices).map((id) => [id, { on: false }]));
  const without = computeRenta({ ...input, choices: none, donations: undefined });
  return round2(Math.max(0, without.result - current.result));
}
