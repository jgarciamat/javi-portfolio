import { ScrollRegion } from '@shared/components/ScrollRegion';
import { Fragment, memo } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import { EmptyState } from '@shared/components/EmptyState';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import type { RowSelection } from '@shared/hooks/useRowSelection';
import { SelectAllBar, SelectCheckbox } from '@shared/components/BulkSelection';
import { Pager } from '@shared/components/Pager';
import { DayCheckbox, RowCheckbox, selectableRow } from './TransactionSelect';
import type { Transaction } from '@modules/finances/domain/types';
import { useTransactionTable } from '../../application/hooks/useTransactionTable';
import { SignedAmount, TypeBadge } from './TransactionBits';
import '../css/TransactionTable.css';
import { Icon } from '@shared/components/Icon';

/** Below this width movements are shown as cards instead of a table. */
export const MOBILE_QUERY = '(max-width: 600px)';

export interface TransactionTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<unknown> | void;
  onPatch: (id: string, changes: { notes: string | null }) => Promise<unknown> | void;
  onEdit: (tx: Transaction) => void;
  /** With two or more accounts: each movement says which one it belongs to. */
  showAccount?: boolean;
  /** Multiple selection shared with the other views of the month. */
  selection: RowSelection;
  /** Changes with the filter or the month: the table goes back to its first page. */
  pageKey: string;
}

type TableState = ReturnType<typeof useTransactionTable>;
type Handlers = ReturnType<typeof useTransactionTable>['handlers'];

/** What a row needs of the table: kept to primitives and stable functions so `memo` works. */
interface RowProps {
  tx: Transaction;
  selected: boolean;
  toggle: RowSelection['toggle'];
  handlers: Handlers;
  onEdit: (tx: Transaction) => void;
  showAccount?: boolean;
  /** Whether the notes of this row are being edited, and the text while they are. */
  editing: boolean;
  notesValue: string;
}

