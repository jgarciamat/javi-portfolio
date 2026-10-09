import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import type {
  Account,
  Category,
  CreateTransactionDTO,
  TransactionType,
} from '@modules/finances/domain/types';
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
  /** Opens the form for this type (app shortcut "add expense"); `onQuickAddDone` clears the request. */
  quickAdd: TransactionType | null;
  onQuickAddDone: () => void;
}

/** Collapsible "new movement" form of the month view. */
export function TransactionForm({
  categories,
  onSubmit,
  onManageCategories,
  availableBalance,
  defaultDate,
  accounts,
  quickAdd,
  onQuickAddDone,
}: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
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

  const { setType } = form;
  useEffect(() => {
    if (!quickAdd) return;
    setType(quickAdd);
    setOpen(true);
    (anchor.current as HTMLDivElement).scrollIntoView({ block: 'start', behavior: 'smooth' });
    onQuickAddDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAdd]);

  return (
    <div ref={anchor} className="tx-form-anchor">
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
    </div>
  );
}
