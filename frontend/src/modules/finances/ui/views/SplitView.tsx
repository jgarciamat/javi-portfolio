import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { parseDecimal } from '@shared/utils/numbers';
import type { SplitGroup } from '@modules/finances/domain/types';
import { simplifyPayments } from '@modules/finances/domain/splitSimplify';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';
import { ExportButtons } from '../components/ExportButtons';

function NewGroup({
  onCreate,
}: {
  onCreate: (name: string, members: string[]) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [people, setPeople] = useState('');
  const members = people
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="card" data-tour="split-new">
      <h2 className="section-title">
        <Icon name="plus" /> {t('app.split.new')}
      </h2>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.split.groupName')}</span>
          <input
            className="tx-input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.split.people')}</span>
          <input
            className="tx-input"
            value={people}
            placeholder={t('app.split.peoplePlaceholder')}
            onChange={(e) => setPeople(e.target.value)}
          />
        </label>
      </div>
      <div className="button-row">
        <button
          className="btn-secondary"
          disabled={name.trim() === '' || members.length < 2}
          onClick={async () => {
            if (await onCreate(name.trim(), members)) {
              setName('');
              setPeople('');
            }
          }}
        >
          {t('app.split.create')}
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({
  group,
  onAdd,
}: {
  group: SplitGroup;
  onAdd: (e: {
    description: string;
    amount: number;
    paidBy: string;
    participants: string[];
  }) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [excluded, setExcluded] = useState<string[]>([]);
  const paidBy = payer || group.members[0].id;
  const value = parseDecimal(amount);
  const participants = group.members.map((m) => m.id).filter((id) => !excluded.includes(id));
  const valid = description.trim() !== '' && value > 0 && participants.length > 0;

  return (
    <div className="split-form">
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('app.split.what')}</span>
          <input
            className="tx-input"
            value={description}
            maxLength={100}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.split.amount')}</span>
          <input
            className="tx-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">{t('app.split.paidBy')}</span>
          <select className="tx-input" value={paidBy} onChange={(e) => setPayer(e.target.value)}>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="field-label split-shared-label">{t('app.split.sharedBy')}</p>
      <div className="split-people">
        {group.members.map((m) => (
          <label key={m.id} className="plan-terms split-person">
            <input
              type="checkbox"
              checked={!excluded.includes(m.id)}
              onChange={(e) =>
                setExcluded(
                  e.target.checked ? excluded.filter((id) => id !== m.id) : [...excluded, m.id]
                )
              }
            />
            <span>{m.name}</span>
          </label>
        ))}
      </div>
      <div className="button-row">
        <button
          className="btn-secondary"
          disabled={!valid}
          onClick={async () => {
            if (
              await onAdd({ description: description.trim(), amount: value, paidBy, participants })
            ) {
              setDescription('');
              setAmount('');
              setExcluded([]);
            }
          }}
        >
          {t('app.split.add')}
        </button>
      </div>
    </div>
  );
}

function SettleUp({
  group,
  onPay,
}: {
  group: SplitGroup;
  onPay: (payment: { from: string; to: string; amount: number }) => void;
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const [simplified, setSimplified] = useState(false);
  // Expenses only ever point to members of the group.
  const name = (memberId: string): string =>
    (group.members.find((m) => m.id === memberId) as { name: string }).name;

  if (group.transfers.length === 0) {
    return group.expenses.length > 0 ? (
      <p className="section-success">
        <Icon name="checkCircle" /> {t('app.split.allSettled')}
      </p>
    ) : null;
  }
  const best = simplifyPayments(group.members.map((m) => ({ id: m.id, balance: m.balance })));
  const payments = simplified ? best : group.transfers;
  return (
    <>
      <div className="split-settle-head">
        <h3 className="split-subtitle">
          {simplified ? `✨ ${t('app.split.simplified')}` : t('app.split.settleUp')}
        </h3>
        <button className="btn-secondary" onClick={() => setSimplified(!simplified)}>
          {simplified ? t('app.split.showOriginal') : t('app.split.simplify')}
        </button>
      </div>
      {simplified && (
        <p className="split-simplify-note">
          {best.length < group.transfers.length
            ? t('app.split.simplifiedNote', { n: best.length, m: group.transfers.length })
            : t('app.split.alreadyMinimal', { n: best.length })}
        </p>
      )}
      <ul className="split-transfers">
        {payments.map((tr) => (
          <li key={`${tr.from}-${tr.to}`}>
            <span className="split-transfer-text">
              {t('app.split.pays', {
                from: name(tr.from),
                to: name(tr.to),
                amount: money(tr.amount),
              })}
            </span>
            <button className="btn-secondary" onClick={() => onPay(tr)}>
              {t('app.split.registerPayment')}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function GroupDetail({
  id,
  onBack,
  onRemoved,
}: {
  id: string;
  onBack: () => void;
  onRemoved: () => void;
}) {
  const { splitApi } = useApi();
  const { t } = useI18n();
  const { money, date, currency } = useFormat();
  const action = useAction();
  const { data: group, setData } = useResource(() => splitApi.get(id), [splitApi, id]);
  if (!group) return <div className="card">{t('app.common.loading')}</div>;
  // Expenses only ever point to members of the group.
  const name = (memberId: string): string =>
    (group.members.find((m) => m.id === memberId) as { name: string }).name;
  const update = (job: () => Promise<SplitGroup>) => action.run(async () => setData(await job()));
  /** One row per expense or payment, with what each member pays of it. */
  const table = () => ({
    head: [
      t('app.export.csv.date'),
      t('app.export.csv.description'),
      t('app.split.export.paidBy'),
      `${t('app.export.csv.amount')} (${currency})`,
      ...group.members.map((m) => `${m.name} (${currency})`),
    ],
    rows: group.expenses.map((e) => [
      e.date.slice(0, 10),
      e.settlement ? t('app.split.payment') : e.description,
      name(e.paidBy),
      e.amount,
      ...group.members.map((m) => e.shares.find((sh) => sh.memberId === m.id)?.share ?? 0),
    ]),
  });

  return (
    <>
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">
            <Icon name="handshake" /> {group.name}
          </h2>
          <button type="button" className="back-btn" onClick={onBack}>
            ← {t('app.split.back')}
          </button>
        </div>
        {action.error && <p className="form-error">{action.error}</p>}
        <ul className="split-balances">
          {group.members.map((m) => (
            <li key={m.id} className={m.balance < 0 ? 'owes' : m.balance > 0 ? 'owed' : undefined}>
              <span className="split-avatar" aria-hidden="true" data-initial={m.name.charAt(0)} />
              <span className="split-name">{m.name}</span>
              <strong
                className={m.balance < 0 ? 'amount-neg' : m.balance > 0 ? 'amount-pos' : undefined}
              >
                {money(m.balance)}
              </strong>
            </li>
          ))}
        </ul>
        <SettleUp group={group} onPay={(p) => void update(() => splitApi.settle(id, p))} />
      </div>
      <div className="card">
        <h2 className="section-title">
          <Icon name="receipt" /> {t('app.split.expenses')}
        </h2>
        <ExportButtons
          name="gastos-compartidos"
          what={t('app.split.expenses')}
          count={group.expenses.length}
          table={table}
          pdf
        />
        <ExpenseForm group={group} onAdd={(e) => update(() => splitApi.addExpense(id, e))} />
        {group.expenses.length > 0 && (
          <ul className="split-expenses">
            {group.expenses.map((e) => (
              <li key={e.id} className={e.settlement ? 'settlement' : undefined}>
                <span>
                  <strong>{e.settlement ? t('app.split.payment') : e.description}</strong>
                  <small>
                    {date(e.date)} ·{' '}
                    {e.settlement
                      ? t('app.split.paysShort', {
                          from: name(e.paidBy),
                          to: name(e.shares[0].memberId),
                        })
                      : t('app.split.paidByShort', { name: name(e.paidBy) })}
                  </small>
                </span>
                <span className="split-expense-end">
                  <b className="split-expense-amount">{money(e.amount)}</b>
                  <button
                    className="btn-secondary"
                    aria-label={t('app.split.removeExpense', { name: e.description })}
                    onClick={() => void update(() => splitApi.removeExpense(id, e.id))}
                  >
                    <Icon name="trash" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card split-danger">
        <button
          className="btn-secondary split-delete"
          onClick={() => {
            if (window.confirm(t('app.split.deleteConfirm', { name: group.name }))) {
              void action.run(async () => {
                await splitApi.remove(id);
                onRemoved();
              });
            }
          }}
        >
          <Icon name="trash" /> {t('app.split.delete')}
        </button>
      </div>
    </>
  );
}

/** Expenses shared with friends or flatmates: who paid, how it is split and who owes whom. */
export function SplitView() {
  const { splitApi } = useApi();
  const { t } = useI18n();
  const action = useAction();
  const { data: groups, reload } = useResource(() => splitApi.list(), [splitApi], { initial: [] });
  const [open, setOpen] = useState<string | null>(null);

  if (open) {
    return (
      <div className="section-view">
        <GroupDetail
          id={open}
          onBack={() => setOpen(null)}
          onRemoved={() => {
            setOpen(null);
            void reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="handshake" /> {t('app.split.title')}
        </h2>
        <p className="section-hint">{t('app.split.hint')}</p>
        {action.error && <p className="form-error">{action.error}</p>}
        {groups.length === 0 ? (
          <p className="empty-block">{t('app.split.empty')}</p>
        ) : (
          <ul className="split-groups">
            {groups.map((g) => (
              <li key={g.id}>
                <button className="split-group" onClick={() => setOpen(g.id)}>
                  <strong>{g.name}</strong>
                  <small>
                    {t('app.split.summary', { members: g.members, expenses: g.expenses })}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <NewGroup
        onCreate={(name, members) =>
          action.run(async () => {
            const group = await splitApi.create(name, members);
            await reload();
            setOpen(group.id);
          })
        }
      />
    </div>
  );
}
