import { useEffect, useId, useRef } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { DateField } from '@shared/components/DateField';
import type { Account, Category, TransactionType } from '@modules/finances/domain/types';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import {
  MANAGE_CATEGORIES,
  type CheckedField,
  type UseTransactionFormReturn,
} from '../../application/hooks/useTransactionForm';
import { CurrencyConverter } from './CurrencyConverter';
import { ReceiptScanner } from './ReceiptScanner';

export interface TransactionFormFieldsProps {
  form: UseTransactionFormReturn;
  categories: Category[];
  onManageCategories: () => void;
  /** The account selector is shown only when the user has more than one active account. */
  accounts: Account[];
}

/** The account the movement belongs to (shown only when there is more than one to choose from). */
function AccountField({ form, accounts }: { form: UseTransactionFormReturn; accounts: Account[] }) {
  const { t } = useI18n();
  return (
    <div className="tx-field">
      <span className="tx-field-label" aria-hidden="true">
        {t('app.transaction.form.account')}
      </span>
      <select
        className="tx-input"
        value={form.fields.accountId ?? ''}
        onChange={(e) => form.setAccountId(e.target.value)}
        aria-label={t('app.transaction.form.account')}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Fields shared by the "new movement" form and the edit dialog. */
export function TransactionFormFields({
  form,
  categories,
  onManageCategories,
  accounts,
}: TransactionFormFieldsProps) {
  const { t, tCategory } = useI18n();
  const { fields, invalid } = form;
  // An archived account stays selectable for the movements that already use it.
  const selectable = accounts.filter((a) => !a.archived || a.id === fields.accountId);
  const id = useId();
  const refs = {
    description: useRef<HTMLInputElement>(null),
    amount: useRef<HTMLInputElement>(null),
    category: useRef<HTMLSelectElement>(null),
  };
  /** Marks a field the last submit refused and points it at the error text. */
  const check = (field: CheckedField) =>
    invalid.includes(field)
      ? { 'aria-invalid': true, 'aria-describedby': form.errorId }
      : { 'aria-invalid': undefined, 'aria-describedby': undefined };

  // The category has its own message, right under it.
  const categoryMissing = invalid.includes('category');
  const categoryCheck = categoryMissing
    ? { 'aria-invalid': true, 'aria-describedby': `${id}-category-error ${form.errorId}` }
    : { 'aria-invalid': undefined, 'aria-describedby': undefined };

  // A refused submit takes focus to the first wrong field.
  useEffect(() => {
    if (invalid.length > 0) refs[invalid[0]].current!.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalid]);

  return (
    <div className="tx-form-grid">
      <div className="tx-form-row tx-form-row--main">
        <div className="tx-field">
          <label className="tx-field-label" htmlFor={`${id}-description`}>
            {t('app.transaction.form.description')}
          </label>
          <input
            ref={refs.description}
            id={`${id}-description`}
            className="tx-input"
            value={fields.description}
            onChange={(e) => form.setDescription(e.target.value)}
            maxLength={200}
            required
            {...check('description')}
          />
        </div>
        <div className="tx-field">
          <label className="tx-field-label" htmlFor={`${id}-amount`}>
            {t('app.transaction.form.amount')}
          </label>
          <input
            ref={refs.amount}
            id={`${id}-amount`}
            className="tx-input"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={fields.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            required
            {...check('amount')}
          />
        </div>
      </div>
      <div className="tx-form-row">
        <div className="tx-field">
          <span className="tx-field-label" aria-hidden="true">
            {t('app.transaction.form.type')}
          </span>
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
        </div>
        <div className="tx-field">
          <label className="tx-field-label" htmlFor={`${id}-category`}>
            {t('app.transaction.form.category')}
          </label>
          <select
            ref={refs.category}
            id={`${id}-category`}
            className="tx-input"
            value={fields.category}
            onChange={(e) => form.handleCategoryChange(e.target.value, onManageCategories)}
            required
            {...categoryCheck}
          >
            <option value="">{t('app.transaction.form.category.placeholder')}</option>
            <option value={MANAGE_CATEGORIES}>⚙ {t('app.transaction.form.category.manage')}</option>
            <option disabled>──────────────</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {tCategory(c.name)}
              </option>
            ))}
          </select>
          {/* Said next to the field, not only at the end of the form. */}
          {categoryMissing && (
            <small id={`${id}-category-error`} className="inline-error">
              {t('app.transaction.form.categoryRequired')}
            </small>
          )}
          {!categoryMissing && form.suggested && (
            <small className="tx-field-hint">{t('app.transaction.form.categorySuggested')}</small>
          )}
        </div>
        <div className="tx-field">
          <span className="tx-field-label" aria-hidden="true">
            {t('app.transaction.form.date')}
          </span>
          <DateField
            value={fields.date}
            onChange={form.setDate}
            label={t('app.transaction.form.date')}
          />
        </div>
        {selectable.length > 1 && <AccountField form={form} accounts={selectable} />}
      </div>
      <div className="tx-field tx-field--notes">
        <label className="tx-field-label" htmlFor={`${id}-notes`}>
          {t('app.transaction.form.notes')}
        </label>
        <textarea
          id={`${id}-notes`}
          className="tx-input tx-notes-input"
          value={fields.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </div>
      <div className="tx-tools">
        <ReceiptScanner
          onScanned={(r) => {
            if (r.merchant && !fields.description.trim()) form.setDescription(r.merchant);
            if (r.total !== null) form.setAmount(String(r.total));
            if (r.date) form.setDate(r.date);
          }}
        />
        <CurrencyConverter form={form} />
      </div>
    </div>
  );
}
