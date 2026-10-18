/** Excel counts days from 30 Dec 1899 (its 1900 leap-year quirk is already inside that date). */
export function dateFromSerial(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function fromParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : null;
}

/**
 * A date as it shows up in a spreadsheet: `YYYY-MM-DD` (what the xlsx reader gives for date cells),
 * `D/M/YYYY` with `/`, `-` or `.` and a 2 or 4 digit year, or an Excel serial number. Null otherwise.
 */
export function parseBookDate(value: unknown): string | null {
  if (typeof value === 'number') {
    return value >= 20000 && value <= 80000 ? dateFromSerial(value) : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return fromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text);
  if (!local) return null;
  const year = Number(local[3]) + (local[3].length === 2 ? 2000 : 0);
  return fromParts(year, Number(local[2]), Number(local[1]));
}
