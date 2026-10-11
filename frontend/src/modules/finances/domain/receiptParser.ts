import { parseAmount, parseDate } from './importParsers';

export interface ScannedReceipt {
  /** The shop, from the first lines of the ticket. */
  merchant: string | null;
  /** YYYY-MM-DD. */
  date: string | null;
  /** The amount paid. */
  total: number | null;
}

/** Amounts written like 12,34 / 1.234,56 / 12.34 (two decimals). */
const AMOUNT = /\d{1,3}(?:[.\s]\d{3})*[,.]\d{2}(?!\d)|\d+[,.]\d{2}(?!\d)/g;
const DATE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/;
const TOTAL_WORDS = /\b(total|a pagar|importe|suma)\b/i;
const NOT_THE_TOTAL = /\b(subtotal|sub-total|iva|base|cambio|entregado|descuento|ahorro)\b/i;

const amountsIn = (line: string): number[] =>
  (line.match(AMOUNT) ?? [])
    .map((a) => parseAmount(a.replace(/\s/g, '')))
    .filter((n): n is number => n !== null && n > 0);

/** The shop name: the first line with some letters that is not an address, a date or an amount. */
function merchantOf(lines: string[]): string | null {
  const line = lines
    .slice(0, 6)
    .find(
      (l) =>
        /[a-záéíóúñ]{3,}/i.test(l) &&
        !DATE.test(l) &&
        amountsIn(l).length === 0 &&
        !/^(c\/|calle|avda|avenida|plaza|tel|cif|nif)/i.test(l)
    );
  if (!line) return null;
  const name = line
    .replace(/\b(s\.?\s?[al]\.?u?\.?|s\.?l\.?)$/i, '')
    .replace(/[^\p{L}\p{N}&'.\- ]/gu, '')
    .trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : null;
}

/**
 * What a ticket says, read from its text: the shop, the date and the total. The total is the
 * biggest amount on a "total" line; without one, the biggest amount on the ticket.
 */
export function parseReceipt(text: string): ScannedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const totals = lines
    .filter((l) => TOTAL_WORDS.test(l) && !NOT_THE_TOTAL.test(l))
    .flatMap(amountsIn);
  const all = lines.flatMap(amountsIn);
  const total = totals.length > 0 ? Math.max(...totals) : all.length > 0 ? Math.max(...all) : null;
  const dateText = lines.map((l) => DATE.exec(l)?.[0]).find(Boolean);
  return {
    merchant: merchantOf(lines),
    date: dateText ? parseDate(dateText) : null,
    total,
  };
}
