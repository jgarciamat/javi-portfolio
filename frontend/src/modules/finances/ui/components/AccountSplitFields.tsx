import { useId } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { Icon } from '@shared/components/Icon';
import type { Account } from '@modules/finances/domain/types';
import {
  MAX_SPLITS,
  addSplitRow,
  removeSplitRow,
  setSplitAccount,
  setSplitAmount,
  splitEqually,
  splitError,
  splitRemaining,
  toggleSplit,
  type SplitForm,
} from '@modules/finances/domain/accountSplit';
import '../css/AccountSplitFields.css';

export interface AccountSplitFieldsProps {
  split: SplitForm;
  onChange: (split: SplitForm) => void;
  /** The amount being split, as typed. */
  total: string;
  /** Accounts that can be chosen (the active ones, and any the split already uses). */
  accounts: Account[];
  /** The account chosen before splitting: the first part starts there. */
  accountId: string | null;
}

/** How the split stands: what is left, what is over, or that it adds up. */
function SplitStatus({ split, total }: { split: SplitForm; total: string }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const left = splitRemaining(total, split.rows);
  const error = splitError(split, total);
  const text = !error
    ? `✓ ${t('app.accountSplit.ok', { amount: money(splitRemaining(total, []) / 100) })}`
    : left > 0
      ? t('app.accountSplit.missing', { amount: money(left / 100) })
      : left < 0
        ? t('app.accountSplit.over', { amount: money(-left / 100) })
        : t(error);
  return (
    <p
      className={`acct-split-status ${error ? 'acct-split-status--pending' : 'acct-split-status--ok'}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}

/**
 * «Dividir entre varias cuentas»: a switch, and then a row per account with its amount, a button
 * to add another account and one to split it equally. The last row takes what is left until the
 * person types in it; a line under the rows says, in red or green, whether it adds up.
 */
export function AccountSplitFields({
  split,
  onChange,
  total,
  accounts,
  accountId,
}: AccountSplitFieldsProps) {
  const { t } = useI18n();
  const id = useId();
  const canAdd = split.rows.length < Math.min(MAX_SPLITS, accounts.length);
  return (
    <fieldset className="acct-split-fieldset">
      <legend className="acct-split-legend">{t('app.accountSplit.legend')}</legend>
      <label className="acct-split-toggle">
        <input
          type="checkbox"
          role="switch"
          checked={split.on}
          onChange={(e) =>
            onChange(toggleSplit(split, e.target.checked, total, accounts, accountId))
          }
          aria-describedby={`${id}-hint`}
        />
        <span>{t('app.accountSplit.toggle')}</span>
      </label>
      <small id={`${id}-hint`} className="acct-split-hint">
        {t('app.accountSplit.hint')}
      </small>
      {split.on && (
        <>
          <ol className="acct-split-rows">
            {split.rows.map((row, i) => {
              const n = i + 1;
              return (
                <li key={i} className="acct-split-row">
                  <select
                    className="tx-input acct-split-account"
                    value={row.accountId}
                    onChange={(e) => onChange(setSplitAccount(split, i, e.target.value))}
                    aria-label={t('app.accountSplit.account', { n })}
                  >
                    <option value="">—</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="tx-input acct-split-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={(e) => onChange(setSplitAmount(split, i, e.target.value, total))}
                    aria-label={t('app.accountSplit.amount', { n })}
                  />
                  <button
                    type="button"
                    className="btn-secondary acct-split-remove"
                    onClick={() => onChange(removeSplitRow(split, i, total))}
                    disabled={split.rows.length <= 2}
                    aria-label={t('app.accountSplit.remove', { n })}
                    title={t('app.accountSplit.remove', { n })}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="acct-split-actions">
            <button
              type="button"
              className="btn-secondary acct-split-action"
              onClick={() => onChange(addSplitRow(split, total, accounts))}
              disabled={!canAdd}
            >
              <Icon name="plus" /> {t('app.accountSplit.add')}
            </button>
            <button
              type="button"
              className="btn-secondary acct-split-action"
              onClick={() => onChange(splitEqually(split, total))}
            >
              {t('app.accountSplit.equal')}
            </button>
          </div>
          <SplitStatus split={split} total={total} />
        </>
      )}
    </fieldset>
  );
}
