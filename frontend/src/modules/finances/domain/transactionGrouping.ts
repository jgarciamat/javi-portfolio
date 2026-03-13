import type { Transaction } from './types';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DayGroup {
    /** "YYYY-MM-DD" used as stable key */
    dayKey: string;
    /** Human-readable label e.g. "lun. 6 mar." */
    label: string;
    items: Transaction[];
}

export interface WeekGroup {
    /** ISO week key "YYYY-Www" e.g. "2026-W10" */
    weekKey: string;
    /** Human-readable range label e.g. "3 mar. – 9 mar." */
    label: string;
    days: DayGroup[];
    /** Pre-computed totals for the week */
    totals: { income: number; expenses: number; saving: number; balance: number };
}

export interface CalendarCell {
    /** "YYYY-MM-DD" or null for padding cells outside the month */
    dayKey: string | null;
    /** Day number 1-31, or null for padding */
    dayNumber: number | null;
    items: Transaction[];
}

// ─── Internal date helpers ────────────────────────────────────────────────────

const TZ = 'Europe/Madrid';

/** Returns "YYYY-MM-DD" in Madrid timezone */
export function txDayKey(dateStr: string): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(dateStr));
}

/** "lun. 6 mar." / "Mon, Jan 6" label */
export function formatDayLabel(dateStr: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ,
    }).format(new Date(dateStr));
}

/**
 * Returns the ISO week key "YYYY-Www" for a given "YYYY-MM-DD" string.
 * Uses the ISO week definition: week starts on Monday.
 */
export function isoWeekKey(dayKey: string): string {
    const d = new Date(`${dayKey}T12:00:00`);
    // ISO week: shift to Thursday of the same week, then get year and week
    const thursday = new Date(d);
    thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3); // Thursday of ISO week
    const year = thursday.getFullYear();
    const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
    const week = Math.ceil(((thursday.getTime() - jan4.getTime()) / 86400000 + ((jan4.getDay() + 6) % 7) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/** "3 mar. – 9 mar." range label for a week given any day inside it */
function formatWeekLabel(dayKey: string, locale: string): string {
    const d = new Date(`${dayKey}T12:00:00`);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: TZ });
    return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

// ─── Public grouping functions ────────────────────────────────────────────────

/**
 * Groups transactions into ordered day buckets preserving original sort order.
 */
export function groupByDay(transactions: Transaction[], locale: string): DayGroup[] {
    const map = new Map<string, { label: string; items: Transaction[] }>();
    for (const tx of transactions) {
        const key = txDayKey(tx.date);
        if (!map.has(key)) {
            map.set(key, { label: formatDayLabel(tx.date, locale), items: [] });
        }
        map.get(key)!.items.push(tx);
    }
    return Array.from(map.entries()).map(([dayKey, v]) => ({ dayKey, ...v }));
}

/**
 * Groups transactions by ISO week. Each week contains its day groups and
 * pre-computed totals (income, expenses, saving, balance).
 */
export function groupByWeek(transactions: Transaction[], locale: string): WeekGroup[] {
    const days = groupByDay(transactions, locale);
    const weekMap = new Map<string, { label: string; days: DayGroup[] }>();

    for (const day of days) {
        const wk = isoWeekKey(day.dayKey);
        if (!weekMap.has(wk)) {
            weekMap.set(wk, { label: formatWeekLabel(day.dayKey, locale), days: [] });
        }
        weekMap.get(wk)!.days.push(day);
    }

    return Array.from(weekMap.entries()).map(([weekKey, v]) => {
        const allItems = v.days.flatMap(d => d.items);
        const income = allItems.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expenses = allItems.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const saving = allItems.filter(t => t.type === 'SAVING').reduce((s, t) => s + t.amount, 0);
        return {
            weekKey,
            label: v.label,
            days: v.days,
            totals: { income, expenses, saving, balance: income - expenses - saving },
        };
    });
}

/**
 * Builds a 6×7 calendar grid for a given year/month.
 * Cells outside the month have dayKey=null and items=[].
 * Week starts on Monday (ISO).
 */
export function buildCalendarMonth(
    year: number,
    month: number,        // 1-12
    transactions: Transaction[],
): CalendarCell[][] {
    // Map dayKey → transactions for fast lookup
    const byDay = new Map<string, Transaction[]>();
    for (const tx of transactions) {
        const key = txDayKey(tx.date);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(tx);
    }

    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // ISO weekday of the 1st (0=Mon … 6=Sun)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: CalendarCell[] = [];

    // Padding before month start
    for (let i = 0; i < startOffset; i++) {
        cells.push({ dayKey: null, dayNumber: null, items: [] });
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(month).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const key = `${year}-${mm}-${dd}`;
        cells.push({ dayKey: key, dayNumber: d, items: byDay.get(key) ?? [] });
    }

    // Padding after month end to fill 6 rows × 7 cols = 42 cells
    while (cells.length < 42) {
        cells.push({ dayKey: null, dayNumber: null, items: [] });
    }

    // Split into rows of 7
    const rows: CalendarCell[][] = [];
    for (let r = 0; r < 6; r++) {
        rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
}
