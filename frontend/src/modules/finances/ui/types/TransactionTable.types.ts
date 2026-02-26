import type { Transaction } from '@modules/finances/domain/types';

export interface TransactionTableProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(dateStr));
}
