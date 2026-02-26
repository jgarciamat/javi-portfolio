import { isNextMonthAllowed, isNextButtonDisabled } from '../../../modules/finances/domain/nextMonthLogic';

function makeDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
}

describe('isNextMonthAllowed', () => {
    it('returns false when many days remain in the month (e.g. 15th of a 31-day month)', () => {
        // Feb 15 → 28 days total, 13 days until next month
        expect(isNextMonthAllowed(makeDate(2026, 2, 15))).toBe(false);
    });

    it('returns false when exactly 7 days remain (i.e. daysUntilNext = 7)', () => {
        // Jan has 31 days; Jan 24 → daysUntilNext = 7 → NOT yet allowed
        expect(isNextMonthAllowed(makeDate(2026, 1, 24))).toBe(false);
    });

    it('returns true when 6 days remain (i.e. the 25th of a 31-day month)', () => {
        // Jan 25 → daysUntilNext = 6 → allowed
        expect(isNextMonthAllowed(makeDate(2026, 1, 25))).toBe(true);
    });

    it('returns true on the last day of the month', () => {
        expect(isNextMonthAllowed(makeDate(2026, 1, 31))).toBe(true);
    });

    it('returns true in February near end (short month)', () => {
        // Feb 2026 has 28 days; Feb 22 → daysUntilNext = 6 → allowed
        expect(isNextMonthAllowed(makeDate(2026, 2, 22))).toBe(true);
    });
});

describe('isNextButtonDisabled', () => {
    it('disables when currently viewing current month and next is not yet allowed', () => {
        // Jan 15 2026 — next month not yet allowed, viewing Jan 2026
        expect(isNextButtonDisabled(2026, 1, makeDate(2026, 1, 15))).toBe(true);
    });

    it('disables when viewing the next month even if it is allowed', () => {
        // Jan 25 2026 — next month (Feb) is allowed but user is already on Feb 2026
        expect(isNextButtonDisabled(2026, 2, makeDate(2026, 1, 25))).toBe(true);
    });

    it('enables when on current month and next month is allowed (within 7 days)', () => {
        // Jan 25 2026 — next month allowed, viewing Jan 2026 → "Siguiente" should be ENABLED
        expect(isNextButtonDisabled(2026, 1, makeDate(2026, 1, 25))).toBe(false);
    });

    it('disables when viewing a future year', () => {
        expect(isNextButtonDisabled(2027, 1, makeDate(2026, 1, 25))).toBe(true);
    });

    it('handles December → January year transition correctly (next allowed)', () => {
        // Dec 25 2026 — next month is Jan 2027. Viewing Dec 2026 → enabled
        expect(isNextButtonDisabled(2026, 12, makeDate(2026, 12, 25))).toBe(false);
    });

    it('handles December → January year transition correctly (next not yet allowed)', () => {
        // Dec 10 2026 — next month not allowed. Viewing Dec 2026 → disabled
        expect(isNextButtonDisabled(2026, 12, makeDate(2026, 12, 10))).toBe(true);
    });
});
