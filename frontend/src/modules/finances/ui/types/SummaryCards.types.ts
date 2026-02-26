import type { FinancialSummary } from '@modules/finances/domain/types';

export interface SummaryCardsProps {
    summary: FinancialSummary;
    carryover: number | null;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}
