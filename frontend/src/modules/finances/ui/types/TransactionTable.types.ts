import type { Transaction, TransactionType } from '@modules/finances/domain/types';

export interface TransactionTableProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onPatch: (id: string, changes: { notes?: string | null }) => void;
    onEdit: (tx: Transaction) => void;
}

// Re-export from domain so existing imports keep working
export type { DayGroup } from '@modules/finances/domain/transactionGrouping';
export { groupByDay, txDayKey, formatDayLabel } from '@modules/finances/domain/transactionGrouping';

// ─── CSS class helpers ────────────────────────────────────────────────────────

export function txBadgeClass(type: TransactionType): string {
    if (type === 'INCOME') return 'tx-badge tx-badge-income';
    if (type === 'SAVING') return 'tx-badge tx-badge-saving';
    return 'tx-badge tx-badge-expense';
}

export function txAmountColor(type: TransactionType): string {
    if (type === 'INCOME') return '#4ade80';
    if (type === 'SAVING') return '#a78bfa';
    return '#f87171';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Convert an ISO date string to YYYY-MM-DD (local timezone) */
export function isoToDateInput(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, locale = 'es-ES'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(dateStr: string, locale = 'es-ES'): string {
    return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Madrid',
    }).format(new Date(dateStr));
}
