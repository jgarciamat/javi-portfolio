import { useState } from 'react';
import '../css/Dashboard.css';
import { useFinances } from '../../application/FinancesContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import { MONTH_NAMES } from '../types';
import { SummaryCards } from './SummaryCards';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { CategoryChart } from './CategoryChart';
import { AnnualChart } from './AnnualChart';
import { CategoryManager } from './CategoryManager';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { BudgetAlerts } from './BudgetAlerts';
import { AIAdvisor } from './AIAdvisor';
import { isNextButtonDisabled } from '@modules/finances/domain/nextMonthLogic';

export function Dashboard() {
    const now = new Date();
    const [tab, setTab] = useState<'monthly' | 'annual'>('monthly');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const { user, logout } = useAuth();
    const { t, tCategory } = useI18n();
    const { exportMonthCSV } = useExportCSV();
    const {
        year, month,
        transactions, summary, carryover,
        categories, loading, error,
        goToPrev, goToNext, navigateTo,
        addTransaction, removeTransaction, patchTransaction,
        addCategory, removeCategory,
    } = useFinances();

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    // Enable next month 7 days before the 1st of the following month
    const isNextDisabled = isNextButtonDisabled(year, month, now);

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="header">
                <div className="header-brand">
                    <span className="header-logo">💰</span>
                    <div>
                        <h1 className="header-title">{t('app.header.title')}</h1>
                        <p className="header-sub">{t('app.header.subtitle')}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="header-user header-user-btn"
                        onClick={() => setShowProfile(true)}
                        aria-label={t('app.header.openProfile')}
                        title={t('app.header.openProfile')}
                    >
                        {user?.avatarUrl
                            ? <img src={user.avatarUrl} alt="Avatar" className="header-avatar" />
                            : <span className="header-avatar-placeholder">👤</span>
                        }
                        <span className="header-user-name">{user?.name}</span>
                    </button>
                    <LanguageSwitcher />
                    <button onClick={logout} className="btn-logout">{t('app.header.logout')}</button>
                </div>
            </header>

            <main className="main">
                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab-btn${tab === 'monthly' ? ' active' : ''}`} onClick={() => setTab('monthly')}>
                        📅 {t('app.tabs.monthly')}
                    </button>
                    <button className={`tab-btn${tab === 'annual' ? ' active' : ''}`} onClick={() => setTab('annual')}>
                        📊 {t('app.tabs.annual')}
                    </button>
                </div>

                {tab === 'annual' ? (
                    <div className="card">
                        <AnnualChart
                            initialYear={now.getFullYear()}
                            onMonthClick={(y, m) => { navigateTo(y, m); setTab('monthly'); }}
                        />
                    </div>
                ) : (
                    <>
                        {/* Month navigator */}
                        <div className="card">
                            <div className="month-nav">
                                <button onClick={goToPrev} className="btn-nav">‹ {t('app.nav.prev')}</button>
                                <div className="month-nav-center">
                                    <div className="month-nav-title">
                                        {MONTH_NAMES[month - 1]} {year}
                                        {transactions.length > 0 && (
                                            <OptionsDropdown
                                                ariaLabel={t('app.export.options')}
                                                options={[
                                                    {
                                                        icon: '📥',
                                                        label: t('app.export.month'),
                                                        onClick: () => exportMonthCSV(transactions, summary, year, month, tCategory),
                                                    },
                                                ]}
                                            />
                                        )}
                                    </div>
                                    {isCurrentMonth && <div className="month-nav-badge">{t('app.nav.currentMonth')}</div>}
                                </div>
                                <button onClick={goToNext} disabled={isNextDisabled} className="btn-nav">{t('app.nav.next')} ›</button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: '#4c0519', border: '1px solid #be123c', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', color: '#fca5a5' }}>
                                ⚠️ {t('app.error.backendDown', { error })}
                            </div>
                        )}

                        {/* Contenido mensual con overlay de carga */}
                        <div className="month-content">
                            {loading && (
                                <div className="month-loading-overlay" aria-label={t('app.loading')}>
                                    <svg className="month-spinner" viewBox="0 0 50 50" aria-hidden="true">
                                        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                                    </svg>
                                </div>
                            )}

                            {/* Smart budget alerts */}
                            <BudgetAlerts summary={summary} carryover={carryover} />

                            {summary && <SummaryCards summary={summary} carryover={carryover} />}

                            <TransactionForm
                                categories={categories}
                                onSubmit={(dto) => addTransaction(dto).then(() => { })}
                                onManageCategories={() => setShowCategoryModal(true)}
                                viewYear={year}
                                viewMonth={month}
                                availableBalance={(carryover ?? 0) + (summary?.balance ?? 0)}
                            />

                            {/* AI Financial Advisor */}
                            <AIAdvisor year={year} month={month} />

                            <CollapsiblePanel
                                title={<>📋 {t('app.transactions.title', { count: String(transactions.length) })}</>}
                                style={{ marginBottom: '0' }}
                            >
                                <TransactionTable transactions={transactions} onDelete={removeTransaction} onPatch={patchTransaction} />
                            </CollapsiblePanel>

                            {summary && transactions.length > 0 && (
                                <CollapsiblePanel
                                    title={`📊 ${t('app.categoryChart.title')}`}
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

            {/* Profile panel */}
            {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}
        </div>
    );
}
