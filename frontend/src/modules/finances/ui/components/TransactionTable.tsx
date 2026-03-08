import '../css/TransactionTable.css';
import type { TransactionTableProps } from '../types';
import { txBadgeClass, txAmountColor, formatCurrency, formatDate } from '../types/TransactionTable.types';
import { useI18n } from '@core/i18n/I18nContext';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import { useTransactionTable } from '../../application/hooks/useTransactionTable';

export function TransactionTable({ transactions, onDelete, onPatch, onEdit }: TransactionTableProps) {
    const { t, tCategory, locale } = useI18n();
    const {
        groups,
        editingNotesId,
        notesValue,
        pendingDeleteId,
        txLabel,
        startEditNotes,
        commitNotes,
        cancelEditNotes,
        setNotesValue,
        setPendingDeleteId,
        confirmDelete,
        cancelDelete,
    } = useTransactionTable({ transactions, locale, t, onPatch, onDelete });

    if (transactions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem' }}>{'\uD83D\uDCB8'}</div>
                <p style={{ margin: '0.5rem 0 0' }}>{t('app.transaction.table.empty')}</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop table */}
            <div className="tx-table-wrap">
                <table className="tx-table">
                    <thead>
                        <tr>
                            {[
                                t('app.transaction.table.date'),
                                t('app.transaction.table.description'),
                                t('app.transaction.table.notes'),
                                t('app.transaction.table.category'),
                                t('app.transaction.table.type'),
                                t('app.transaction.table.amount'),
                                '',
                            ].map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(({ dayKey, label, items }) => (
                            <>
                                <tr key={`sep-${dayKey}`} className="tx-day-separator">
                                    <td colSpan={7}>
                                        <span className="tx-day-label">{label}</span>
                                    </td>
                                </tr>
                                {items.map((tx) => (
                                    <tr key={tx.id}>
                                        <td style={{ color: '#94a3b8' }}>{formatDate(tx.date)}</td>
                                        <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{tx.description}</td>
                                        <td className="tx-notes-cell">
                                            {editingNotesId === tx.id ? (
                                                <input
                                                    className="tx-notes-edit-input"
                                                    autoFocus
                                                    value={notesValue}
                                                    onChange={(e) => setNotesValue(e.target.value)}
                                                    onBlur={() => commitNotes(tx.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') commitNotes(tx.id);
                                                        if (e.key === 'Escape') cancelEditNotes();
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    className="tx-notes-text"
                                                    onClick={() => startEditNotes(tx.id, tx.notes)}
                                                    title={t('app.transaction.table.notes.placeholder')}
                                                >
                                                    {tx.notes ?? <span className="tx-notes-placeholder">{t('app.transaction.table.notes.placeholder')}</span>}
                                                </span>
                                            )}
                                        </td>
                                        <td><span className="tx-cat-badge">{tCategory(tx.category)}</span></td>
                                        <td>
                                            <span className={txBadgeClass(tx.type)}>{txLabel(tx.type)}</span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: txAmountColor(tx.type) }}>
                                            {tx.type === 'EXPENSE' ? '−' : '+'}{formatCurrency(tx.amount)}
                                        </td>
                                        <td>
                                            <button className="btn-edit" onClick={() => onEdit(tx)} title={t('app.transaction.table.edit')} aria-label={t('app.transaction.table.edit')}>✏️</button>
                                            <button className="btn-delete" onClick={() => setPendingDeleteId(tx.id)} title={t('app.transaction.table.delete')} aria-label={t('app.transaction.table.delete')}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile card list */}
            <div className="tx-card-list">
                {groups.map(({ dayKey, label, items }) => (
                    <div key={`group-${dayKey}`}>
                        <div className="tx-day-header">{label}</div>
                        {items.map((tx) => (
                            <div key={tx.id} className="tx-card">
                                <div className="tx-card-left">
                                    <div className="tx-card-desc">{tx.description}</div>
                                    <div className="tx-card-meta">{formatDate(tx.date)} · {tCategory(tx.category)}</div>
                                    {editingNotesId === tx.id ? (
                                        <input
                                            className="tx-notes-edit-input"
                                            value={notesValue}
                                            onChange={(e) => setNotesValue(e.target.value)}
                                            onBlur={() => commitNotes(tx.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitNotes(tx.id);
                                                if (e.key === 'Escape') cancelEditNotes();
                                            }}
                                        />
                                    ) : (
                                        <span
                                            className="tx-notes-text"
                                            onClick={() => startEditNotes(tx.id, tx.notes)}
                                        >
                                            {tx.notes ?? <span className="tx-notes-placeholder">{t('app.transaction.table.notes.placeholder')}</span>}
                                        </span>
                                    )}
                                </div>
                                <div className="tx-card-right">
                                    <span className="tx-card-amount" style={{ color: txAmountColor(tx.type) }}>
                                        {tx.type === 'EXPENSE' ? '−' : '+'}{formatCurrency(tx.amount)}
                                    </span>
                                    <span className={txBadgeClass(tx.type)}>{txLabel(tx.type)}</span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="btn-edit" onClick={() => onEdit(tx)} aria-label={t('app.transaction.table.edit')}>✏️</button>
                                        <button className="btn-delete" onClick={() => setPendingDeleteId(tx.id)} aria-label={t('app.transaction.table.delete')}>🗑️</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {pendingDeleteId !== null && (
                <ConfirmDeleteModal
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </>
    );
}
