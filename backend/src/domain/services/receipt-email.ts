import { normalizeText } from '@domain/shared/text';

export interface ReceiptEmail {
  from: string;
  subject: string;
  text: string;
  /** When the message was sent (ISO), used when the text has no date. */
  date?: string | null;
}

export interface ParsedReceipt {
  description: string;
  amountCents: number;
  /** YYYY-MM-DD. */
  date: string | null;
}

/** "1.234,56", "1,234.56", "23,40", "23.40" → cents. */
export function parseAmountCents(raw: string): number | null {
  const text = raw.replace(/[^\d.,]/g, '');
  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  const decimalAt = Math.max(lastDot, lastComma);
  let normalized: string;
  if (decimalAt !== -1 && text.length - decimalAt - 1 === 2) {
    normalized = `${text.slice(0, decimalAt).replace(/[.,]/g, '')}.${text.slice(decimalAt + 1)}`;
  } else {
    normalized = text.replace(/[.,]/g, '');
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return cents > 0 && cents <= 100_000_000 ? cents : null;
}

const AMOUNT = '(\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2}|\\d+[.,]\\d{2}|\\d+)';
const CURRENCY = '(?:€|eur\\b|euros?\\b)';
const TOTAL_LABEL =
  '(?:total(?:\\s+a\\s+pagar|\\s+pagado|\\s+factura|\\s+del\\s+pedido|\\s+con\\s+iva)?|importe(?:\\s+total)?|importe\\s+cobrado|pagado|amount(?:\\s+paid)?|total\\s+paid|grand\\s+total)';

/** The amount next to a total label, or else the largest amount written with a currency sign. */
function findAmount(text: string): number | null {
  const labelled = new RegExp(`${TOTAL_LABEL}[^\\d\\n]{0,30}${AMOUNT}\\s*${CURRENCY}?`, 'gi');
  const found: number[] = [];
  for (const m of text.matchAll(labelled)) {
    const cents = parseAmountCents(m[1]);
    if (cents !== null) found.push(cents);
  }
  if (found.length > 0) return found[found.length - 1];

  const withCurrency = [
    ...text.matchAll(new RegExp(`${AMOUNT}\\s*${CURRENCY}`, 'gi')),
    ...text.matchAll(new RegExp(`${CURRENCY}\\s*${AMOUNT}`, 'gi')),
  ]
    .map((m) => parseAmountCents(m[1]))
    .filter((c): c is number => c !== null);
  return withCurrency.length > 0 ? Math.max(...withCurrency) : null;
}

const SUBJECT_NOISE =
  /^(?:(?:fwd?|rv|re|reenviado)\s*:\s*)+|\b(?:tu|su|your)\s+|\b(?:recibo|factura|ticket|pedido|compra|confirmaci[oó]n|resumen|receipt|invoice|order|payment|pago)\b(?:\s+(?:de|del|from|for|en))?/gi;

function merchantFrom(subject: string, from: string): string {
  const cleaned = subject
    .replace(SUBJECT_NOISE, ' ')
    .replace(/[#:|]\s*[\w-]*\d[\w-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, '');
  if (cleaned.length >= 2) return cleaned.slice(0, 80);
  const name = from
    .replace(/<[^>]*>/g, '')
    .replace(/["']/g, '')
    .trim();
  if (name && !name.includes('@')) return name.slice(0, 80);
  const domain = /@([\w-]+)\./.exec(from)?.[1];
  return (domain ?? 'Factura').slice(0, 80);
}

const DATE_ISO = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
const DATE_ES = /\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/;

function findDate(text: string): string | null {
  const iso = DATE_ISO.exec(text);
  if (iso && validDate(+iso[1], +iso[2], +iso[3])) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const es = DATE_ES.exec(text);
  if (es && validDate(+es[3], +es[2], +es[1])) {
    return `${es[3]}-${es[2].padStart(2, '0')}-${es[1].padStart(2, '0')}`;
  }
  return null;
}

function validDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Reads an expense out of a forwarded receipt or invoice: the total, a merchant name from
 * the subject (or the sender) and the date if the text has one. Returns null when no amount
 * can be found, so that nothing wrong is ever recorded.
 */
export function parseReceiptEmail(email: ReceiptEmail): ParsedReceipt | null {
  const text = `${email.subject}\n${email.text}`;
  const amountCents = findAmount(text);
  if (amountCents === null) return null;
  const fallbackDate =
    email.date && /^\d{4}-\d{2}-\d{2}/.test(email.date) ? email.date.slice(0, 10) : null;
  return {
    description: merchantFrom(email.subject, email.from),
    amountCents,
    date: findDate(email.text) ?? fallbackDate,
  };
}

/** The token of the first recipient that has one ("Money <mm-abc123@dominio.es>, otro@x.com"). */
export function inboxTokenOf(recipients: string): string | null {
  for (const recipient of recipients.split(/[,;]/)) {
    const address = /<([^>]+)>/.exec(recipient)?.[1] ?? recipient;
    const local = normalizeText(address.split('@')[0] ?? '').replace(/\s/g, '');
    if (/^mm-[a-z0-9]{12,40}$/.test(local)) return local;
  }
  return null;
}
