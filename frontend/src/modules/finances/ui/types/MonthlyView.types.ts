import type { Transaction, Category, FinancialSummary, CreateTransactionDTO } from '@modules/finances/domain/types';

export interface MonthlyViewProps {
    year: number;
    month: number;
    isCurrentMonth: boolean;
    isPrevDisabled: boolean;
    isNextDisabled: boolean;
    transactions: Transaction[];
    summary: FinancialSummary | null;
    carryover: number | null;
    categories: Category[];
    loading: boolean;
    error: string | null;
    onPrev: () => void;
    onNext: () => void;
    onGoToCurrentMonth: () => void;
    onAddTransaction: (dto: CreateTransactionDTO) => Promise<Transaction>;
    onDeleteTransaction: (id: string) => Promise<void>;
    onPatchTransaction: (id: string, changes: { notes?: string | null }) => Promise<void>;
    onEditTransaction: (tx: Transaction) => void;
    onManageCategories: () => void;
}
