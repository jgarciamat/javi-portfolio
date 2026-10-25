import {
  businessDay,
  filingDeadline,
  isNationalHoliday,
  lastDayOf,
} from '@modules/finances/domain/workingDays';
import { isClosedQuarter } from '@modules/finances/domain/closedQuarter';
import { withholdingDeadline } from '@modules/finances/domain/withholdings';

describe('working days of the tax deadlines', () => {
  it('knows the national holidays, Good Friday included', () => {
    // Good Friday: 3 April 2026 and 26 March 2027 (BOE-A-2026-21254).
    expect(isNationalHoliday('2026-04-03')).toBe(true);
    expect(isNationalHoliday('2027-03-26')).toBe(true);
    expect(isNationalHoliday('2027-01-06')).toBe(true);
    expect(isNationalHoliday('2027-02-01')).toBe(false);
  });

  it('moves a deadline past weekends and holidays', () => {
    expect(businessDay(2027, 1, 30)).toBe('2027-02-01');
    expect(businessDay(2026, 12, 25)).toBe('2026-12-28');
    expect(businessDay(2026, 4, 3)).toBe('2026-04-06');
    expect(lastDayOf(2028, 2)).toBe(29);
  });

  it('has the quarterly deadlines of 2026 and the 111 and 115 ones', () => {
    expect([1, 2, 3, 4].map((q) => filingDeadline(2026, q as 1 | 2 | 3 | 4))).toEqual([
      '2026-04-20',
      '2026-07-20',
      '2026-10-20',
      '2027-02-01',
    ]);
    expect(withholdingDeadline(2026, 4)).toBe('2027-01-20');
    expect(withholdingDeadline(2026, 3)).toBe('2026-10-20');
    // 20 April 2025 was a Sunday.
    expect(withholdingDeadline(2025, 1)).toBe('2025-04-21');
  });

  it('closes the fourth quarter of 2026 on 2 February 2027', () => {
    expect(isClosedQuarter(2026, 4, '2027-02-01')).toBe(false);
    expect(isClosedQuarter(2026, 4, '2027-02-02')).toBe(true);
  });
});
