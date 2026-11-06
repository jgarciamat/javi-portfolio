/**
 * Rules that learn from «Para revisar»: the person puts the same shop in the same category twice in
 * a row, and at least the first time it was not the category we suggested. Then that shop gets a
 * rule («Mercadona → Alimentación»), so the next ones already come right.
 */

/** The category we suggested for a payment and where it came from (the server's import order). */
export interface Suggestion {
  category: string;
  source?: 'rule' | 'file' | 'history' | 'keywords' | 'ai' | 'fallback';
}

/** The category a shop was last put in by hand (the first of the two times in a row). */
export interface Streak {
  category: string;
}

const NOISE = new Set([
  ...['compra', 'pago', 'tarj', 'tarjeta', 'recibo', 'adeudo', 'bizum', 'com'],
  ...['con', 'en', 'de', 'del', 'la', 'el', 'a', 'al', 'at', 'to', 'from'],
]);

/** The shop of a description, to tell the same one: «Compra MERCADONA 0231» → «mercadona». */
export function merchantKey(description: string): string {
  return description
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/\d/.test(w) && !NOISE.has(w))
    .slice(0, 3)
    .join(' ');
}

/**
 * The streak after confirming a payment of a shop in `chosen`, and whether it is time to create
 * the rule. A rule that already gives that category needs nothing; another category starts again.
 */
export function nextStreak(
  previous: Streak | undefined,
  chosen: string,
  suggested: Suggestion | undefined
): { streak: Streak | null; learn: boolean } {
  if (suggested?.source === 'rule' && suggested.category === chosen) {
    return { streak: null, learn: false };
  }
  if (previous?.category === chosen) return { streak: null, learn: true };
  if (suggested?.category !== chosen) return { streak: { category: chosen }, learn: false };
  return { streak: null, learn: false };
}
