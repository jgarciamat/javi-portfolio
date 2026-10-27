import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { DateField } from '@shared/components/DateField';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import type {
  BulkTransactionChanges,
  Transaction,
  TransactionType,
} from '@modules/finances/domain/types';
import { TRANSACTION_TYPES, TYPE_LABEL_KEYS } from '@modules/finances/domain/transactionTypes';
import {
  NOTES_MAX,
  selectionFacts,
  splitByNotesLength,
} from '@modules/finances/domain/transactionBulk';
import { useFinances } from '../../application/FinancesContext';
import '@shared/components/css/ConfirmDeleteModal.css';
import '../css/Sections.css';

/** Income, expenses, saving and net of the selection. */
export function SelectionTotals({ items }: { items: Transaction[] }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { totals } = selectionFacts(items);
  const net = totals.balance;
  return (
    <p className="bulk-totals">
      <span className="amount-pos">
        {t('app.bulk.income')} {totals.income > 0 && '+'}
        {money(totals.income)}
      </span>
      <span className="amount-neg">
        {t('app.bulk.expenses')} {totals.expenses > 0 && '−'}
        {money(totals.expenses)}
      </span>
      {totals.saving > 0 && (
        <span className="amount-saving">
          {t('app.bulk.saving')} {money(totals.saving)}
        </span>
      )}
      <strong className={net >= 0 ? 'amount-pos' : 'amount-neg'}>
        {t('app.bulk.net')} {net >= 0 ? '+' : '−'}
        {money(Math.abs(net))}
      </strong>
    </p>
  );
}

