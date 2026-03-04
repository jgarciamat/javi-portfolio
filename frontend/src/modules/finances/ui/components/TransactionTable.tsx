import { useState } from 'react';
import '../css/TransactionTable.css';
import type { TransactionTableProps } from '../types';
import type { TransactionType } from '@modules/finances/domain/types';
import { formatCurrency, formatDate } from '../types/TransactionTable.types';
import { useI18n } from '@core/i18n/I18nContext';

function txBadgeClass(type: TransactionType): string {
    if (type === 'INCOME') return 'tx-badge tx-badge-income';
    if (type === 'SAVING') return 'tx-badge tx-badge-saving';
    return 'tx-badge tx-badge-expense';
}

function txAmountColor(type: TransactionType): string {
    if (type === 'INCOME') return '#4ade80';
    if (type === 'SAVING') return '#a78bfa';
    return '#f87171';
}

export function TransactionTable({ transactions, onDelete, onPatch }: TransactionTableProps) {
    const { t, tCategory } = useI18n();
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');

    const txLabel = (type: TransactionType): string => {
        if (type === 'INCOME') return `↑ ${t('app.transaction.form.type.income')}`;
        if (type === 'SAVING') return `↑ ${t('app.transaction.form.type.saving')}`;
        return `↓ ${t('app.transaction.form.type.expense')}`;
    };

    const startEditNotes = (id: string, current: string | null) => {
        setEditingNotesId(id);
        setNotesValue(current ?? '');
    };

    const commitNotes = (id: string) => {
        onPatch(id, { notes: notesValue.trim() || null });
        setEditingNotesId(null);
    };

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
                                'Notas',
                                t('app.transaction.table.category'),
                                'Tipo',
                                t('app.transaction.table.amount'),
                                '',
                            ].map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
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
                                                if (e.key === 'Escape') setEditingNotesId(null);
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
                                    <button className="btn-delete" onClick={() => onDelete(tx.id)} title={t('app.transaction.table.delete')} aria-label={t('app.transaction.table.delete')}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile card list */}
            <div className="tx-card-list">
                {transactions.map((tx) => (
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
                                        if (e.key === 'Escape') setEditingNotesId(null);
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
                            <button className="btn-delete" onClick={() => onDelete(tx.id)} aria-label={t('app.transaction.table.delete')}>🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
