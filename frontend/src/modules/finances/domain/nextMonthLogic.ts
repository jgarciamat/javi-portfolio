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

/**
 * Returns true when the "next year" button in the annual chart should be disabled.
 *
 * Rule: navigating to the next year is only allowed if we are in December of
 * the current year (because January of next year is the only future month
 * accessible at that point). At any other time of the year, the next year
 * has no accessible months yet.
 *
 * Examples:
 *   - Today = March 2026,    viewing 2026 → disabled (only Jan 2026 is allowed ahead, same year)
 *   - Today = December 2026, viewing 2026 → enabled  (Jan 2027 is the +1 month)
 *   - Today = December 2026, viewing 2027 → disabled (already on next year)
 *   - Today = any month,     viewing year > currentYear + 1 → disabled
 *
 * @param viewYear - the year currently displayed in the annual chart
 * @param today    - reference date (defaults to now)
 */
export function isNextYearDisabled(viewYear: number, today: Date = new Date()): boolean {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1–12

    // Already past or at the next year
    if (viewYear >= currentYear + 1) return true;

    // Can only go to next year if we are in December
    if (currentMonth !== 12) return true;

    return false;
}
