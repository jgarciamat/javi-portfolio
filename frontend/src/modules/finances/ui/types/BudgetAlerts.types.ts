import type { FinancialSummary } from '@modules/finances/domain/types';

export interface BudgetAlertsProps {
    summary: FinancialSummary | null;
    carryover: number | null;
}
