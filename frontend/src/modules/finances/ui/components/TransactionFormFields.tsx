import { useI18n } from '@core/i18n/I18nContext';
import { DateField } from '@shared/components/DateField';
import type { Account, Category, TransactionType } from '@modules/finances/domain/types';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import {
  MANAGE_CATEGORIES,
  type UseTransactionFormReturn,
} from '../../application/hooks/useTransactionForm';

export interface TransactionFormFieldsProps {
  form: UseTransactionFormReturn;
  categories: Category[];
  onManageCategories: () => void;
  /** The account selector is shown only when the user has more than one active account. */
  accounts: Account[];
}

/** Fields shared by the "new movement" form and the edit dialog. */
export function TransactionFormFields({
  form,
  categories,
  onManageCategories,
  accounts,
}: TransactionFormFieldsProps) {
  const { t, tCategory } = useI18n();
  const { fields } = form;
  // An archived account stays selectable for the movements that already use it.
  const selectable = accounts.filter((a) => !a.archived || a.id === fields.accountId);

  return (
    <div className="tx-form-grid">
      <input
        className="tx-input"
        placeholder={t('app.transaction.form.description')}
        aria-label={t('app.transaction.form.description')}
        value={fields.description}
        onChange={(e) => form.setDescription(e.target.value)}
        maxLength={200}
        required
      />
      <input
        className="tx-input"
        type="number"
        placeholder={t('app.transaction.form.amount')}
        aria-label={t('app.transaction.form.amount')}
        min="0.01"
        step="0.01"
        inputMode="decimal"
        value={fields.amount}
        onChange={(e) => form.setAmount(e.target.value)}
        required
      />
      <select
        className="tx-input"
        value={fields.type}
        onChange={(e) => form.setType(e.target.value as TransactionType)}
        aria-label={t('app.transaction.form.type')}
      >
        {TRANSACTION_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(TYPE_LABEL_KEYS[type])}
          </option>
        ))}
      </select>
      <select
        className="tx-input"
        value={fields.category}
        onChange={(e) => form.handleCategoryChange(e.target.value, onManageCategories)}
        aria-label={t('app.transaction.form.category.placeholder')}
        required
      >
        <option value="">{t('app.transaction.form.category.placeholder')}</option>
        <option value={MANAGE_CATEGORIES}>⚙️ {t('app.transaction.form.category.manage')}</option>
        <option disabled>──────────────</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.icon} {tCategory(c.name)}
          </option>
        ))}
      </select>
      <DateField
        value={fields.date}
        onChange={form.setDate}
        label={t('app.transaction.form.date')}
      />
      {selectable.length > 1 && (
        <select
          className="tx-input"
          value={fields.accountId ?? ''}
          onChange={(e) => form.setAccountId(e.target.value)}
          aria-label={t('app.transaction.form.account')}
        >
          {selectable.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
      )}
      <textarea
        className="tx-input tx-notes-input"
        placeholder={t('app.transaction.form.notes')}
        aria-label={t('app.transaction.form.notes')}
        value={fields.notes}
        onChange={(e) => form.setNotes(e.target.value)}
        maxLength={500}
        rows={2}
      />
    </div>
  );
}
