import { useTransactionForm } from '../../application/hooks/useTransactionForm';
import type { TransactionFormProps } from '../types';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';

export function TransactionForm({ categories, onSubmit, onManageCategories, viewYear, viewMonth, availableBalance }: TransactionFormProps) {
    const {
        fields,
        setDescription,
        setAmount,
        setType,
        setDate,
        handleCategoryChange,
        handleSubmit,
        reset,
        loading,
        error,
    } = useTransactionForm({ viewYear, viewMonth, availableBalance, onSubmit });

    return (
        <CollapsiblePanel title="➕ Nueva transacción" defaultOpen={false}>
            <form onSubmit={handleSubmit} className="tx-form">
                <div className="tx-form-grid">
                    <input className="tx-input" placeholder="Descripción" value={fields.description}
                        onChange={(e) => setDescription(e.target.value)} required />
                    <input className="tx-input" type="number" placeholder="Importe (€)" min="0" step="0.01"
                        value={fields.amount} onChange={(e) => setAmount(e.target.value)} required />
                    <select className="tx-input" value={fields.type} onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE' | 'SAVING')}>
                        <option value="EXPENSE">↓ Gasto</option>
                        <option value="INCOME">↑ Ingreso</option>
                        <option value="SAVING">↑ Ahorro</option>
                    </select>
                    <select
                        className="tx-input"
                        value={fields.category}
                        onChange={(e) => handleCategoryChange(e.target.value, onManageCategories)}
                        required
                    >
                        <option value="">Categoría...</option>
                        <option value="__manage__">⚙️ Crear / Eliminar categoría</option>
                        <option disabled>──────────────</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                    <input className="tx-input" type="date" value={fields.date} onChange={(e) => setDate(e.target.value)} />
                </div>

                {error && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0.4rem 0' }}>{error}</p>}

                <div className="tx-form-actions">
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar transacción'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={reset} disabled={loading}>
                        Cancelar
                    </button>
                </div>
            </form>
        </CollapsiblePanel>
    );
}

