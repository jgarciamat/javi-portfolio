/**
 * Returns true when a given year/month is strictly in the future (after the current month).
 * Used in the annual chart to decide if a month label should be a clickable link.
 */
export function isMonthInFuture(viewYear: number, viewMonth: number, today: Date = new Date()): boolean {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    if (viewYear > currentYear) return true;
    if (viewYear === currentYear && viewMonth > currentMonth) return true;
    return false;
}

/**
 * Returns true when the "Siguiente" button should be disabled.
 * Rule: navigation is allowed up to 1 month ahead of the current month.
 * E.g. on March 2026, April 2026 is accessible but May 2026 is not.
 *
 * @param viewYear  - the year currently displayed
 * @param viewMonth - the month currently displayed (1–12)
 * @param today     - reference date (defaults to now)
 */
export function isNextButtonDisabled(viewYear: number, viewMonth: number, today: Date = new Date()): boolean {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // Compute the maximum allowed month (current + 1)
    const maxYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const maxMonth = currentMonth === 12 ? 1 : currentMonth + 1;

    if (viewYear > maxYear) return true;
    if (viewYear === maxYear && viewMonth >= maxMonth) return true;
    return false;
}
