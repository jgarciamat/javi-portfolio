/**
 * The monthly reminder to import the statement: on the day the person's month starts, at 9:00
 * (local time), when the statement of the month just ended can be downloaded from the bank.
 */

/** The next `count` mornings when the month starts, after `now`. */
export function nextMonthStarts(now: Date, startDay: number, count = 3): Date[] {
  const out: Date[] = [];
  for (let m = now.getMonth(); out.length < count; m++) {
    // `Date` carries month 12 and beyond into the next years.
    const at = new Date(now.getFullYear(), m, startDay, 9, 0, 0, 0);
    if (at > now) out.push(at);
  }
  return out;
}

/** The month that has just ended on a day: its statement is the one to import. */
export const endedMonthOf = (day: Date): Date => new Date(day.getFullYear(), day.getMonth() - 1, 1);
