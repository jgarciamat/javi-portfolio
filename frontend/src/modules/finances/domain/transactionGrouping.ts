import { parseDateOnly, toDateOnly } from '@shared/utils/format';
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

const localDate = parseDateOnly;
const dayKeyOf = toDateOnly;

/** Calendar day "YYYY-MM-DD" of a movement (the API sends calendar dates). */
export function txDayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** "lun. 6 mar." / "Mon, 6 Mar" label */
export function formatDayLabel(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(localDate(txDayKey(dateStr)));
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
  const week = Math.ceil(
    ((thursday.getTime() - jan4.getTime()) / 86400000 + ((jan4.getDay() + 6) % 7) + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** "3 mar. – 9 mar." range label for a week given any day inside it */
function formatWeekLabel(dayKey: string, locale: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
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
    const allItems = v.days.flatMap((d) => d.items);
    const income = allItems.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = allItems.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const saving = allItems.filter((t) => t.type === 'SAVING').reduce((s, t) => s + t.amount, 0);
    return {
      weekKey,
      label: v.label,
      days: v.days,
      totals: { income, expenses, saving, balance: income - expenses - saving },
    };
  });
}

/**
 * Builds the calendar grid of a period (weeks start on Monday). With the default
 * month start day the period is the calendar month; with a custom start day it
 * runs from `range.start` to `range.end` (e.g. 25 Mar – 24 Apr).
 * Cells outside the period have dayKey=null and items=[].
 */
export function buildCalendarMonth(
  year: number,
  month: number, // 1-12
  transactions: Transaction[],
  range?: { start: string; end: string }
): CalendarCell[][] {
  const byDay = indexByDay(transactions);
  const first = range ? localDate(range.start) : new Date(year, month - 1, 1, 12);
  const last = range ? localDate(range.end) : new Date(year, month, 0, 12);

  const empty = (): CalendarCell => ({ dayKey: null, dayNumber: null, items: [] });
  const startOffset = (first.getDay() + 6) % 7; // ISO weekday of the first day (0=Mon)
  const cells: CalendarCell[] = Array.from({ length: startOffset }, empty);
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const key = dayKeyOf(d);
    cells.push({ dayKey: key, dayNumber: d.getDate(), items: byDay.get(key) ?? [] });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push(empty());

  const rows: CalendarCell[][] = [];
  for (let r = 0; r < cells.length / 7; r++) rows.push(cells.slice(r * 7, r * 7 + 7));
  return rows;
}

function indexByDay(transactions: Transaction[]): Map<string, Transaction[]> {
  const byDay = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = txDayKey(tx.date);
    byDay.set(key, [...(byDay.get(key) ?? []), tx]);
  }
  return byDay;
}
