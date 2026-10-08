import { useState } from 'react';
import { parseDecimal } from '@shared/utils/numbers';
import type { Account, AccountType } from '@modules/finances/domain/types';
import { useAccounts } from '../../application/hooks/useAccounts';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { todayDateOnly } from '@shared/utils/format';
import '../css/Sections.css';

const ACCOUNT_TYPES: { value: AccountType; icon: string }[] = [
  { value: 'checking', icon: '🏦' },
  { value: 'savings', icon: '🐷' },
  { value: 'cash', icon: '💵' },
  { value: 'card', icon: '💳' },
  { value: 'investment', icon: '📈' },
  { value: 'other', icon: '📦' },
];

function AccountForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Account;
  onSubmit: (input: {
    name: string;
    type: AccountType;
    initialBalance: number;
  }) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AccountType>(initial?.type ?? 'checking');
  const [initialBalance, setInitialBalance] = useState(String(initial?.initialBalance ?? ''));
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        const ok = await onSubmit({
          name: name.trim(),
          type,
          initialBalance: parseDecimal(initialBalance) || 0,
        });
        setSaving(false);
        if (ok && !initial) {
          setName('');
          setInitialBalance('');
        }
      }}
    >
      <input
        className="tx-input"
        placeholder={t('app.accounts.name')}
        aria-label={t('app.accounts.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        required
      />
      <select
        className="tx-input"
        value={type}
        onChange={(e) => setType(e.target.value as AccountType)}
        aria-label={t('app.accounts.typeLabel')}
      >
        {ACCOUNT_TYPES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.icon} {t(`app.accounts.type.${o.value}`)}
          </option>
        ))}
      </select>
      <input
        className="tx-input"
        type="number"
        step="0.01"
        inputMode="decimal"
        placeholder={t('app.accounts.initialBalance')}
        aria-label={t('app.accounts.initialBalance')}
        value={initialBalance}
        onChange={(e) => setInitialBalance(e.target.value)}
      />
      <div className="inline-form-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {initial ? t('app.common.save') : t('app.accounts.add')}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('app.common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}

function TransferForm({
  accounts,
  onSubmit,
}: {
  accounts: Account[];
  onSubmit: (input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description: string;
  }) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const active = accounts.filter((a) => !a.archived);
  const [fromChoice, setFrom] = useState('');
  const [toChoice, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayDateOnly);
  const [description, setDescription] = useState('');
  // Accounts may arrive after the first render: default to the first two active ones.
  const isActive = (id: string) => active.some((a) => a.id === id);
  const from = isActive(fromChoice) ? fromChoice : active[0]?.id ?? '';
  const to = isActive(toChoice) ? toChoice : active.find((a) => a.id !== from)?.id ?? '';

  if (active.length < 2)
    return <p className="section-hint">{t('app.accounts.transferNeedsTwo')}</p>;

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onSubmit({
          fromAccountId: from,
          toAccountId: to,
          amount: parseDecimal(amount),
          date,
          description,
        });
        if (ok) {
          setAmount('');
          setDescription('');
        }
      }}
    >
      <select
        className="tx-input"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        aria-label={t('app.accounts.from')}
      >
        {active.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name}
          </option>
        ))}
      </select>
      <select
        className="tx-input"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        aria-label={t('app.accounts.to')}
      >
        {active.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name}
          </option>
        ))}
      </select>
      <input
        className="tx-input"
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        placeholder={t('app.transaction.form.amount')}
        aria-label={t('app.transaction.form.amount')}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <input
        className="tx-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label={t('app.transaction.form.date')}
        required
      />
      <input
        className="tx-input"
        placeholder={t('app.accounts.transferNote')}
        aria-label={t('app.accounts.transferNote')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={200}
      />
      <div className="inline-form-actions">
        <button type="submit" className="btn-primary" disabled={from === to || !amount}>
          {t('app.accounts.transfer')}
        </button>
      </div>
    </form>
  );
}

