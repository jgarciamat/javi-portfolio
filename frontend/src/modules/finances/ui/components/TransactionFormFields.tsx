import type { TransactionType } from '@modules/finances/domain/types';
import type { TransactionFormFieldsProps } from '../types/TransactionForm.types';
import { useI18n } from '@core/i18n/I18nContext';

export function TransactionFormFields({ form, categories, onManageCategories }: TransactionFormFieldsProps) {
    const { t, tCategory } = useI18n();
    const { fields, setDescription, setAmount, setType, setDate, setNotes, handleCategoryChange } = form;

    return (
        <div className="tx-form-grid">
            <input
                className="tx-input"
                placeholder={t('app.transaction.form.description')}
                value={fields.description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <input
                className="tx-input"
                type="number"
                placeholder={t('app.transaction.form.amount')}
                min="0"
                step="0.01"
                value={fields.amount}
                onChange={(e) => setAmount(e.target.value)}
                required
            />
            <select
                className="tx-input"
                value={fields.type}
                onChange={(e) => setType(e.target.value as TransactionType)}
            >
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
            <input
                className="tx-input"
                type="date"
                value={fields.date}
                onChange={(e) => setDate(e.target.value)}
            />
            <textarea
                className="tx-input tx-notes-input"
                placeholder={t('app.transaction.form.notes')}
                value={fields.notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
            />
        </div>
    );
}
