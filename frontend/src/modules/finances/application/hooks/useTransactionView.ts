import { useMemo, useState } from 'react';
import {
    groupByDay,
    groupByWeek,
    buildCalendarMonth,
} from '@modules/finances/domain/transactionGrouping';
import type {
    DayGroup,
    WeekGroup,
    CalendarCell,
} from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionViewMode = 'day' | 'week' | 'calendar';

export interface UseTransactionViewOptions {
    transactions: Transaction[];
    locale: string;
    /** Year shown in the parent MonthlyView selector (1-based month) */
    year: number;
    month: number;
}

export interface UseTransactionViewReturn {
    mode: TransactionViewMode;
    setMode: (mode: TransactionViewMode) => void;
    /** Grouped by calendar day — used in "day" mode */
    dayGroups: DayGroup[];
    /** Grouped by ISO week — used in "week" mode */
    weekGroups: WeekGroup[];
    /** 6×7 grid — used in "calendar" mode */
    calendarRows: CalendarCell[][];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactionView({
    transactions,
    locale,
    year,
    month,
}: UseTransactionViewOptions): UseTransactionViewReturn {
    const [mode, setMode] = useState<TransactionViewMode>('day');

    const dayGroups = useMemo(
        () => groupByDay(transactions, locale),
        [transactions, locale],
    );

    const weekGroups = useMemo(
        () => groupByWeek(transactions, locale),
        [transactions, locale],
    );

    const calendarRows = useMemo(
        () => buildCalendarMonth(year, month, transactions),
        [year, month, transactions],
    );

    return { mode, setMode, dayGroups, weekGroups, calendarRows };
}