function AccountRow({
  account: a,
  onEdit,
  onMakeDefault,
  onToggleArchive,
  onDelete,
}: {
  account: Account;
  onEdit: () => void;
  onMakeDefault: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const archiveLabel = a.archived ? t('app.accounts.unarchive') : t('app.accounts.archive');
  return (
    <>
      <span className="entity-icon">{a.icon}</span>
      <div className="entity-main">
        <span className="entity-name">
          {a.name}
          {a.isDefault && <span className="pill">{t('app.accounts.default')}</span>}
          {a.archived && <span className="pill pill--muted">{t('app.accounts.archived')}</span>}
        </span>
        <span className="entity-sub">{t(`app.accounts.type.${a.type}`)}</span>
      </div>
      <span className={`entity-amount ${a.balance < 0 ? 'amount-neg' : ''}`}>
        {money(a.balance)}
      </span>
      <div className="entity-actions">
        <button
          className="icon-btn"
          onClick={onEdit}
          title={t('app.common.edit')}
          aria-label={`${t('app.common.edit')} ${a.name}`}
        >
          ✏️
        </button>
        {!a.isDefault && !a.archived && (
          <button
            className="icon-btn"
            onClick={onMakeDefault}
            title={t('app.accounts.makeDefault')}
            aria-label={t('app.accounts.makeDefault')}
          >
            ⭐
          </button>
        )}
        {!a.isDefault && (
          <>
            <button
              className="icon-btn"
              onClick={onToggleArchive}
              title={archiveLabel}
              aria-label={archiveLabel}
            >
              {a.archived ? '♻️' : '🗄️'}
            </button>
            <button
              className="icon-btn"
              onClick={onDelete}
              title={t('app.common.delete')}
              aria-label={`${t('app.common.delete')} ${a.name}`}
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </>
  );
}

export function AccountsView() {
  const { t } = useI18n();
  const { money, date } = useFormat();
  const acc = useAccounts();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="section-view">
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">🏦 {t('app.accounts.title')}</h2>
          <span className="section-total">{money(acc.total)}</span>
        </div>
        <p className="section-hint">{t('app.accounts.hint')}</p>
        {acc.error && <p className="form-error">{acc.error}</p>}
        <ul className="entity-list">
          {acc.accounts.map((a) => (
            <li key={a.id} className={`entity-item${a.archived ? ' entity-item--muted' : ''}`}>
              {editingId === a.id ? (
                <AccountForm
                  initial={a}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (input) => {
                    const ok = await acc.update(a.id, input);
                    if (ok) setEditingId(null);
                    return ok;
                  }}
                />
              ) : (
                <AccountRow
                  account={a}
                  onEdit={() => setEditingId(a.id)}
                  onMakeDefault={() => acc.setDefault(a.id)}
                  onToggleArchive={() => acc.update(a.id, { archived: !a.archived })}
                  onDelete={() => acc.remove(a.id)}
                />
              )}
            </li>
          ))}
        </ul>
        <h3 className="subsection-title">➕ {t('app.accounts.new')}</h3>
        <AccountForm onSubmit={(input) => acc.create(input)} />
      </div>

      <div className="card">
        <h2 className="section-title">🔁 {t('app.accounts.transfers')}</h2>
        <TransferForm accounts={acc.accounts} onSubmit={(input) => acc.createTransfer(input)} />
        {acc.transfers.length > 0 && (
          <ul className="entity-list">
            {acc.transfers.map((tr) => (
              <li key={tr.id} className="entity-item">
                <span className="entity-icon">🔁</span>
                <div className="entity-main">
                  <span className="entity-name">
                    {tr.fromAccountName} → {tr.toAccountName}
                  </span>
                  <span className="entity-sub">
                    {date(tr.date)}
                    {tr.description ? ` · ${tr.description}` : ''}
                  </span>
                </div>
                <span className="entity-amount">{money(tr.amount)}</span>
                <div className="entity-actions">
                  <button
                    className="icon-btn"
                    onClick={() => acc.deleteTransfer(tr.id)}
                    title={t('app.common.delete')}
                    aria-label={`${t('app.common.delete')}: ${tr.fromAccountName} → ${
                      tr.toAccountName
                    }`}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
