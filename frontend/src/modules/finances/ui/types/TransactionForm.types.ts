import type { Category, CreateTransactionDTO } from '@modules/finances/domain/types';

export interface TransactionFormProps {
    categories: Category[];
    onSubmit: (dto: CreateTransactionDTO) => Promise<void>;
    onManageCategories: () => void;
    /** The year/month currently being viewed, used to default the date picker */
    viewYear: number;
    viewMonth: number;
    /** Current available balance (carryover + month balance). Used to block overspending. */
    availableBalance: number;
}
