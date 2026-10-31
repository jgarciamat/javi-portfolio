import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { parseDecimal } from '@shared/utils/numbers';
import type { Account } from '../../domain/types';
import { nextMonths, paymentWarnings, type PaymentForm } from '../../domain/assetForm';

interface Props {
  form: PaymentForm;
  onChange: (form: PaymentForm) => void;
  /** Accounts the money can come out of (any type, crypto too). */
  accounts: Account[];
  /** What is owed now and the yearly rate, for the warnings. */
  owed: number;
  rate: number | null;
  /** A new payment can choose its first month; an existing one keeps its history. */
  withStart: boolean;
}

/** «How you pay it»: the monthly amount, the day, the account and, optionally, how many are left. */
export function DebtPaymentFields({ form, onChange, accounts, owed, rate, withStart }: Props) {
  const { t } = useI18n();
  const { monthYear, money } = useFormat();
  const set = <K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) =>
    onChange({ ...form, [key]: value });
  const selectable = accounts.filter((a) => !a.archived);
  const fallback = selectable.find((a) => a.isDefault) ?? selectable[0];
  const warnings = paymentWarnings(owed, rate, parseDecimal(form.amount));

  return (
    <>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.assets.payment.amount')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.assets.payment.day')}</span>
          <input
            className="tx-input"
            inputMode="numeric"
            maxLength={2}
            value={form.day}
            onChange={(e) => set('day', e.target.value)}
          />
        </label>
        {fallback && (
          <label className="field">
            <span className="field-label">{t('app.assets.payment.account')}</span>
            <select
              className="tx-input"
              value={form.accountId || fallback.id}
              onChange={(e) => set('accountId', e.target.value)}
            >
              {selectable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name} ({money(a.balance)})
                </option>
              ))}
            </select>
          </label>
        )}
        {withStart && (
          <label className="field">
            <span className="field-label">{t('app.assets.payment.start')}</span>
            <select
              className="tx-input"
              value={form.start}
              onChange={(e) => set('start', e.target.value)}
            >
              <option value="">{t('app.assets.payment.startNext')}</option>
              {nextMonths(new Date()).map((m) => (
                <option key={m.value} value={m.value}>
                  {monthYear(m.year, m.month)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span className="field-label">
            {t(withStart ? 'app.assets.payment.instalments' : 'app.assets.payment.instalmentsKeep')}
          </span>
          <input
            className="tx-input"
            inputMode="numeric"
            maxLength={3}
            value={form.instalments}
            onChange={(e) => set('instalments', e.target.value)}
          />
        </label>
      </div>
      <p className="section-hint">{t('app.assets.payment.hint')}</p>
      {warnings.length > 0 && (
        <div aria-live="polite">
          {warnings.map((w) => (
            <p key={w} className="debt-warning" role="note">
              {t(w)}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
