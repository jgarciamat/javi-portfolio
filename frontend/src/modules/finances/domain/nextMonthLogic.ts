/**
 * Returns true when the next month is unlocked for navigation.
 * Rule: the next month becomes available when ≤ 6 days remain in the current month
 * (i.e. 7 or fewer days before the 1st of the next month).
 */
export function isNextMonthAllowed(today: Date): boolean {
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysUntilNextMonth = daysInCurrentMonth - today.getDate();
    return daysUntilNextMonth <= 6;
}

/**
 * Returns true when the "Siguiente" button should be disabled.
 * @param viewYear  - the year currently displayed
 * @param viewMonth - the month currently displayed (1–12)
 * @param today     - reference date (defaults to now)
 */
export function isNextButtonDisabled(viewYear: number, viewMonth: number, today: Date = new Date()): boolean {
    const allowed = isNextMonthAllowed(today);

    const allowedYear = allowed
        ? (today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear())
        : today.getFullYear();
    const allowedMonth = allowed
        ? (today.getMonth() === 11 ? 1 : today.getMonth() + 2)
        : today.getMonth() + 1;

    if (viewYear > allowedYear) return true;
    if (viewYear === allowedYear && viewMonth >= allowedMonth) return true;
    return false;
}
