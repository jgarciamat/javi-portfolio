import type { Category, Transaction, UpdateTransactionDTO } from '@modules/finances/domain/types';

export interface EditTransactionModalProps {
    transaction: Transaction;
    categories: Category[];
    onSave: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
    onClose: () => void;
    onManageCategories: () => void;
    viewYear: number;
    viewMonth: number;
    availableBalance: number;
}
