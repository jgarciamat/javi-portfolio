import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import type {
  Account,
  Category,
  Transaction,
  UpdateTransactionDTO,
} from '@modules/finances/domain/types';
import { txDayKey } from '@modules/finances/domain/transactionGrouping';
import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import { TransactionFormFields } from './TransactionFormFields';
import '../css/TransactionForm.css';
import '../css/EditTransactionModal.css';

export interface EditTransactionModalProps {
  transaction: Transaction;
  categories: Category[];
  /** Saves and closes the dialog (the caller unmounts it). */
  onSave: (id: string, dto: UpdateTransactionDTO) => Promise<void>;
  onClose: () => void;
  onManageCategories: () => void;
  availableBalance: number;
  accounts: Account[];
}

export function EditTransactionModal({
  transaction,
  categories,
  onSave,
  onClose,
  onManageCategories,
  availableBalance,
  accounts,
}: EditTransactionModalProps) {
  const { t } = useI18n();
  const { money } = useFormat();
  const form = useTransactionForm({
    // Editing a saving: its own amount is already counted in the available balance.
    availableBalance:
      transaction.type === 'SAVING' ? availableBalance + transaction.amount : availableBalance,
    formatMoney: money,
    t,
    defaultDate: txDayKey(transaction.date),
    onSubmit: (dto) => onSave(transaction.id, dto),
    initialValues: {
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      date: txDayKey(transaction.date),
      notes: transaction.notes ?? '',
      accountId: transaction.accountId ?? null,
    },
  });

  return (
    <Modal
      label={t('app.transaction.edit.title')}
      onClose={onClose}
      dismissible={!form.loading}
      overlayClassName="edit-tx-overlay"
      className="edit-tx-modal"
    >
      <div className="edit-tx-modal-header">
        <h2 className="edit-tx-modal-title">✏️ {t('app.transaction.edit.title')}</h2>
        <button
          className="edit-tx-modal-close"
          onClick={onClose}
          aria-label={t('app.transaction.form.cancel')}
        >
          ✕
        </button>
      </div>
      <form onSubmit={form.handleSubmit} className="tx-form" noValidate>
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
        <div className="edit-tx-modal-actions">
          <button type="submit" className="btn-primary" disabled={form.loading}>
            {form.loading ? t('app.transaction.form.saving') : t('app.transaction.edit.save')}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={form.loading}>
            {t('app.transaction.form.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
