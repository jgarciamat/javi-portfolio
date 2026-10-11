import { CategoryRule } from '@domain/ports/repositories';
import { normalizeText } from '@domain/shared/text';

/** Letters, digits and single spaces: what card terminals and banks leave of a merchant name. */
export function cleanPattern(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9&.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The merchant of a bank description: the first words without numbers or card noise
 * ("COMPRA TARJ. MERCADONA 0231 MADRID" → "mercadona madrid").
 */
const NOISE = new Set(['compra', 'pago', 'tarj.', 'tarjeta', 'recibo', 'adeudo', 'bizum', 'com']);

export function suggestPattern(description: string): string {
  const words = cleanPattern(description)
    .split(' ')
    .filter((w) => w && !/\d/.test(w) && !NOISE.has(w));
  return words.slice(0, 3).join(' ');
}

/** Rule whose pattern appears in the description; the longest (most specific) one wins. */
export function matchRule(rules: CategoryRule[], description: string): CategoryRule | null {
  const text = cleanPattern(description);
  let best: CategoryRule | null = null;
  for (const rule of rules) {
    if (!text.includes(rule.pattern)) continue;
    if (!best || rule.pattern.length > best.pattern.length) best = rule;
  }
  return best;
}
