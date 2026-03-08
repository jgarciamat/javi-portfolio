import { useState } from 'react';
import '../css/Dashboard.css';
import { useFinances } from '../../application/FinancesContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { AnnualChart } from './AnnualChart';
import { CategoryManager } from './CategoryManager';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { EditTransactionModal } from './EditTransactionModal';
import { MonthlyView } from './MonthlyView';
import { RecurringRulesTab } from './RecurringRulesTab';
import type { Transaction } from '@modules/finances/domain/types';

export function Dashboard() {
    const now = new Date();
    const [tab, setTab] = useState<'monthly' | 'annual' | 'automations'>('monthly');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const { user, logout } = useAuth();
    const { t } = useI18n();
    const {
        year, month,
        transactions, summary, carryover,
        categories, loading, error,
        isPrevDisabled, isNextDisabled, goToPrev, goToNext, navigateTo,
        addTransaction, removeTransaction, patchTransaction, updateTransaction,
        addCategory, removeCategory,
    } = useFinances();

    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    const handleSaveEdit = async (id: string, dto: Parameters<typeof updateTransaction>[1]) => {
        await updateTransaction(id, dto);
        setEditingTransaction(null);
    };

    const handleMonthClick = (y: number, m: number) => { navigateTo(y, m); setTab('monthly'); };

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
                onAddTransaction={addTransaction}
                onDeleteTransaction={removeTransaction}
                onPatchTransaction={patchTransaction}
                onEditTransaction={setEditingTransaction}
                onManageCategories={() => setShowCategoryModal(true)}
            />
        );
    }

    return (
        <div className="dashboard">
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
                <div className="tabs">
                    <button className={`tab-btn${tab === 'monthly' ? ' active' : ''}`} onClick={() => setTab('monthly')}>
                        📅 {t('app.tabs.monthly')}
                    </button>
                    <button className={`tab-btn${tab === 'automations' ? ' active' : ''}`} onClick={() => setTab('automations')}>
                        ⚙️ {t('app.tabs.automations')}
                    </button>
                    <button className={`tab-btn${tab === 'annual' ? ' active' : ''}`} onClick={() => setTab('annual')}>
                        📊 {t('app.tabs.annual')}
                    </button>
                </div>

                {renderTabContent()}
            </main>

            <CategoryManager
                open={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                categories={categories}
                onAdd={addCategory}
                onDelete={removeCategory}
            />

            {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}

            {editingTransaction && (
                <EditTransactionModal
                    transaction={editingTransaction}
                    categories={categories}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingTransaction(null)}
                    onManageCategories={() => { setEditingTransaction(null); setShowCategoryModal(true); }}
                    viewYear={year}
                    viewMonth={month}
                    availableBalance={(carryover ?? 0) + (summary?.balance ?? 0)}
                />
            )}
        </div>
    );
}
