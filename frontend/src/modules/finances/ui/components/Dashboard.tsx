import '../css/Dashboard.css';
import { useFinances } from '../../application/FinancesContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { useDashboard } from '../../application/hooks/useDashboard';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { AnnualChart } from './AnnualChart';
import { CategoryManager } from './CategoryManager';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { EditTransactionModal } from './EditTransactionModal';
import { MonthlyView, MonthNavCard } from './MonthlyView';
import { RecurringRulesTab } from './RecurringRulesTab';
import { CustomAlertsTab } from './CustomAlertsTab';
import { BurgerMenu } from './BurgerMenu';
import { useState } from 'react';

export function Dashboard() {
    const now = new Date();
    const { user, logout } = useAuth();
    const { t, tCategory } = useI18n();
    const {
        year, month,
        transactions, summary, carryover,
        categories, loading, error,
        isPrevDisabled, isNextDisabled, goToPrev, goToNext, navigateTo,
        addTransaction, removeTransaction, patchTransaction, updateTransaction,
        addCategory, removeCategory,
    } = useFinances();

    const {
        tab, setTab,
        showCategoryModal, openCategoryModal, closeCategoryModal,
        showProfile, openProfile, closeProfile,
        editingTransaction, setEditingTransaction,
        isCurrentMonth, handleSaveEdit, handleMonthClick,
    } = useDashboard({ year, month, navigateTo, updateTransaction });

    const [menuOpen, setMenuOpen] = useState(false);
    const goToCurrentMonth = () => navigateTo(now.getFullYear(), now.getMonth() + 1);

    function renderTabContent() {
        if (tab === 'annual') {
            return (
                <div className="card">
                    <AnnualChart initialYear={now.getFullYear()} onMonthClick={handleMonthClick} />
                </div>
            );
        }
        if (tab === 'automations') {
            return <RecurringRulesTab categories={categories} />;
        }
        if (tab === 'custom-alerts') {
            return <CustomAlertsTab categories={categories} />;
        }
        return (
            <MonthlyView
                year={year}
                month={month}
                isCurrentMonth={isCurrentMonth}
                isPrevDisabled={isPrevDisabled}
                isNextDisabled={isNextDisabled}
                transactions={transactions}
                summary={summary}
                carryover={carryover}
                categories={categories}
                loading={loading}
                error={error}
                onPrev={goToPrev}
                onNext={goToNext}
                onGoToCurrentMonth={goToCurrentMonth}
                onAddTransaction={addTransaction}
                onDeleteTransaction={removeTransaction}
                onPatchTransaction={patchTransaction}
                onEditTransaction={setEditingTransaction}
                onManageCategories={openCategoryModal}
            />
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-sticky">
                <header className="header">
                    <div className="header-brand">
                        <button
                            className="burger-btn"
                            onClick={() => setMenuOpen(true)}
                            aria-label={t('app.menu.open')}
                            aria-expanded={menuOpen}
                        >
                            <span className="burger-btn-logo">💰</span>
                            <span className="burger-btn-lines" aria-hidden="true">
                                <span /><span /><span />
                            </span>
                        </button>
                        <div>
                            <h1 className="header-title">{t('app.header.title')}</h1>
                            <p className="header-sub">{t(`app.tabs.${tab === 'monthly' ? 'monthly' : tab === 'annual' ? 'annual' : tab === 'automations' ? 'automations' : 'customAlerts'}`)}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button
                            className="header-user header-user-btn"
                            onClick={openProfile}
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
                        <button onClick={logout} className="btn-logout" title={t('app.header.logout')} aria-label={t('app.header.logout')}>{t('app.header.logout')}</button>
                    </div>
                </header>

                {/* ── Sub-header: month nav only ───────────────────────── */}
                {tab === 'monthly' && (
                    <div className="sticky-nav">
                        <div className="sticky-nav-inner">
                            <MonthNavCard
                                year={year}
                                month={month}
                                isCurrentMonth={isCurrentMonth}
                                isPrevDisabled={isPrevDisabled}
                                isNextDisabled={isNextDisabled}
                                transactions={transactions}
                                summary={summary}
                                onPrev={goToPrev}
                                onNext={goToNext}
                                onGoToCurrentMonth={goToCurrentMonth}
                                tCategory={tCategory}
                            />
                        </div>
                    </div>
                )}
            </div>

            <main className="main">
                <div
                    role="tabpanel"
                    id={`tabpanel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                >
                    {renderTabContent()}
                </div>
            </main>

            <CategoryManager
                open={showCategoryModal}
                onClose={closeCategoryModal}
                categories={categories}
                onAdd={addCategory}
                onDelete={removeCategory}
            />

            {showProfile && <ProfilePage onClose={closeProfile} />}

            <BurgerMenu
                open={menuOpen}
                tab={tab}
                onSelectTab={setTab}
                onClose={() => setMenuOpen(false)}
            />

            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    categories={categories}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingTransaction(null)}
                    onManageCategories={() => { setEditingTransaction(null); openCategoryModal(); }}
                    viewYear={year}
                    viewMonth={month}
                    availableBalance={(carryover ?? 0) + (summary?.balance ?? 0)}
                />
            )}
        </div>
    );
}
