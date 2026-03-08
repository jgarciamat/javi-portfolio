import type { Category, CreateTransactionDTO } from '@modules/finances/domain/types';
import type { UseTransactionFormReturn } from '../../application/hooks/useTransactionForm';

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

export interface TransactionFormFieldsProps {
    form: UseTransactionFormReturn;
    categories: Category[];
    onManageCategories: () => void;
}
