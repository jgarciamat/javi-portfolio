import { ITransactionRepository } from '@domain/repositories/ITransactionRepository';

export type AlertLevel = 'warning' | 'danger';

export interface BudgetAlert {
    level: AlertLevel;
    category: string | null; // null = global budget
    spentAmount: number;
    budgetAmount: number;
    percentage: number;
    message: string;
}

export class CheckBudgetAlerts {
    constructor(
        private readonly transactionRepo: ITransactionRepository,
    ) { }

    async execute(userId: string, year: number, month: number): Promise<BudgetAlert[]> {
        const alerts: BudgetAlert[] = [];

        // Available budget = carryover from previous months + income this month
        const carryover = this.transactionRepo.computeCarryover(userId, year, month);
        const transactions = await this.transactionRepo.findByUserAndMonth(userId, year, month);

        let totalIncome = 0;
        let totalExpenses = 0;
        const expensesByCategory: Record<string, number> = {};

        for (const tx of transactions) {
            if (tx.type.isIncome()) {
                totalIncome += tx.amount.value;
            } else if (tx.type.isExpense()) {
                totalExpenses += tx.amount.value;
                expensesByCategory[tx.category] =
                    (expensesByCategory[tx.category] ?? 0) + tx.amount.value;
            }
        }

        // If there's no income and no positive carryover, nothing to compare against
        const budgetAmount = Math.round((carryover + totalIncome) * 100) / 100;
        if (budgetAmount <= 0) return alerts;

        const globalPct = (totalExpenses / budgetAmount) * 100;

        // Global alert
        if (globalPct >= 100) {
            alerts.push({
                level: 'danger',
                category: null,
                spentAmount: Math.round(totalExpenses * 100) / 100,
                budgetAmount,
                percentage: Math.round(globalPct * 10) / 10,
                message: `Has gastado más de lo que tienes disponible este mes (${Math.round(globalPct)}%)`,
            });
        } else if (globalPct >= 80) {
            alerts.push({
                level: 'warning',
                category: null,
                spentAmount: Math.round(totalExpenses * 100) / 100,
                budgetAmount,
                percentage: Math.round(globalPct * 10) / 10,
                message: `Llevas el ${Math.round(globalPct)}% de tu dinero disponible gastado este mes`,
            });
        }

        // Per-category alerts: warn if a category > 30% of available budget
        const categoryThreshold = budgetAmount * 0.3;
        for (const [category, spent] of Object.entries(expensesByCategory)) {
            if (spent >= categoryThreshold) {
                const catPct = (spent / budgetAmount) * 100;
                alerts.push({
                    level: catPct >= 40 ? 'danger' : 'warning',
                    category,
                    spentAmount: Math.round(spent * 100) / 100,
                    budgetAmount,
                    percentage: Math.round(catPct * 10) / 10,
                    message: `La categoría "${category}" representa el ${Math.round(catPct)}% de tu dinero disponible`,
                });
            }
        }

        return alerts;
    }
}
