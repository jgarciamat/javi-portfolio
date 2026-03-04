import type { Transaction, FinancialSummary, MonthData } from '@modules/finances/domain/types';
import { MONTH_NAMES } from '@modules/finances/ui/types/Dashboard.types';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Wraps a cell value in double-quotes and escapes any inner quotes. */
function cell(value: string | number | null | undefined): string {
    const str = value == null ? '' : String(value);
    return `"${str.replace(/"/g, '""')}"`;
}

function buildCSV(rows: string[][]): string {
    return rows.map((r) => r.join(',')).join('\r\n');
}

function download(content: string, filename: string): void {
    // Add UTF-8 BOM so Excel opens it with the right encoding
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── exported hook ───────────────────────────────────────────────────────────

export function useExportCSV() {
    /**
     * Exports the transaction list for the currently viewed month plus a
     * one-row summary footer.
     */
    function exportMonthCSV(
        transactions: Transaction[],
        summary: FinancialSummary | null,
        year: number,
        month: number,
        tCategory: (name: string) => string,
    ): void {
        const monthName = MONTH_NAMES[month - 1] ?? String(month);

        const header = [
            cell('Fecha'),
            cell('Descripción'),
            cell('Categoría'),
            cell('Tipo'),
            cell('Importe (€)'),
            cell('Notas'),
        ];

        const typeLabel: Record<string, string> = {
            INCOME: 'Ingreso',
            EXPENSE: 'Gasto',
            SAVING: 'Ahorro',
        };

        const rows: string[][] = transactions.map((tx) => [
            cell(tx.date),
            cell(tx.description),
            cell(tCategory(tx.category)),
            cell(typeLabel[tx.type] ?? tx.type),
            cell(tx.amount),
            cell(tx.notes),
        ]);

        if (summary) {
            rows.push([]);   // blank separator
            rows.push([cell('RESUMEN'), '', '', '', '', '']);
            rows.push([cell('Ingresos'), '', '', '', cell(summary.totalIncome), '']);
            rows.push([cell('Gastos'), '', '', '', cell(summary.totalExpenses), '']);
            rows.push([cell('Ahorro'), '', '', '', cell(summary.totalSaving), '']);
            rows.push([cell('Balance'), '', '', '', cell(summary.balance), '']);
        }

        const csv = buildCSV([header, ...rows]);
        download(csv, `money-manager_${year}-${String(month).padStart(2, '0')}_${monthName}.csv`);
    }

    /**
     * Exports the annual breakdown table (one row per month) plus totals.
     */
    function exportAnnualCSV(
        months: (MonthData & { month: number })[],
        year: number,
    ): void {
        const header = [
            cell('Mes'),
            cell('Ingresos (€)'),
            cell('Gastos (€)'),
            cell('Ahorro (€)'),
            cell('Balance (€)'),
        ];

        const rows: string[][] = months.map(({ month, income, expenses, saving, balance }) => [
            cell(MONTH_NAMES[month - 1] ?? String(month)),
            cell(income),
            cell(expenses),
            cell(saving),
            cell(balance),
        ]);

        // Totals footer
        const totals = months.reduce(
            (acc, m) => ({
                income: acc.income + m.income,
                expenses: acc.expenses + m.expenses,
                saving: acc.saving + m.saving,
                balance: acc.balance + m.balance,
            }),
            { income: 0, expenses: 0, saving: 0, balance: 0 },
        );

        rows.push([]);  // blank separator
        rows.push([
            cell('TOTAL'),
            cell(totals.income),
            cell(totals.expenses),
            cell(totals.saving),
            cell(totals.balance),
        ]);

        const csv = buildCSV([header, ...rows]);
        download(csv, `money-manager_anual_${year}.csv`);
    }

    return { exportMonthCSV, exportAnnualCSV };
}
