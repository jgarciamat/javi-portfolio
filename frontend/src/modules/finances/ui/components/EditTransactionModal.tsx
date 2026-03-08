import { useEffect } from 'react';
import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import '../css/TransactionForm.css';
import '../css/EditTransactionModal.css';
import type { UpdateTransactionDTO } from '@modules/finances/domain/types';
import { TransactionFormFields } from './TransactionFormFields';
import { useI18n } from '@core/i18n/I18nContext';
import { isoToDateInput } from '../types/TransactionTable.types';
import type { EditTransactionModalProps } from '../types/EditTransactionModal.types';

export function EditTransactionModal({
    transaction,
    categories,
    onSave,
    onClose,
    onManageCategories,
    viewYear,
    viewMonth,
    availableBalance,
}: EditTransactionModalProps) {
    const { t } = useI18n();

    const form = useTransactionForm({
        viewYear,
        viewMonth,
        availableBalance,
        onSubmit: async (dto) => {
            const updateDto: UpdateTransactionDTO = {
                description: dto.description,
                amount: dto.amount,
                type: dto.type,
                category: dto.category,
                date: dto.date,
                notes: dto.notes,
            };
            await onSave(transaction.id, updateDto);
        },
        initialValues: {
            description: transaction.description,
            amount: String(transaction.amount),
            type: transaction.type,
            category: transaction.category,
            date: isoToDateInput(transaction.date),
            notes: transaction.notes ?? '',
        },
    });

    const { handleSubmit, loading, error } = form;

    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="edit-tx-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label={t('app.transaction.edit.title')}>
            <div className="edit-tx-modal">
                <div className="edit-tx-modal-header">
                    <h2 className="edit-tx-modal-title">✏️ {t('app.transaction.edit.title')}</h2>
                    <button className="edit-tx-modal-close" onClick={onClose} aria-label={t('app.transaction.form.cancel')}>✕</button>
                </div>

                <form
                    onSubmit={async (e) => {
                        const ok = await handleSubmit(e);
                        if (ok) onClose();
                    }}
                    className="tx-form"
                >
                    <TransactionFormFields
                        form={form}
                        categories={categories}
                        onManageCategories={onManageCategories}
                    />

                    {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.4rem 0' }}>{error}</p>}

                    <div className="edit-tx-modal-actions">
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? t('app.transaction.form.saving') : t('app.transaction.edit.save')}
                        </button>
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            {t('app.transaction.form.cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
