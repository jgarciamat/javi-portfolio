/**
 * Rounds to the cent, half away from zero, as the AEAT does in the return ("redondeo al céntimo":
 * 4,757.355 gives 4,757.36). `Math.round(n * 100) / 100` fails there because 4,757.355 is stored as
 * 4,757.35499999…: the number is first taken to 15 significant digits (what a double holds for sure),
 * which removes that noise, and then rounded in decimal.
 */
export function round2(n: number): number {
  const abs = Math.abs(n);
  // Not a number, or too big to have cents: nothing to round.
  if (!Number.isFinite(n) || abs >= 1e15) return n;
  // Far below half a cent (toPrecision would write it with an exponent).
  if (abs < 1e-6) return 0;
  const cents = Math.round(Number(`${abs.toPrecision(15)}e2`));
  const value = Number(`${cents}e-2`);
  return n < 0 && value !== 0 ? -value : value;
}
