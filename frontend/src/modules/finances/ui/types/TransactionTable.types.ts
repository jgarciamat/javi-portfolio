import type { Transaction, TransactionType } from '@modules/finances/domain/types';

export interface TransactionTableProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onPatch: (id: string, changes: { notes?: string | null }) => void;
    onEdit: (tx: Transaction) => void;
}

export interface DayGroup {
    dayKey: string;
    label: string;
    items: Transaction[];
}

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

/** Returns "YYYY-MM-DD" (Madrid timezone) for grouping by day */
export function txDayKey(dateStr: string): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date(dateStr));
}

/** Returns "lun. 6 mar." / "Mon, Jan 6" style label depending on locale */
export function formatDayLabel(dateStr: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Madrid',
    }).format(new Date(dateStr));
}

/** Groups transactions into ordered day buckets preserving original sort order */
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
