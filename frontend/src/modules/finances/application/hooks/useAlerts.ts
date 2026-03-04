import { useMemo } from 'react';
import type { FinancialSummary } from '@modules/finances/domain/types';

export type AlertLevel = 'warning' | 'danger';

export interface BudgetAlert {
    level: AlertLevel;
    category: string | null;
    /** Amount spent (global or in category) */
    spentAmount: number;
    /** Remaining money: available - totalExpenses (global); null for category alerts */
    remainingAmount: number | null;
    percentage: number;
    message: string;
}

interface Params {
    summary: FinancialSummary | null;
    carryover: number | null;
}

export function useBudgetAlerts({ summary, carryover }: Params): BudgetAlert[] {
    return useMemo(() => {
        if (!summary) return [];

        const available = (carryover ?? 0) + summary.totalIncome;
        if (available <= 0) return [];

        const alerts: BudgetAlert[] = [];
        const globalPct = (summary.totalExpenses / available) * 100;
        const remaining = Math.round((available - summary.totalExpenses) * 100) / 100;

        // ── Global alert ──────────────────────────────────────────────────
        if (globalPct >= 100) {
            alerts.push({
                level: 'danger',
                category: null,
                spentAmount: Math.round(summary.totalExpenses * 100) / 100,
                remainingAmount: remaining,
                percentage: Math.round(globalPct * 10) / 10,
                message: `Has gastado más de lo que tienes disponible este mes (${Math.round(globalPct)}%)`,
            });
        } else if (globalPct >= 80) {
            alerts.push({
                level: 'warning',
                category: null,
                spentAmount: Math.round(summary.totalExpenses * 100) / 100,
                remainingAmount: remaining,
                percentage: Math.round(globalPct * 10) / 10,
                message: `Llevas el ${Math.round(globalPct)}% de tu dinero disponible gastado`,
            });
        }

        // ── Per-category alerts (> 30 % of available) ─────────────────────
        for (const [category, spent] of Object.entries(summary.expensesByCategory)) {
            const catPct = (spent / available) * 100;
            if (catPct >= 30) {
                alerts.push({
                    level: catPct >= 40 ? 'danger' : 'warning',
                    category,
                    spentAmount: Math.round(spent * 100) / 100,
                    remainingAmount: null,   // no aplica para categorías
                    percentage: Math.round(catPct * 10) / 10,
                    message: `"${category}" supera el ${Math.round(catPct)}% de tu dinero disponible`,
                });
            }
        }

        return alerts;
    }, [summary, carryover]);
}
