import type { TransactionTableProps } from '../types';
import { formatCurrency, formatDate } from '../types/TransactionTable.types';

export function TransactionTable({ transactions, onDelete }: TransactionTableProps) {
    if (transactions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem' }}>📭</div>
                <p style={{ margin: '0.5rem 0 0' }}>No hay transacciones aún. ¡Añade una!</p>
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
                            {['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe', ''].map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td style={{ color: '#94a3b8' }}>{formatDate(tx.date)}</td>
                                <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{tx.description}</td>
                                <td><span className="tx-cat-badge">{tx.category}</span></td>
                                <td>
                                    <span className={`tx-badge ${tx.type === 'INCOME' ? 'tx-badge-income' : tx.type === 'SAVING' ? 'tx-badge-saving' : 'tx-badge-expense'}`}>
                                        {tx.type === 'INCOME' ? '↑ Ingreso' : tx.type === 'SAVING' ? ' Ahorro' : '↓ Gasto'}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 700, color: tx.type === 'INCOME' ? '#4ade80' : tx.type === 'SAVING' ? '#a78bfa' : '#f87171' }}>
                                    {tx.type === 'EXPENSE' ? '−' : '+'}{formatCurrency(tx.amount)}
                                </td>
                                <td>
                                    <button className="btn-delete" onClick={() => onDelete(tx.id)} title="Eliminar" aria-label="Eliminar">🗑️</button>
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
                            <div className="tx-card-meta">{formatDate(tx.date)} · {tx.category}</div>
                        </div>
                        <div className="tx-card-right">
                            <span className="tx-card-amount" style={{ color: tx.type === 'INCOME' ? '#4ade80' : tx.type === 'SAVING' ? '#a78bfa' : '#f87171' }}>
                                {tx.type === 'EXPENSE' ? '−' : '+'}{formatCurrency(tx.amount)}
                            </span>
                            <span className={`tx-badge ${tx.type === 'INCOME' ? 'tx-badge-income' : tx.type === 'SAVING' ? 'tx-badge-saving' : 'tx-badge-expense'}`}>
                                {tx.type === 'INCOME' ? '↑ Ingreso' : tx.type === 'SAVING' ? '↑ Ahorro' : '↓ Gasto'}
                            </span>
                            <button className="btn-delete" onClick={() => onDelete(tx.id)} aria-label="Eliminar">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

