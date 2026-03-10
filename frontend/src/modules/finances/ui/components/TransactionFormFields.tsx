import { useRef } from 'react';
import type { TransactionType } from '@modules/finances/domain/types';
import type { TransactionFormFieldsProps } from '../types/TransactionForm.types';
import { useI18n } from '@core/i18n/I18nContext';

export function TransactionFormFields({ form, categories, onManageCategories }: TransactionFormFieldsProps) {
    const { t, tCategory, locale } = useI18n();
    const { fields, setDescription, setAmount, setType, setDate, setNotes, handleCategoryChange } = form;
    const dateInputRef = useRef<HTMLInputElement>(null);

    /** Format YYYY-MM-DD → locale-friendly display string */
    const formatDisplayDate = (value: string): string => {
        if (!value) return '';
        const [y, m, d] = value.split('-');
        if (!y || !m || !d) return value;
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    };

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
            <div
                className="tx-input tx-date-display"
                onClick={() => dateInputRef.current?.showPicker?.()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dateInputRef.current?.showPicker?.(); }}
                aria-label={t('app.transaction.form.date')}
            >
                <span className="tx-date-icon">📅</span>
                <span>{formatDisplayDate(fields.date)}</span>
                <input
                    ref={dateInputRef}
                    type="date"
                    value={fields.date}
                    onChange={(e) => setDate(e.target.value)}
                    className="tx-date-hidden-input"
                    tabIndex={-1}
                    aria-hidden="true"
                />
            </div>
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
