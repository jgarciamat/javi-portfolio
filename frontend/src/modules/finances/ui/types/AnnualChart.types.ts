import type { AnnualSummary } from '@modules/finances/domain/types';

export interface AnnualChartProps {
    initialYear: number;
    /** Called when the user clicks a month label — navigates to that month's view */
    onMonthClick?: (year: number, month: number) => void;
}

/** Internal state for the floating tooltip */
export interface TooltipState {
    text: string;
    color: string;
    x: number;
    y: number;
}

export interface AnnualMonthEntry {
    month: number;
    income: number;
    expenses: number;
    saving: number;
    balance: number;
}

export interface AnnualChartTotals {
    income: number;
    expenses: number;
    saving: number;
}

export interface AnnualChartData {
    months: AnnualMonthEntry[];
    maxVal: number;
    totals: AnnualChartTotals;
}

/** Derives chart-ready data from raw AnnualSummary */
export function buildAnnualChartData(data: AnnualSummary | null | undefined): AnnualChartData {
    const months: AnnualMonthEntry[] = data
        ? Object.entries(data.months).map(([k, v]) => ({ month: Number(k), ...v }))
        : [];

    const maxVal = months.length
        ? Math.max(...months.flatMap((m) => [m.income, m.expenses, m.saving]), 1)
        : 1;

    const totals = months.reduce(
        (acc, m) => ({
            income: acc.income + m.income,
            expenses: acc.expenses + m.expenses,
            saving: acc.saving + m.saving,
        }),
        { income: 0, expenses: 0, saving: 0 },
    );

    return { months, maxVal, totals };
}

export const MONTH_SHORT = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export function fmtCurrency(n: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(n);
}

/** Re-exported alias for clarity in AnnualMonthTable */
export type MonthData = AnnualMonthEntry;

export interface AnnualMonthTableProps {
    months: MonthData[];
    year: number;
    now: Date;
    onMonthClick?: (year: number, month: number) => void;
}
