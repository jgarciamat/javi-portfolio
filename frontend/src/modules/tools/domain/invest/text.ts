import { dateFromSerial } from '@modules/finances/domain/excelDates';

/** A cell as the spreadsheet reader gives it: text, a number, or nothing. */
export type Cell = string | number | null;

/** Lower case, without accents and with single spaces: how headers and types are compared. */
export const norm = (value: Cell): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** en: 1,234.56; es: 1.234,56. Only decides when the text alone cannot (one separator). */
export type NumberLocale = 'en' | 'es';

/** The decimal separator of a number written with `.` and/or `,` (null: none, all thousands). */
function decimalOf(text: string, locale: NumberLocale): string | null {
  const dot = text.lastIndexOf('.');
  const comma = text.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) return dot > comma ? '.' : ',';
  const sep = dot >= 0 ? '.' : comma >= 0 ? ',' : null;
  if (sep === null) return null;
  // "1,234" in an English file and "1.234" in a Spanish one are thousands.
  const thousands = new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(text);
  const isThousands = thousands && (sep === ',' ? locale === 'en' : locale === 'es');
  return isThousands ? null : sep;
}

/** A plain number written in either style; NaN when it is not one. */
export function toNumber(text: string, locale: NumberLocale): number {
  const clean = text.replace(/['\u00a0\u202f ]/g, '');
  // Excel writes big numbers in scientific notation: 5.19399e17.
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(clean)) return Number(clean);
  if (!/^\d[\d.,]*$/.test(clean)) return Number.NaN;
  const decimal = decimalOf(clean, locale);
  if (decimal === null) return Number(clean.replace(/[.,]/g, ''));
  const thousands = decimal === '.' ? ',' : '.';
  const plain = clean.split(thousands).join('');
  return Number(decimal === ',' ? plain.replace(',', '.') : plain);
}

const SYMBOLS: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP', '₮': 'USDT' };

/** An amount with its currency, as files write them: "€1,234.56", "-15000USDT", "USD 12.30". */
export interface Money {
  value: number;
  currency: string | null;
}

const MONEY = /^([A-Za-z€$£₮]*)\s*(\d[\d.,'\u00a0\u202f]*?)\s*([A-Za-z€$£₮][A-Za-z0-9]*)?$/;

/** The amount of a cell (negative when it says so) and the currency written next to it. */
export function parseMoney(cell: Cell, locale: NumberLocale): Money {
  if (typeof cell === 'number') return { value: cell, currency: null };
  let text = String(cell ?? '').trim();
  let sign = 1;
  if (/^\(.*\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1).trim();
  }
  if (/^[-−+]/.test(text)) {
    sign = text[0] === '+' ? 1 : -1;
    text = text.slice(1).trim();
  }
  // "-€12" and "€-12" are both negative.
  text = text.replace(/^([A-Za-z€$£₮]+)\s*[-−]/, (_, c: string) => {
    sign = -1;
    return c;
  });
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(text)) return { value: sign * Number(text), currency: null };
  const m = MONEY.exec(text);
  if (!m) return { value: Number.NaN, currency: null };
  const code = (m[1] || m[3] || '').toUpperCase();
  return {
    value: sign * toNumber(m[2], locale),
    currency: code ? (SYMBOLS[code] ?? code) : null,
  };
}

/** The number of a cell, without its currency; 0 when it is empty or not a number. */
export function amountOf(cell: Cell, locale: NumberLocale): number {
  const { value } = parseMoney(cell, locale);
  return Number.isFinite(value) ? value : 0;
}

/** dmy: 14/03/2025 (Europe); mdy: 03/14/2025 (United States). */
export type DateOrder = 'dmy' | 'mdy';

export interface When {
  date: string;
  /** Sortable moment: YYYY-MM-DDTHH:MM:SS. */
  at: string;
}

const pad = (n: number | string) => String(n).padStart(2, '0');

function when(y: number, m: number, d: number, time: string): When | null {
  const day = new Date(Date.UTC(y, m - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d)
    return null;
  const date = `${y}-${pad(m)}-${pad(d)}`;
  return { date, at: `${date}T${time || '00:00:00'}` };
}

/** "10:22" or "10:22:05" with an optional AM/PM, as HH:MM:SS. */
function timeOf(h?: string, min?: string, s?: string, half?: string): string {
  if (h === undefined) return '';
  let hour = Number(h) % 24;
  const pm = half?.toLowerCase() === 'pm';
  if (half) hour = (hour % 12) + (pm ? 12 : 0);
  return `${pad(hour)}:${min}:${s ?? '00'}`;
}

const ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const LOCAL =
  /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i;

function fromEpoch(ms: number): When {
  const iso = new Date(ms).toISOString();
  return { date: iso.slice(0, 10), at: iso.slice(0, 19) };
}

/**
 * The day of a cell: ISO (with or without time), D/M/Y or M/D/Y, Unix seconds or milliseconds, or an
 * Excel serial. Times are kept as written (most platforms use UTC; the day is not moved).
 */
export function parseWhen(cell: Cell, order: DateOrder = 'dmy'): When | null {
  if (typeof cell === 'number') {
    if (cell >= 19000101 && cell <= 21001231) return parseWhen(String(cell));
    if (cell > 1e11) return fromEpoch(cell);
    if (cell > 1e8) return fromEpoch(cell * 1000);
    return cell >= 20000 && cell <= 80000 ? parseWhen(dateFromSerial(cell)) : null;
  }
  const text = String(cell ?? '').trim();
  if (/^\d{9,13}$/.test(text)) return parseWhen(Number(text), order);
  // Interactive Brokers' Flex: 20250105 or 20250105;103000.
  const compact = /^(\d{4})(\d{2})(\d{2})(?:[;, ]+(\d{2}):?(\d{2}):?(\d{2}))?$/.exec(text);
  if (compact)
    return when(+compact[1], +compact[2], +compact[3], timeOf(compact[4], compact[5], compact[6]));
  const iso = ISO.exec(text);
  if (iso) return when(+iso[1], +iso[2], +iso[3], timeOf(iso[4], iso[5], iso[6]));
  const local = LOCAL.exec(text);
  if (!local) return null;
  const year = Number(local[3]) + (local[3].length === 2 ? 2000 : 0);
  const [d, m] = order === 'dmy' ? [+local[1], +local[2]] : [+local[2], +local[1]];
  return when(year, m, d, timeOf(local[4], local[5], local[6], local[7]));
}
