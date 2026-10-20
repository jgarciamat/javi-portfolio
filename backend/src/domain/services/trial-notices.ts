import { TrialNoticeKind } from '@domain/ports/services';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A notice that is more than this many days late is not sent any more. */
export const ENDED_NOTICE_DAYS = 3;
/** Widest span, in days, before the end of the trial that can have a notice. */
export const ENDS_SOON_DAYS = 2;

const madridDay = (date: Date): number => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return Date.parse(parts) / DAY_MS;
};

/**
 * Which notice a trial calls for today (calendar days in Spain, so every run of the same day
 * agrees): two days before it ends, the day it ends (while it is still running) and, after it
 * ended, up to three days later. Any other day: none.
 */
export function trialNoticeKind(trialEndsAt: string, now: Date): TrialNoticeKind | null {
  const ends = new Date(trialEndsAt);
  const daysLeft = madridDay(ends) - madridDay(now);
  if (daysLeft === ENDS_SOON_DAYS) return 'ends_soon';
  if (daysLeft === 0 && ends.getTime() > now.getTime()) return 'last_day';
  if (daysLeft < 0 && daysLeft >= -ENDED_NOTICE_DAYS) return 'ended';
  return null;
}
