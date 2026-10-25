import {
  businessDay,
  filingDeadline,
  isNationalHoliday,
  lastDayOf,
  spanishDays,
} from '@domain/services/working-days';
import { deadlinesFor } from '@domain/services/autonomo';

describe('national holidays', () => {
  it('knows the fixed ones and Good Friday', () => {
    // Good Friday of 2026 is 3 April and of 2027 is 26 March (BOE-A-2026-21254 lists 26-03-2027).
    expect(isNationalHoliday('2026-04-03')).toBe(true);
    expect(isNationalHoliday('2027-03-26')).toBe(true);
    expect(isNationalHoliday('2027-03-25')).toBe(false);
    expect(isNationalHoliday('2027-01-01')).toBe(true);
    expect(isNationalHoliday('2027-01-06')).toBe(true);
    expect(isNationalHoliday('2026-10-12')).toBe(true);
    expect(isNationalHoliday('2026-12-25')).toBe(true);
    expect(isNationalHoliday('2027-02-01')).toBe(false);
  });
});

describe('the next working day', () => {
  it('skips weekends and national holidays', () => {
    expect(businessDay(2027, 1, 30)).toBe('2027-02-01'); // Saturday
    expect(businessDay(2026, 10, 20)).toBe('2026-10-20'); // Tuesday
    // 1 May 2027 is a Saturday: Monday the 3rd.
    expect(businessDay(2027, 5, 1)).toBe('2027-05-03');
    // 25 December 2026 is a Friday (holiday) and then the weekend: Monday the 28th.
    expect(businessDay(2026, 12, 25)).toBe('2026-12-28');
    // Thursday 2 April 2026, then Good Friday and the weekend.
    expect(businessDay(2026, 4, 3)).toBe('2026-04-06');
  });

  it('has the last day of February of leap years', () => {
    expect(lastDayOf(2027, 2)).toBe(28);
    expect(lastDayOf(2028, 2)).toBe(29);
    expect(lastDayOf(2026, 1)).toBe(31);
  });
});

describe('quarterly filing deadlines of 2026', () => {
  it('are the 20th, or 1 February 2027 for the fourth quarter', () => {
    expect(filingDeadline(2026, 1)).toBe('2026-04-20');
    expect(filingDeadline(2026, 2)).toBe('2026-07-20');
    expect(filingDeadline(2026, 3)).toBe('2026-10-20');
    expect(filingDeadline(2026, 4)).toBe('2027-02-01');
    // 20 April 2025 was a Sunday.
    expect(filingDeadline(2025, 1)).toBe('2025-04-21');
  });
});

describe('the day in Spain', () => {
  it('is that of Madrid and of the Canary Islands', () => {
    expect(spanishDays(new Date('2027-02-01T23:30:00Z'))).toEqual(['2027-02-02', '2027-02-01']);
    expect(spanishDays(new Date('2026-07-20T12:00:00Z'))).toEqual(['2026-07-20', '2026-07-20']);
  });
});

describe('the deadline of the modelo 347', () => {
  const m347 = (year: number) => deadlinesFor(year, 4).find((d) => d.model === '347')?.date;

  it('is the last day of February, moved to the next working day', () => {
    // 28 February 2027 is a Sunday: Monday 1 March.
    expect(m347(2026)).toBe('2027-03-01');
    // 2028 is a leap year: Tuesday 29 February, not the 28th.
    expect(m347(2027)).toBe('2028-02-29');
    // 28 February 2026 was a Saturday.
    expect(m347(2025)).toBe('2026-03-02');
  });
});
