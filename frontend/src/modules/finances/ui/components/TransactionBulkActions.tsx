import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { BulkActionBar } from '@shared/components/BulkSelection';
import { Icon } from '@shared/components/Icon';
import type { RowSelection } from '@shared/hooks/useRowSelection';
import type { Transaction } from '@modules/finances/domain/types';
import { BULK_MAX } from '@modules/finances/domain/transactionBulk';
import { useFinances } from '../../application/FinancesContext';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import type { BulkOutcome, TransactionBulk } from '../../application/hooks/useTransactionBulk';
import {
  BulkDeleteModal,
  BulkEditModal,
  SelectionTotals,
  type BulkEditKind,
} from './TransactionBulkDialogs';

/** Server reasons the app explains in its own words; others show the server's text. */
const KNOWN_REASONS = new Set([
  'INSUFFICIENT_BALANCE',
  'TRANSACTION_NOT_FOUND',
  'VALIDATION_ERROR',
]);

function OutcomeNotice({ outcome, onClose }: { outcome: BulkOutcome; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="bulk-outcome" role="status">
      <p>
        {t(`app.bulk.done.${outcome.kind}`, { count: outcome.applied })}
        {outcome.skipped.length > 0 && ` ${t('app.bulk.done.skipped')}`}
      </p>
      {outcome.skipped.length > 0 && (
        <ul>
          {outcome.skipped.map((s) => (
            <li key={s.code}>
              {s.count} · {KNOWN_REASONS.has(s.code) ? t(`app.bulk.reason.${s.code}`) : s.reason}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="bulk-bar-clear"
        onClick={onClose}
        aria-label={t('app.common.close')}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}

interface Props {
  selection: RowSelection;
  /** Rows on screen, to find the selected movements. */
  transactions: Transaction[];
  bulk: TransactionBulk;
  /** Paged lists: everything that matches the filters, and how to bring it all. */
  matching?: { total: number; onSelect: () => void };
}

type Dialog = 'delete' | BulkEditKind | null;

/** The bar of joint actions, its dialogs, the undo of a delete and the result. */
export function TransactionBulkActions({ selection, transactions, bulk, matching }: Props) {
  const { t } = useI18n();
  const f = useFinances();
  const { exportSelectionCSV } = useExportCSV();
  const [dialog, setDialog] = useState<Dialog>(null);
  const chosen = new Set(selection.ids);
  const items = transactions.filter((tx) => chosen.has(tx.id));
  const tooMany = items.length > BULK_MAX;
  const multipleAccounts = f.accounts.filter((a) => !a.archived).length > 1;

  const edits: { kind: BulkEditKind; icon: string; show: boolean }[] = [
    { kind: 'category', icon: 'package', show: true },
    { kind: 'type', icon: 'exchange', show: true },
    { kind: 'account', icon: 'wallet', show: multipleAccounts },
    { kind: 'notes', icon: 'edit', show: true },
    { kind: 'date', icon: 'calendar', show: true },
  ];

  const close = () => setDialog(null);

  return (
    <>
      {bulk.error && (
        <p className="inline-error" role="alert">
          {bulk.error}
        </p>
      )}
      {bulk.outcome && <OutcomeNotice outcome={bulk.outcome} onClose={bulk.dismissOutcome} />}
      {bulk.undoCount > 0 && (
        <div className="bulk-undo" role="status">
          <span>{t('app.bulk.undo.text', { count: bulk.undoCount })}</span>
          <button type="button" className="bulk-btn bulk-btn--primary" onClick={bulk.undo}>
            {t('app.bulk.undo.action')}
          </button>
        </div>
      )}
      <BulkActionBar
        selection={selection}
        matching={matching}
        escapeEnabled={dialog === null}
        summary={<SelectionTotals items={items} />}
      >
        {tooMany && (
          <p className="bulk-note bulk-note--warn">{t('app.bulk.tooMany', { max: BULK_MAX })}</p>
        )}
        {edits
          .filter((e) => e.show)
          .map(({ kind, icon }) => (
            <button
              key={kind}
              type="button"
              className="bulk-btn"
              disabled={tooMany || bulk.pending}
              onClick={() => setDialog(kind)}
            >
              <Icon name={icon} /> {t(`app.bulk.action.${kind}`)}
            </button>
          ))}
        <button type="button" className="bulk-btn" onClick={() => exportSelectionCSV(items)}>
          <Icon name="download" /> {t('app.bulk.action.export')}
        </button>
        <button
          type="button"
          className="bulk-btn bulk-btn--danger"
          disabled={tooMany || bulk.pending}
          onClick={() => setDialog('delete')}
        >
          <Icon name="trash" /> {t('app.bulk.action.delete')}
        </button>
      </BulkActionBar>
      {dialog === 'delete' && (
        <BulkDeleteModal
          items={items}
          onCancel={close}
          onConfirm={() => {
            close();
            bulk.remove(items.map((tx) => tx.id));
            selection.clear();
          }}
        />
      )}
      {dialog !== null && dialog !== 'delete' && (
        <BulkEditModal
          kind={dialog}
          items={items}
          onCancel={close}
          onApply={(ids, changes) => {
            // The selection stays, so another change can follow.
            close();
            void bulk.update(ids, changes);
          }}
        />
      )}
    </>
  );
}
