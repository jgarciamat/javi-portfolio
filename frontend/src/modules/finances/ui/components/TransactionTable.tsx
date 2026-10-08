import { Fragment } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import { EmptyState } from '@shared/components/EmptyState';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import type { Transaction } from '@modules/finances/domain/types';
import { useTransactionTable } from '../../application/hooks/useTransactionTable';
import { SignedAmount, TypeBadge } from './TransactionBits';
import '../css/TransactionTable.css';

/** Below this width movements are shown as cards instead of a table. */
export const MOBILE_QUERY = '(max-width: 600px)';

export interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<unknown> | void;
  onPatch: (id: string, changes: { notes: string | null }) => Promise<unknown> | void;
  onEdit: (tx: Transaction) => void;
}

type TableState = ReturnType<typeof useTransactionTable>;

interface RowProps {
  tx: Transaction;
  table: TableState;
  onEdit: (tx: Transaction) => void;
}

/** Click on the notes to edit them; Enter or leaving the field saves, Escape cancels. */
function Notes({ tx, table }: Omit<RowProps, 'onEdit'>) {
  const { t } = useI18n();
  if (table.editingNotesId === tx.id) {
    return (
      <input
        className="tx-notes-edit-input"
        autoFocus
        aria-label={t('app.transaction.table.notes')}
        value={table.notesValue}
        onChange={(e) => table.setNotesValue(e.target.value)}
        onBlur={table.commitNotes}
        onKeyDown={(e) => {
          if (e.key === 'Enter') table.commitNotes();
          if (e.key === 'Escape') table.cancelEditNotes();
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="tx-notes-text"
      onClick={() => table.startEditNotes(tx)}
      title={t('app.transaction.table.notes.placeholder')}
    >
      {tx.notes ?? (
        <span className="tx-notes-placeholder">{t('app.transaction.table.notes.placeholder')}</span>
      )}
    </button>
  );
}

function RowActions({ tx, table, onEdit }: RowProps) {
  const { t } = useI18n();
  return (
    <span className="tx-row-actions">
      <button
        className="btn-edit"
        onClick={() => onEdit(tx)}
        title={t('app.transaction.table.edit')}
        aria-label={`${t('app.transaction.table.edit')}: ${tx.description}`}
      >
        ✏️
      </button>
      <button
        className="btn-delete"
        onClick={() => table.askDelete(tx.id)}
        title={t('app.transaction.table.delete')}
        aria-label={`${t('app.transaction.table.delete')}: ${tx.description}`}
      >
        🗑️
      </button>
    </span>
  );
}

function DayToggle({
  label,
  count,
  collapsed,
  onToggle,
  className,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button type="button" className={className} onClick={onToggle} aria-expanded={!collapsed}>
      <span className={`tx-day-chevron${collapsed ? ' tx-day-chevron--collapsed' : ''}`}>▾</span>
      {label}
      <span className="tx-day-count">({count})</span>
    </button>
  );
}

function DesktopTable({ table, onEdit }: { table: TableState; onEdit: RowProps['onEdit'] }) {
  const { t, tCategory } = useI18n();
  const { date } = useFormat();
  const headers = ['date', 'description', 'notes', 'category', 'type', 'amount'];
  return (
    <div className="tx-table-wrap">
      <table className="tx-table">
        <caption className="sr-only">{t('app.transaction.table.caption')}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {t(`app.transaction.table.${h}`)}
              </th>
            ))}
            <th scope="col" aria-label={t('app.transaction.table.actions')} />
          </tr>
        </thead>
        <tbody>
          {table.groups.map(({ dayKey, label, items }) => {
            const collapsed = table.isCollapsed(dayKey);
            return (
              <Fragment key={dayKey}>
                <tr className="tx-day-separator">
                  <td colSpan={7}>
                    <DayToggle
                      className="tx-day-label tx-day-toggle"
                      label={label}
                      count={items.length}
                      collapsed={collapsed}
                      onToggle={() => table.toggleDay(dayKey)}
                    />
                  </td>
                </tr>
                {!collapsed &&
                  items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="tx-cell-date">{date(tx.date)}</td>
                      <td className="tx-cell-description">{tx.description}</td>
                      <td className="tx-notes-cell">
                        <Notes tx={tx} table={table} />
                      </td>
                      <td>
                        <span className="tx-cat-badge">{tCategory(tx.category)}</span>
                      </td>
                      <td>
                        <TypeBadge type={tx.type} />
                      </td>
                      <td className="tx-cell-amount">
                        <SignedAmount type={tx.type} amount={tx.amount} />
                      </td>
                      <td>
                        <RowActions tx={tx} table={table} onEdit={onEdit} />
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileCardList({ table, onEdit }: { table: TableState; onEdit: RowProps['onEdit'] }) {
  const { tCategory } = useI18n();
  const { date } = useFormat();
  return (
    <div className="tx-card-list tx-card-list--visible">
      {table.groups.map(({ dayKey, label, items }) => {
        const collapsed = table.isCollapsed(dayKey);
        return (
          <div key={dayKey}>
            <DayToggle
              className="tx-day-header tx-day-toggle"
              label={label}
              count={items.length}
              collapsed={collapsed}
              onToggle={() => table.toggleDay(dayKey)}
            />
            {!collapsed &&
              items.map((tx) => (
                <div key={tx.id} className="tx-card">
                  <div className="tx-card-left">
                    <div className="tx-card-desc">{tx.description}</div>
                    <div className="tx-card-meta">
                      {date(tx.date)} · {tCategory(tx.category)}
                    </div>
                    <Notes tx={tx} table={table} />
                  </div>
                  <div className="tx-card-right">
                    <SignedAmount className="tx-card-amount" type={tx.type} amount={tx.amount} />
                    <TypeBadge type={tx.type} />
                    <RowActions tx={tx} table={table} onEdit={onEdit} />
                  </div>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export function TransactionTable({
  transactions,
  onDelete,
  onPatch,
  onEdit,
}: TransactionTableProps) {
  const { t, locale } = useI18n();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const table = useTransactionTable({ transactions, locale, onPatch, onDelete });

  if (transactions.length === 0) {
    return <EmptyState icon="💸" text={t('app.transaction.table.empty')} />;
  }

  return (
    <>
      {table.error && (
        <p className="inline-error" role="alert">
          {table.error}
        </p>
      )}
      {mobile ? (
        <MobileCardList table={table} onEdit={onEdit} />
      ) : (
        <DesktopTable table={table} onEdit={onEdit} />
      )}
      {table.pendingDeleteId !== null && (
        <ConfirmDeleteModal onConfirm={table.confirmDelete} onCancel={table.cancelDelete} />
      )}
    </>
  );
}