/** Confirmation of a bulk delete: how many, how much and which dates. */
export function BulkDeleteModal({
  items,
  onConfirm,
  onCancel,
}: {
  items: Transaction[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const format = useFormat();
  const facts = selectionFacts(items);
  const title =
    items.length === 1
      ? t('app.bulk.delete.titleOne')
      : t('app.bulk.delete.title', { count: items.length });
  return (
    <Modal
      label={title}
      onClose={onCancel}
      overlayClassName="confirm-delete-overlay"
      className="confirm-delete-modal"
    >
      <div className="confirm-delete-icon" aria-hidden="true">
        <Icon name="trash" />
      </div>
      <h2 className="confirm-delete-title">{title}</h2>
      <p className="confirm-delete-message">
        {facts.first === facts.last
          ? format.date(facts.first)
          : format.range(facts.first, facts.last)}
      </p>
      <SelectionTotals items={items} />
      {facts.recurring > 0 && (
        <p className="bulk-note">
          {t('app.bulk.note.deleteRecurring', { count: facts.recurring })}
        </p>
      )}
      <p className="confirm-delete-message">{t('app.bulk.delete.undoHint')}</p>
      <div className="confirm-delete-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} autoFocus>
          {t('app.confirm.delete.cancel')}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {t('app.bulk.delete.confirm', { count: items.length })}
        </button>
      </div>
    </Modal>
  );
}

export type BulkEditKind = 'category' | 'type' | 'account' | 'notes' | 'date';

interface EditProps {
  kind: BulkEditKind;
  items: Transaction[];
  onApply: (ids: string[], changes: BulkTransactionChanges) => void;
  onCancel: () => void;
}

/** What the change means for some of the movements (rules of the app). */
function notesFor(kind: BulkEditKind, items: Transaction[], type: TransactionType): string[] {
  const facts = selectionFacts(items);
  const notes: string[] = [];
  if (kind === 'date' && facts.recurring > 0) notes.push('app.bulk.note.dateRecurring');
  if ((kind === 'date' && facts.savings > 0) || (kind === 'type' && type === 'SAVING')) {
    notes.push('app.bulk.note.savingBalance');
  }
  if (kind === 'category' && facts.savings > 0) notes.push('app.bulk.note.categoryGoals');
  return notes;
}

/** State of the edit dialog: the value of each kind of change and what it applies to. */
function useBulkEditForm(kind: BulkEditKind, items: Transaction[]) {
  const f = useFinances();
  const accounts = f.accounts.filter((a) => !a.archived);
  const [categoryId, setCategoryId] = useState(f.categories[0]?.id ?? '');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  // The account action is only offered with two or more active accounts.
  const [accountId, setAccountId] = useState(accounts[0].id);
  const [date, setDate] = useState(items[0].date.slice(0, 10));
  const [notes, setNotes] = useState('');
  const [notesMode, setNotesMode] = useState<'replace' | 'append'>('replace');

  const { valid, tooLong } =
    kind === 'notes' ? splitByNotesLength(items, notes, notesMode) : { valid: items, tooLong: [] };
  const changes: Record<BulkEditKind, BulkTransactionChanges> = {
    category: { categoryId },
    type: { type },
    account: { accountId },
    date: { date },
    notes: { notes: notes.trim() || null, notesMode },
  };
  const filled: Record<BulkEditKind, boolean> = {
    category: !!categoryId,
    type: true,
    account: true,
    date: !!date,
    // Appending nothing would change nothing; replacing with nothing clears the notes.
    notes: notesMode === 'replace' || !!notes.trim(),
  };
  return {
    categories: f.categories,
    accounts,
    categoryId,
    setCategoryId,
    type,
    setType,
    accountId,
    setAccountId,
    date,
    setDate,
    notes,
    setNotes,
    notesMode,
    setNotesMode,
    valid,
    tooLong,
    changes: changes[kind],
    ready: valid.length > 0 && filled[kind],
  };
}

type EditForm = ReturnType<typeof useBulkEditForm>;

function Choice<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="bulk-type-options" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="bulk-radio">
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** The field of each kind of change. */
function BulkEditField({
  kind,
  form,
  title,
}: {
  kind: BulkEditKind;
  form: EditForm;
  title: string;
}) {
  const { t, tCategory } = useI18n();
  switch (kind) {
    case 'category':
      return (
        <select
          className="tx-input"
          value={form.categoryId}
          onChange={(e) => form.setCategoryId(e.target.value)}
          aria-label={t('app.transaction.table.category')}
        >
          {form.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {tCategory(c.name)}
            </option>
          ))}
        </select>
      );
    case 'type':
      return (
        <Choice
          label={title}
          name="bulk-type"
          value={form.type}
          onChange={form.setType}
          options={TRANSACTION_TYPES.map((value) => ({ value, label: t(TYPE_LABEL_KEYS[value]) }))}
        />
      );
    case 'account':
      return (
        <select
          className="tx-input"
          value={form.accountId}
          onChange={(e) => form.setAccountId(e.target.value)}
          aria-label={t('app.transaction.table.account')}
        >
          {form.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
      );
    case 'date':
      return (
        <DateField
          value={form.date}
          onChange={form.setDate}
          label={t('app.transaction.form.date')}
        />
      );
    case 'notes':
      return (
        <>
          <Choice
            label={title}
            name="bulk-notes-mode"
            value={form.notesMode}
            onChange={form.setNotesMode}
            options={(['replace', 'append'] as const).map((value) => ({
              value,
              label: t(`app.bulk.notes.${value}`),
            }))}
          />
          <textarea
            className="tx-input"
            rows={3}
            maxLength={NOTES_MAX}
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            aria-label={t('app.transaction.table.notes')}
            placeholder={t(`app.bulk.notes.${form.notesMode}Hint`)}
          />
        </>
      );
  }
}

/** One field applied to every selected movement. */
export function BulkEditModal({ kind, items, onApply, onCancel }: EditProps) {
  const { t } = useI18n();
  const form = useBulkEditForm(kind, items);
  const title = t(`app.bulk.edit.${kind}`);

  return (
    <Modal label={title} onClose={onCancel}>
      <div className="modal-header">
        <h2 className="modal-title">{title}</h2>
        <button
          type="button"
          className="modal-close"
          onClick={onCancel}
          aria-label={t('app.common.close')}
        >
          <Icon name="close" />
        </button>
      </div>
      <form
        className="modal-body bulk-form"
        onSubmit={(e) => {
          // A disabled submit button also blocks Enter, so the form is always ready here.
          e.preventDefault();
          onApply(
            form.valid.map((tx) => tx.id),
            form.changes
          );
        }}
      >
        <p className="bulk-form-scope">{t('app.bulk.edit.scope', { count: items.length })}</p>
        <BulkEditField kind={kind} form={form} title={title} />
        {notesFor(kind, items, form.type).map((key) => (
          <p key={key} className="bulk-note">
            {t(key)}
          </p>
        ))}
        {form.tooLong.length > 0 && (
          <p className="bulk-note bulk-note--warn" role="status">
            {t('app.bulk.note.notesTooLong', {
              count: form.tooLong.length,
              valid: form.valid.length,
            })}
          </p>
        )}
        <div className="bulk-form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('app.confirm.delete.cancel')}
          </button>
          <button type="submit" className="bulk-btn bulk-btn--primary" disabled={!form.ready}>
            {t('app.bulk.apply', { count: form.valid.length })}
          </button>
        </div>
      </form>
    </Modal>
  );
}
