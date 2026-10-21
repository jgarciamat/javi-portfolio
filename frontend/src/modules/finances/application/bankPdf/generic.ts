import { parseAmount, parseDate } from '@modules/finances/domain/importParsers';
import type { Piece } from '@modules/tools/application/readPdf';
import type { Entry } from './types';

const DATE_START = /^(\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2}))\b\s*(.*)$/;
/** An amount as Spanish statements print it: 1.234,56 · -4,00 · 4,00- · optionally followed by €. */
const AMOUNT =
  /[-+]?\d{1,3}(?:\.\d{3})*,\d{2}-?(?:\s?(?:€|EUR))?|[-+]?\d+,\d{2}-?(?:\s?(?:€|EUR))?/g;
const NOISE = /^P[áa]gina\s*\d+|^page\s*\d+/i;
const HEADER = /\b(fecha|concepto|importe|saldo|descripci[oó]n)\b.*\b(importe|saldo)\b/i;

const lineText = (row: Piece[]): string =>
  row
    .map((p) => p.str.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Any statement printed as a table: a date (dd/mm/aaaa or dd-mm-aaaa) at the start of the
 * line, the concept, then the amount and, usually, the balance. Lines without a date
 * continue the concept of the movement above.
 */
export function readGenericTable(rows: Piece[][]): { entries: Entry[]; skipped: number[] } {
  const entries: Entry[] = [];
  const skipped: number[] = [];
  let last: Entry | null = null;
  rows.forEach((row, index) => {
    const line = lineText(row);
    if (!line || NOISE.test(line) || HEADER.test(line)) return;
    const m = DATE_START.exec(line);
    if (!m) {
      if (last && !/\d,\d{2}/.test(line)) {
        last.row.description = `${last.row.description} - ${line}`;
      }
      return;
    }
    const date = parseDate(m[1]);
    const amounts = m[2].match(AMOUNT) ?? [];
    const first = m[2].search(AMOUNT);
    if (!date || amounts.length === 0) {
      last = null;
      skipped.push(index + 1);
      return;
    }
    // With two amounts the last is the balance; a lone one is the movement.
    const amount = parseAmount(
      amounts[amounts.length > 1 ? amounts.length - 2 : 0].replace(/€|EUR/, '')
    );
    const balance =
      amounts.length > 1 ? parseAmount(amounts[amounts.length - 1].replace(/€|EUR/, '')) : null;
    const description = m[2].slice(0, first).trim();
    if (amount === null || amount === 0 || !description) {
      last = null;
      skipped.push(index + 1);
      return;
    }
    last = { row: { date, description, amount }, balance };
    entries.push(last);
  });
  return { entries, skipped };
}
