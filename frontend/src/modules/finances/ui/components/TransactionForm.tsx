import { useState } from 'react';
import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import '../css/TransactionForm.css';
import type { TransactionFormProps } from '../types';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { useI18n } from '@core/i18n/I18nContext';
import { TransactionFormFields } from './TransactionFormFields';

export function TransactionForm({ categories, onSubmit, onManageCategories, viewYear, viewMonth, availableBalance }: TransactionFormProps) {
    const [open, setOpen] = useState(false);
    const { t } = useI18n();

    const form = useTransactionForm({ viewYear, viewMonth, availableBalance, onSubmit });
    const { handleSubmit, reset, loading, error } = form;

    const handleCancel = () => {
        reset();
        setOpen(false);
    };

    return (
        <CollapsiblePanel
            title={<>➕ {t('app.transaction.form.title')}</>}
            open={open}
            onToggle={() => setOpen((v) => !v)}
        >
            <form onSubmit={async (e) => { const ok = await handleSubmit(e); if (ok) setOpen(false); }} className="tx-form">
                <TransactionFormFields form={form} categories={categories} onManageCategories={onManageCategories} />

                {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.4rem 0' }}>{error}</p>}
                <div className="tx-form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? t('app.transaction.form.saving') : t('app.transaction.form.save')}
                    </button>
                    <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>
                        {t('app.transaction.form.cancel')}
                    </button>
                </div>
            </form>
        </CollapsiblePanel>
    );
}
