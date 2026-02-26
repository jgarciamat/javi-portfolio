import type { FinancialSummary } from '@modules/finances/domain/types';

export interface CategoryChartProps {
    summary: FinancialSummary;
}

/** Internal sub-component props for each horizontal bar group */
export interface BarChartProps {
    data: Record<string, number>;
    title: string;
    color: string;
    total: number;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}
