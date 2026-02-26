import { useState } from 'react';
import { useFinances } from '../../application/FinancesContext';
import { useAuth } from '@shared/hooks/useAuth';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { MONTH_NAMES } from '../types';
import { SummaryCards } from './SummaryCards';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { CategoryChart } from './CategoryChart';
import { AnnualChart } from './AnnualChart';
import { CategoryManager } from './CategoryManager';

export function Dashboard() {
    const now = new Date();
    const [tab, setTab] = useState<'monthly' | 'annual'>('monthly');
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const { user, logout } = useAuth();
    const {
        year, month,
        transactions, summary, carryover,
        categories, loading, error,
        goToPrev, goToNext,
        addTransaction, removeTransaction,
        addCategory, removeCategory,
    } = useFinances();

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="header">
                <div className="header-brand">
                    <span className="header-logo">💰</span>
                    <div>
                        <h1 className="header-title">Money Manager</h1>
                        <p className="header-sub">Control de gastos y ahorros</p>
                    </div>
                </div>
                <div className="header-actions">
                    <span className="header-user">👤 {user?.name}</span>
                    <button onClick={logout} className="btn-logout">Salir</button>
                </div>
            </header>

            <main className="main">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab-btn${tab === 'monthly' ? ' active' : ''}`} onClick={() => setTab('monthly')}>
                        📅 Resumen mensual
                    </button>
                    <button className={`tab-btn${tab === 'annual' ? ' active' : ''}`} onClick={() => setTab('annual')}>
                        📊 Balance anual
                    </button>
                </div>

                {tab === 'annual' ? (
                    <div className="card">
                        <AnnualChart initialYear={now.getFullYear()} />
                    </div>
                ) : (
                    <>
                        {/* Month navigator */}
                        <div className="card">
                            <div className="month-nav">
                                <button onClick={goToPrev} className="btn-nav">‹ Anterior</button>
                                <div className="month-nav-center">
                                    <div className="month-nav-title">{MONTH_NAMES[month - 1]} {year}</div>
                                    {isCurrentMonth && <div className="month-nav-badge">Mes actual</div>}
                                </div>
                                <button onClick={goToNext} disabled={isCurrentMonth} className="btn-nav">Siguiente ›</button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: '#4c0519', border: '1px solid #be123c', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', color: '#fca5a5' }}>
                                ⚠️ Error: {error} — ¿Está el servidor backend corriendo?
                            </div>
                        )}

                        {/* Contenido mensual con overlay de carga */}
                        <div className="month-content">
                            {loading && (
                                <div className="month-loading-overlay" aria-label="Cargando…">
                                    <svg className="month-spinner" viewBox="0 0 50 50" aria-hidden="true">
                                        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                                    </svg>
                                </div>
                            )}

                            {summary && <SummaryCards summary={summary} carryover={carryover} />}

                            <TransactionForm
                                categories={categories}
                                onSubmit={(dto) => addTransaction(dto).then(() => { })}
                                onManageCategories={() => setShowCategoryModal(true)}
                                viewYear={year}
                                viewMonth={month}
                                availableBalance={(carryover ?? 0) + (summary?.balance ?? 0)}
                            />

                            <CollapsiblePanel
                                title={<>📋 Transacciones ({transactions.length})</>}
                                style={{ marginBottom: '0' }}
                            >
                                <TransactionTable transactions={transactions} onDelete={removeTransaction} />
                            </CollapsiblePanel>

                            {summary && (
                                <CollapsiblePanel
                                    title="📊 Resumen por categoría"
                                    style={{ marginTop: '1.25rem', marginBottom: 0 }}
                                >
                                    <CategoryChart summary={summary} />
                                </CollapsiblePanel>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Category modal */}
            <CategoryManager
                open={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                categories={categories}
                onAdd={addCategory}
                onDelete={removeCategory}
            />
        </div>
    );
}
