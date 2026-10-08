/** Parses what people type in amount fields: "12,5", "12.5", " 12 ". Empty → NaN. */
export function parseDecimal(value: string): number {
  const text = value.trim().replace(',', '.');
  return text === '' ? NaN : Number(text);
}

/** True for finite numbers greater than zero. */
export function isPositiveAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