/** Click on the notes to edit them; Enter or leaving the field saves, Escape cancels. */
function Notes({
  tx,
  editing,
  notesValue,
  handlers,
}: Pick<RowProps, 'tx' | 'editing' | 'notesValue' | 'handlers'>) {
  const { t } = useI18n();
  if (editing) {
    return (
      <input
        className="tx-notes-edit-input"
        autoFocus
        aria-label={t('app.transaction.table.notes')}
        value={notesValue}
        onChange={(e) => handlers.setNotesValue(e.target.value)}
        onBlur={handlers.commitNotes}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handlers.commitNotes();
          if (e.key === 'Escape') handlers.cancelEditNotes();
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="tx-notes-text"
      onClick={() => handlers.startEditNotes(tx)}
      title={t('app.transaction.table.notes.placeholder')}
    >
      {tx.notes ?? (
        <span className="tx-notes-placeholder">{t('app.transaction.table.notes.placeholder')}</span>
      )}
    </button>
  );
}

function RowActions({ tx, handlers, onEdit }: Pick<RowProps, 'tx' | 'handlers' | 'onEdit'>) {
  const { t } = useI18n();
  return (
    <span className="tx-row-actions">
      <button
        className="btn-edit"
        onClick={() => onEdit(tx)}
        title={t('app.transaction.table.edit')}
        aria-label={`${t('app.transaction.table.edit')}: ${tx.description}`}
      >
        <Icon name="edit" />
      </button>
      <button
        className="btn-delete"
        onClick={() => handlers.askDelete(tx.id)}
        title={t('app.transaction.table.delete')}
        aria-label={`${t('app.transaction.table.delete')}: ${tx.description}`}
      >
        <Icon name="trash" />
      </button>
    </span>
  );
}

/** Row of the table; drawn again only when its own movement, selection or editing change. */
const DesktopRow = memo(function DesktopRow(props: RowProps) {
  const { tx, selected, toggle, showAccount } = props;
  const { tCategory } = useI18n();
  const { date } = useFormat();
  const choice = { isSelected: () => selected, toggle };
  return (
    <tr {...selectableRow(tx, choice)}>
      <td className="tx-cell-select">
        <RowCheckbox tx={tx} selection={choice} />
      </td>
      <td className="tx-cell-date">{date(tx.date)}</td>
      <td className="tx-cell-description">{tx.description}</td>
      {showAccount && <td className="tx-cell-account">{tx.accountName}</td>}
      <td className="tx-notes-cell">
        <Notes {...props} />
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
        <RowActions {...props} />
      </td>
    </tr>
  );
});

/** Card of a movement on small screens. */
const CardRow = memo(function CardRow(props: RowProps) {
  const { tx, selected, toggle, showAccount } = props;
  const { tCategory } = useI18n();
  const { date } = useFormat();
  const choice = { isSelected: () => selected, toggle };
  return (
    <div {...selectableRow(tx, choice, 'tx-card')}>
      <RowCheckbox tx={tx} selection={choice} />
      <div className="tx-card-left">
        <div className="tx-card-desc">{tx.description}</div>
        <div className="tx-card-meta">
          {date(tx.date)} · {tCategory(tx.category)}
          {showAccount && tx.accountName ? ` · ${tx.accountName}` : ''}
        </div>
        <Notes {...props} />
      </div>
      <div className="tx-card-right">
        <SignedAmount className="tx-card-amount" type={tx.type} amount={tx.amount} />
        <TypeBadge type={tx.type} />
        <RowActions {...props} />
      </div>
    </div>
  );
});

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

interface ListProps {
  table: TableState;
  onEdit: RowProps['onEdit'];
  showAccount?: boolean;
  selection: RowSelection;
}

function rowProps(
  tx: Transaction,
  table: TableState,
  selection: RowSelection,
  onEdit: RowProps['onEdit'],
  showAccount?: boolean
): RowProps {
  const editing = table.editingNotesId === tx.id;
  return {
    tx,
    selected: selection.isSelected(tx.id),
    toggle: selection.toggle,
    handlers: table.handlers,
    onEdit,
    showAccount,
    editing,
    notesValue: editing ? table.notesValue : '',
  };
}

function DesktopTable({ table, onEdit, showAccount, selection }: ListProps) {
  const { t } = useI18n();
  const headers = [
    'date',
    'description',
    ...(showAccount ? ['account'] : []),
    'notes',
    'category',
    'type',
    'amount',
  ];
  return (
    <ScrollRegion className="tx-table-wrap" label={t('app.transaction.table.caption')}>
      <table className="tx-table">
        <caption className="sr-only">{t('app.transaction.table.caption')}</caption>
        <thead>
          <tr>
            <th scope="col" className="tx-cell-select">
              <SelectCheckbox
                state={selection.header}
                label={t('app.bulk.selectAll')}
                onToggle={selection.toggleAll}
              />
            </th>
            {headers.map((h) => (
              <th key={h} scope="col">
                {t(`app.transaction.table.${h}`)}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">{t('app.transaction.table.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.groups.map(({ dayKey, label, items }) => {
            const collapsed = table.isCollapsed(dayKey);
            return (
              <Fragment key={dayKey}>
                <tr className="tx-day-separator">
                  <td className="tx-cell-select">
                    <DayCheckbox label={label} items={items} selection={selection} />
                  </td>
                  <td colSpan={headers.length + 1}>
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
                    <DesktopRow
                      key={tx.id}
                      {...rowProps(tx, table, selection, onEdit, showAccount)}
                    />
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

function MobileCardList({ table, onEdit, showAccount, selection }: ListProps) {
  return (
    <div className="tx-card-list tx-card-list--visible">
      <SelectAllBar selection={selection} />
      {table.groups.map(({ dayKey, label, items }) => {
        const collapsed = table.isCollapsed(dayKey);
        return (
          <div key={dayKey}>
            <div className="tx-day-select">
              <DayCheckbox label={label} items={items} selection={selection} />
              <DayToggle
                className="tx-day-header tx-day-toggle"
                label={label}
                count={items.length}
                collapsed={collapsed}
                onToggle={() => table.toggleDay(dayKey)}
              />
            </div>
            {!collapsed &&
              items.map((tx) => (
                <CardRow key={tx.id} {...rowProps(tx, table, selection, onEdit, showAccount)} />
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
  showAccount,
  selection,
  pageKey,
}: TransactionTableProps) {
  const { t, locale } = useI18n();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const table = useTransactionTable({ transactions, locale, onPatch, onDelete, pageKey });

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
        <MobileCardList
          table={table}
          onEdit={onEdit}
          showAccount={showAccount}
          selection={selection}
        />
      ) : (
        <DesktopTable
          table={table}
          onEdit={onEdit}
          showAccount={showAccount}
          selection={selection}
        />
      )}
      {table.paging.pages > 1 && (
        <>
          <p className="tx-pager-note">
            {t('app.transactions.pager.selectionNote', { count: transactions.length })}
          </p>
          <Pager
            paging={table.paging}
            count={transactions.length}
            label={t('app.transactions.pager.label')}
          />
        </>
      )}
      {table.pendingDeleteId !== null && (
        <ConfirmDeleteModal onConfirm={table.confirmDelete} onCancel={table.cancelDelete} />
      )}
    </>
  );
}
