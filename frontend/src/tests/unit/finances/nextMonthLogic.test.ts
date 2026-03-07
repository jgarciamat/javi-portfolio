import { isNextButtonDisabled, isMonthInFuture } from '../../../modules/finances/domain/nextMonthLogic';

function makeDate(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
}

describe('isNextButtonDisabled', () => {
    it('disables when viewing the next month (current + 1)', () => {
        // Today is March 7 2026 — April 2026 is current+1 → button should be disabled when already on April
        expect(isNextButtonDisabled(2026, 4, makeDate(2026, 3, 7))).toBe(true);
    });

    it('enables when viewing the current month (can navigate to current + 1)', () => {
        // Today is March 7 2026 — viewing March → can go to April → enabled
        expect(isNextButtonDisabled(2026, 3, makeDate(2026, 3, 7))).toBe(false);
    });

    it('enables even at the start of the month (no 7-day restriction)', () => {
        // Today is Jan 1 2026 — viewing Jan → can go to Feb → enabled
        expect(isNextButtonDisabled(2026, 1, makeDate(2026, 1, 1))).toBe(false);
    });

    it('disables when viewing a month 2+ months ahead', () => {
        // Today is March 7 2026 — viewing May 2026 (2 months ahead) → disabled
        expect(isNextButtonDisabled(2026, 5, makeDate(2026, 3, 7))).toBe(true);
    });

    it('disables when viewing a future year beyond current+1', () => {
        // Today is March 7 2026 — viewing 2028 → disabled
        expect(isNextButtonDisabled(2028, 1, makeDate(2026, 3, 7))).toBe(true);
    });

    it('handles December → January wrap correctly (enables when on December)', () => {
        // Today is Dec 7 2026 — viewing Dec 2026 → can go to Jan 2027 → enabled
        expect(isNextButtonDisabled(2026, 12, makeDate(2026, 12, 7))).toBe(false);
    });

    it('handles December → January wrap correctly (disables when on January of next year)', () => {
        // Today is Dec 7 2026 — viewing Jan 2027 (= current+1) → disabled
        expect(isNextButtonDisabled(2027, 1, makeDate(2026, 12, 7))).toBe(true);
    });

    it('disables when viewing February of next year (2 months ahead of December)', () => {
        // Today is Dec 2026 — viewing Feb 2027 → disabled
        expect(isNextButtonDisabled(2027, 2, makeDate(2026, 12, 7))).toBe(true);
    });
});

describe('isMonthInFuture', () => {
    it('returns false for the current month', () => {
        expect(isMonthInFuture(2026, 3, makeDate(2026, 3, 4))).toBe(false);
    });

    it('returns false for a past month in the same year', () => {
        expect(isMonthInFuture(2026, 1, makeDate(2026, 3, 4))).toBe(false);
    });

    it('returns false for a month in a past year', () => {
        expect(isMonthInFuture(2025, 12, makeDate(2026, 3, 4))).toBe(false);
    });

    it('returns true for next month (current + 1)', () => {
        expect(isMonthInFuture(2026, 4, makeDate(2026, 3, 4))).toBe(true);
    });

    it('returns true for a month in a future year', () => {
        expect(isMonthInFuture(2027, 1, makeDate(2026, 3, 4))).toBe(true);
    });
});
