/**
 * Whether there are enough movements for estimates (the end of the month, the financial health)
 * to mean something. Before that, a new account would only get warnings about data it does not
 * have yet («no money left this month», «Fragile»).
 */
export const ENOUGH_MOVEMENTS = 5;
export const ENOUGH_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days between two `YYYY-MM-DD` dates, whatever the time zone. */
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * At least 5 movements (in the account or in the month), or movements over at least 7 days.
 * `totalMovements`: every movement of the account, when known.
 */
export function hasEnoughData(
  movements: { date: string }[],
  totalMovements: number | null,
  today: string
): boolean {
  if ((totalMovements ?? 0) >= ENOUGH_MOVEMENTS || movements.length >= ENOUGH_MOVEMENTS) {
    return true;
  }
  if (movements.length === 0) return false;
  const first = movements.reduce((min, m) => (m.date < min ? m.date : min), movements[0].date);
  return daysBetween(first.slice(0, 10), today) >= ENOUGH_DAYS;
}
