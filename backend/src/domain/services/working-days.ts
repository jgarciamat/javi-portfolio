/**
 * Working days for tax deadlines. A deadline that falls on a Saturday, a Sunday or a public holiday
 * moves to the next working day (Ley 39/2015, art. 30.2 and 30.5, BOE-A-2015-10565; instructions of
 * the modelos 130 and 303, AEAT; checked 2026-10-25).
 *
 * Only the holidays of every region are known here: the national ones that cannot be swapped
 * (RD 2001/1983, art. 45.1, BOE-A-1983-20906) and 6 January, kept by every region in the lists of
 * the Dirección General de Trabajo (2027: BOE-A-2026-21254). Regional and local holidays
 * (art. 30.6 of the same law) can move a deadline a day further; they are not known.
 */

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Easter Sunday of a Gregorian year (anonymous Gregorian algorithm), as [month, day]. */
function easter(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** Holidays on the same day every year (MM-DD). */
const FIXED_HOLIDAYS = [
  '01-01',
  '01-06',
  '05-01',
  '08-15',
  '10-12',
  '11-01',
  '12-06',
  '12-08',
  '12-25',
];

/** Whether an ISO date is a holiday in every region of Spain. */
export function isNationalHoliday(date: string): boolean {
  if (FIXED_HOLIDAYS.includes(date.slice(5))) return true;
  const [month, day] = easter(Number(date.slice(0, 4)));
  // Good Friday: two days before Easter Sunday.
  const goodFriday = new Date(Date.UTC(Number(date.slice(0, 4)), month - 1, day - 2));
  return iso(goodFriday) === date;
}

/** A deadline date, moved past weekends and national holidays. */
export function businessDay(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  while (d.getUTCDay() === 6 || d.getUTCDay() === 0 || isNationalHoliday(iso(d))) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return iso(d);
}

/** The last day of a month (28 or 29 in February). */
export const lastDayOf = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Last day to file the quarterly 303 and 130 (and the 349): 20 April, July and October, and
 * 30 January for the fourth quarter, moved to the next working day.
 */
export function filingDeadline(year: number, quarter: 1 | 2 | 3 | 4): string {
  return quarter === 4 ? businessDay(year + 1, 1, 30) : businessDay(year, quarter * 3 + 1, 20);
}

/** Mainland Spain and the Canary Islands (one hour behind). */
const SPAIN_ZONES = ['Europe/Madrid', 'Atlantic/Canary'] as const;

/** The calendar day of an instant in a time zone, as YYYY-MM-DD. */
function dayIn(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${part.year}-${part.month}-${part.day}`;
}

/** The day in mainland Spain and in the Canary Islands (the same day most of the time). */
export const spanishDays = (now: Date): string[] => SPAIN_ZONES.map((z) => dayIn(now, z));
