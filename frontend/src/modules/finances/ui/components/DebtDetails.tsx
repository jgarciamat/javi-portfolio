import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Modal } from '@shared/components/Modal';
import '@shared/components/css/ConfirmDeleteModal.css';
import type { Account, Asset, DebtPaymentInput } from '../../domain/types';
import {
  debtProgress,
  emptyPayment,
  paymentResult,
  type PaymentForm,
} from '../../domain/assetForm';
import { DebtPaymentFields } from './DebtPaymentFields';

interface ConfirmProps {
  title: string;
  message: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** «Are you sure?» before something that changes the coming payments. */
export function ConfirmModal({ title, message, confirm, onConfirm, onCancel }: ConfirmProps) {
  const { t } = useI18n();
  return (
    <Modal
      label={title}
      onClose={onCancel}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <h2 className="confirm-delete-title">{title}</h2>
      <p className="confirm-delete-message">{message}</p>
      <div className="confirm-delete-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} autoFocus>
          {t('app.assets.debt.cancel')}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </Modal>
  );
}

/** Paid off, paused or when the next payment is. */
function PaymentState({ debt }: { debt: Asset }) {
  const { t } = useI18n();
  const { date } = useFormat();
  const payment = debt.payment!;
  if (debt.paidOff) return <p className="section-success">{t('app.assets.debt.paidOff')}</p>;
  if (!payment.active) {
    return (
      <p className="debt-warning" role="note">
        {t('app.assets.debt.paused')}
      </p>
    );
  }
  return payment.nextDate ? (
    <p>{t('app.assets.debt.next', { date: date(payment.nextDate) })}</p>
  ) : null;
}

/** About how many payments are left, and until when. */
function Remaining({ debt }: { debt: Asset }) {
  const { t } = useI18n();
  const { monthYear } = useFormat();
  const { remainingPayments: count, endYear, endMonth } = debt.payment!;
  if (debt.paidOff || !count) return null;
  return (
    <p>
      {endYear !== null && endMonth !== null
        ? t('app.assets.debt.remainingUntil', { count, date: monthYear(endYear, endMonth) })
        : t('app.assets.debt.remaining', { count })}
    </p>
  );
}

/** How much of what was borrowed is paid. */
function Progress({ debt }: { debt: Asset }) {
  const { t } = useI18n();
  const { money, percent } = useFormat();
  const progress = debtProgress(debt);
  if (progress === null) return null;
  return (
    <>
      <div
        className="progress-track debt-progress"
        role="progressbar"
        aria-label={t('app.assets.debt.progressOf', { name: debt.name })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <small>
        {t('app.assets.debt.progress', {
          percent: percent(progress * 100, 0),
          initial: money(debt.initialValue as number),
        })}
      </small>
    </>
  );
}

/** Where a debt paid every month stands: payment, next one, account, progress and time left. */
function PaymentSummary({ debt, accounts }: { debt: Asset; accounts: Account[] }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const payment = debt.payment!;
  const account = accounts.find((a) => a.id === payment.accountId);
  return (
    <div className="debt-summary">
      <p>
        {t('app.assets.debt.payment', { amount: money(payment.amount), day: payment.day })}
        {account && (
          <> · {t('app.assets.debt.account', { name: `${account.icon} ${account.name}` })}</>
        )}
      </p>
      <PaymentState debt={debt} />
      <Remaining debt={debt} />
      {!payment.coversInterest && (
        <p className="debt-warning" role="note">
          {t('app.assets.debt.never')}
        </p>
      )}
      <Progress debt={debt} />
      {payment.paid > 0 && (
        <small>{t('app.assets.debt.paidSoFar', { amount: money(payment.paid) })}</small>
      )}
    </div>
  );
}

const formOf = (debt: Asset): PaymentForm =>
  debt.payment
    ? {
        ...emptyPayment(debt.payment.accountId ?? ''),
        amount: String(debt.payment.amount),
        day: String(debt.payment.day),
      }
    : emptyPayment();

interface Props {
  debt: Asset;
  accounts: Account[];
  pending: boolean;
  /** Resolves true when it was saved. */
  onSave: (payment: DebtPaymentInput | null) => Promise<boolean>;
}

/** A debt's monthly payment: what it is, and changing, adding or stopping it. */
export function DebtDetails({ debt, accounts, pending, onSave }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [form, setForm] = useState<PaymentForm>(() => formOf(debt));
  const [error, setError] = useState<string | null>(null);
  const hasPayment = !!debt.payment;

  const open = () => {
    setForm(formOf(debt));
    setError(null);
    setEditing(true);
  };
  const save = async () => {
    const result = paymentResult(form, hasPayment);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    if (await onSave(result.payment)) setEditing(false);
  };
  const stop = async () => {
    setStopping(false);
    if (await onSave(null)) setEditing(false);
  };

  return (
    <div className="debt-details">
      {hasPayment && <PaymentSummary debt={debt} accounts={accounts} />}
      {editing ? (
        <div className="debt-editor">
          <DebtPaymentFields
            form={form}
            onChange={(f) => {
              setForm(f);
              setError(null);
            }}
            accounts={accounts}
            owed={debt.value}
            rate={debt.interestRate}
            withStart={!hasPayment}
          />
          {error && (
            <p className="form-error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => void save()}
            >
              {t('app.assets.debt.save')}
            </button>
            {hasPayment && (
              <button
                type="button"
                className="btn-danger"
                disabled={pending}
                onClick={() => setStopping(true)}
              >
                {t('app.assets.debt.stop')}
              </button>
            )}
            <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
              {t('app.assets.debt.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-secondary"
          aria-label={t(hasPayment ? 'app.assets.debt.editOf' : 'app.assets.debt.addOf', {
            name: debt.name,
          })}
          onClick={open}
        >
          {t(hasPayment ? 'app.assets.debt.edit' : 'app.assets.debt.add')}
        </button>
      )}
      {stopping && (
        <ConfirmModal
          title={t('app.assets.debt.stopTitle', { name: debt.name })}
          message={t('app.assets.debt.stopMessage')}
          confirm={t('app.assets.debt.stop')}
          onConfirm={() => void stop()}
          onCancel={() => setStopping(false)}
        />
      )}
    </div>
  );
}
