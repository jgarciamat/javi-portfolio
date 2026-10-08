import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import type { Account, Category, CreateTransactionDTO } from '@modules/finances/domain/types';
import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import { TransactionFormFields } from './TransactionFormFields';
import '../css/TransactionForm.css';

export interface TransactionFormProps {
  categories: Category[];
  onSubmit: (dto: CreateTransactionDTO) => Promise<void>;
  onManageCategories: () => void;
  /** Carry-over + month balance: a saving cannot exceed it. */
  availableBalance: number;
  /** Date preselected for new movements (inside the viewed period). */
  defaultDate: string;
  accounts: Account[];
}

/** Collapsible "new movement" form of the month view. */
export function TransactionForm({
  categories,
  onSubmit,
  onManageCategories,
  availableBalance,
  defaultDate,
  accounts,
}: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { money } = useFormat();
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? null;
  const form = useTransactionForm({
    availableBalance,
    onSubmit,
    defaultDate,
    defaultAccountId,
    formatMoney: money,
    t,
  });

  return (
    <CollapsiblePanel
      title={<>➕ {t('app.transaction.form.title')}</>}
      tourId="new-transaction"
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <form
        onSubmit={async (e) => {
          if (await form.handleSubmit(e)) setOpen(false);
        }}
        className="tx-form"
        noValidate
      >
        <TransactionFormFields
          form={form}
          categories={categories}
          onManageCategories={onManageCategories}
          accounts={accounts}
        />
        {form.error && (
          <p className="inline-error" role="alert">
            {form.error}
          </p>
        )}
        <div className="tx-form-actions">
          <button type="submit" className="btn-primary" disabled={form.loading}>
            {form.loading ? t('app.transaction.form.saving') : t('app.transaction.form.save')}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              form.reset();
              setOpen(false);
            }}
            disabled={form.loading}
          >
            {t('app.transaction.form.cancel')}
          </button>
        </div>
      </form>
    </CollapsiblePanel>
  );
}
