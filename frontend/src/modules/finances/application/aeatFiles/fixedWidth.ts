/**
 * Fixed-width fields of the AEAT record designs (diseños de registro), shared by the writer and the
 * reader so that both follow the same rules. The rules are printed in the notes of every design
 * (e.g. DR303e26v101.xlsx, sheet DP30301, «Nota 2»; DR_Anexo_349.pdf, page 1), checked 19-10-2026:
 * - An/A: letters, digits and blanks only, left aligned and filled with blanks on the right;
 *   capitals without accents; «Ñ» and «Ç» are written in ISO-8859-1 (0xD1 and 0xC7).
 * - Num: digits only, right aligned and filled with zeros on the left.
 * - N: like Num, but a negative number carries an «N» in the first position.
 * - Money: «15 enteros y 2 decimales», i.e. cents without a decimal point.
 */
import type { FieldType } from './designs';

/** A value that does not fit its field, or a negative one in an unsigned field. */
export class FieldError extends Error {
  /** The box of the field, when it is one (set by the writer). */
  box: string | null = null;

  constructor(readonly code: 'overflow' | 'negative', readonly pos: number) {
    super(`${code} at ${pos}`);
  }
}

/**
 * A text as the designs take it: capitals, no accents (but «Ñ» and «Ç»), no signs; every other
 * character becomes a blank and repeated blanks are joined.
 */
export function cleanText(value: string): string {
  return Array.from(value.toUpperCase(), (ch) =>
    ch === 'Ñ' || ch === 'Ç' ? ch : ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )
    .join('')
    .replace(/[^A-Z0-9ÑÇ ]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

/** Euros to whole cents (the figures of the app carry two decimals at most). */
export const toCents = (euros: number): number => Math.round(euros * 100);

/** A number (already in its unit: cents, hundredths of a percent, people) in a field. */
export function numberField(value: number, len: number, type: FieldType, pos: number): string {
  const n = Math.round(value);
  if (n < 0 && type !== 'N') throw new FieldError('negative', pos);
  const digits = String(Math.abs(n));
  const width = n < 0 ? len - 1 : len;
  if (digits.length > width) throw new FieldError('overflow', pos);
  return (n < 0 ? 'N' : '') + digits.padStart(width, '0');
}

/** A text in a field: cleaned, left aligned, blanks on the right; cut when it is longer. */
export const textField = (value: string, len: number): string =>
  cleanText(value).slice(0, len).padEnd(len, ' ');

/** A line of a fixed length, written field by field (positions from 1, as in the designs). */
export class Line {
  private chars: string[];

  constructor(length: number) {
    this.chars = Array.from({ length }, () => ' ');
  }

  /** Writes a value that is already as long as its field. */
  put(pos: number, value: string): this {
    for (let i = 0; i < value.length; i++) this.chars[pos - 1 + i] = value[i];
    return this;
  }

  text(pos: number, len: number, value: string): this {
    return this.put(pos, textField(value, len));
  }

  number(pos: number, len: number, value: number, type: FieldType = 'Num'): this {
    return this.put(pos, numberField(value, len, type, pos));
  }

  toString(): string {
    return this.chars.join('');
  }
}

/** The text of a field, without the blanks on the right. */
export const readText = (line: string, pos: number, len: number): string =>
  line.slice(pos - 1, pos - 1 + len).trimEnd();

/** The number of a field («N» first: negative); null when it is not a number. */
export function readNumber(line: string, pos: number, len: number): number | null {
  const raw = line.slice(pos - 1, pos - 1 + len);
  const m = /^(N?)(\d+)$/.exec(raw);
  if (!m || raw.length !== len) return null;
  const n = Number(m[2]);
  return m[1] ? -n : n;
}

/** ISO-8859-1 bytes of a text that only holds characters of that set (what `cleanText` leaves). */
export function latin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/** The text of ISO-8859-1 bytes. */
export const fromLatin1 = (bytes: Uint8Array): string => String.fromCharCode(...bytes);
