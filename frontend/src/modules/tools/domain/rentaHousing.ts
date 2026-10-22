/**
 * The check of the wealth of the main home of the transitional regime (LIRPF DT 18.ª, with art. 70
 * as worded on 31-12-2012). AEAT Manual práctico de Renta 2025, c16, «Comprobación de la situación
 * patrimonial» and its example (checked 22-10-2026): the wealth at the end, valued at the
 * acquisition values and without the changes of value of what is still owned, must exceed the one
 * at the start by what was invested, «sin computar los intereses»; when it does not, the base is
 * the increase plus the interest and other financing costs paid.
 */
import { round2 } from './round';

/** The person's wealth at acquisition value, less the debts, at the start and end of the year. */
export interface WealthCheck {
  start: number;
  end: number;
  /** The interest and other financing costs inside what was paid for the home. */
  interest: number;
}

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** The increase of the wealth and the base of the deduction for `paid` (interest included). */
export function housingBaseOf(paid: number, w: WealthCheck): { increase: number; base: number } {
  const spent = positive(paid);
  const interest = Math.min(positive(w.interest), spent);
  const increase = round2(w.end - w.start);
  return {
    increase,
    base: round2(Math.min(spent - interest, Math.max(0, increase)) + interest),
  };
}
