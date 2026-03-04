import { useState } from 'react';
import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import '../css/TransactionForm.css';
import type { TransactionFormProps } from '../types';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { useI18n } from '@core/i18n/I18nContext';

export function TransactionForm({ categories, onSubmit, onManageCategories, viewYear, viewMonth, availableBalance }: TransactionFormProps) {
    const [open, setOpen] = useState(false);
    const { t, tCategory } = useI18n();

    const {
        fields,
        setDescription,
        setAmount,
        setType,
        setDate,
        setNotes,
        handleCategoryChange,
        handleSubmit,
        reset,
        loading,
        error,
    } = useTransactionForm({ viewYear, viewMonth, availableBalance, onSubmit });

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
                <div className="tx-form-grid">
                    <input className="tx-input" placeholder={t('app.transaction.form.description')} value={fields.description}
                        onChange={(e) => setDescription(e.target.value)} required />
                    <input className="tx-input" type="number" placeholder={t('app.transaction.form.amount')} min="0" step="0.01"
                        value={fields.amount} onChange={(e) => setAmount(e.target.value)} required />
                    <select className="tx-input" value={fields.type} onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE' | 'SAVING')}>
                        <option value="EXPENSE">{t('app.transaction.form.type.expense')}</option>
                        <option value="INCOME">{t('app.transaction.form.type.income')}</option>
                        <option value="SAVING">{t('app.transaction.form.type.saving')}</option>
                    </select>
                    <select
                        className="tx-input"
                        value={fields.category}
                        onChange={(e) => handleCategoryChange(e.target.value, onManageCategories)}
                        required
                    >
                        <option value="">{t('app.transaction.form.category.placeholder')}</option>
                        <option value="__manage__">⚙️ {t('app.transaction.form.category.manage')}</option>
                        <option disabled>──────────────</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.icon} {tCategory(c.name)}</option>
                        ))}
                    </select>
                    <input className="tx-input" type="date" value={fields.date} onChange={(e) => setDate(e.target.value)} />
                    <textarea
                        className="tx-input tx-notes-input"
                        placeholder={t('app.transaction.form.notes')}
                        value={fields.notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                    />
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.4rem 0' }}>{error}</p>}                <div className="tx-form-actions">
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

