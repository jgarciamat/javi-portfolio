import { parseAmount } from '@modules/finances/domain/importParsers';
import type { Piece } from '@modules/tools/application/readPdf';
import type { BankPdfReader, Entry } from './types';

/** Columns of the «Consulta de movimientos» table, in PDF points from the left edge. */
const DETAIL_FROM = 120;
const AMOUNT_FROM = 380;
const BALANCE_FROM = 460;

const MONTHS: Record<string, number> = {
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  set: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

/** Page footers and repeated headers that carry no movement. */
const DATE_LABEL = /^(\d{1,2})\s+([a-zñ]{3,4})\.?$/i;

const NOISE = /IBERCAJA BANCO|DOMICILIO SOCIAL|^P[áa]gina\s*\d+/i;

const text = (pieces: Piece[]): string =>
  pieces
    .map((p) => p.str.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const inColumn = (row: Piece[], from: number, to: number): Piece[] =>
  row.filter((p) => p.x >= from && p.x < to);

/** The statement's range «De dd/mm/aaaa a dd/mm/aaaa»: the dates have no year, it comes from here. */
function yearsOf(
  rows: Piece[][]
): { startMonth: number; startYear: number; endYear: number } | null {
  for (const row of rows) {
    const m = /De\s+\d{1,2}\/(\d{1,2})\/(\d{4})\s+a\s+\d{1,2}\/\d{1,2}\/(\d{4})/i.exec(text(row));
    if (m) return { startMonth: Number(m[1]), startYear: Number(m[2]), endYear: Number(m[3]) };
  }
  return null;
}

/** «16 oct.» → ISO date; a range that crosses New Year puts the early months in the later year. */
function isoDate(
  label: string,
  years: { startMonth: number; startYear: number; endYear: number }
): string | null {
  const m = DATE_LABEL.exec(label) as RegExpExecArray;
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!month) return null;
  const year = month >= years.startMonth ? years.startYear : years.endYear;
  const date = new Date(Date.UTC(year, month - 1, Number(m[1])));
  if (date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

export const ibercaja: BankPdfReader = {
  bank: 'Ibercaja',
  matches: (rows) => {
    const all = rows.map(text).join('\n');
    return /Consulta de movimientos/i.test(all) && /IBERCAJA|Banca Digital/i.test(all);
  },
  read: (rows) => {
    const years = yearsOf(rows);
    const entries: Entry[] = [];
    const skipped: number[] = [];
    /** The movement being read: its detail lines may continue on the next page. */
    let open: { entry: Entry; concept: string; details: string[] } | null = null;

    const close = () => {
      if (open) {
        open.entry.row.description = [open.concept, ...open.details].join(' - ');
        entries.push(open.entry);
      }
      open = null;
    };

    rows.forEach((row, index) => {
      const date = text(inColumn(row, 0, DETAIL_FROM - 20));
      if (NOISE.test(text(row))) return;
      if (DATE_LABEL.test(date)) {
        close();
        const amount = parseAmount(text(inColumn(row, AMOUNT_FROM, BALANCE_FROM)).replace('€', ''));
        const balance = parseAmount(text(inColumn(row, BALANCE_FROM, Infinity)).replace('€', ''));
        const iso = years ? isoDate(date, years) : null;
        if (!iso || amount === null || amount === 0) {
          skipped.push(index + 1);
          return;
        }
        open = {
          entry: { row: { date: iso, description: '', amount }, balance },
          concept: text(inColumn(row, DETAIL_FROM - 20, AMOUNT_FROM)),
          details: [],
        };
      } else if (!date && open) {
        const detail = text(inColumn(row, DETAIL_FROM - 20, AMOUNT_FROM));
        if (detail) open.details.push(detail);
      }
    });
    close();
    return { entries, skipped };
  },
};
