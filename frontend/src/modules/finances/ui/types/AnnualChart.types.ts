export interface AnnualChartProps {
    initialYear: number;
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
