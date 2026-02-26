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
