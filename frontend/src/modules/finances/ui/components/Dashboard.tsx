import type { ReactElement } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useAuth } from '@shared/hooks/useAuth';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { OffersView } from '@modules/billing/ui/OffersView';
import { PlanBanner } from '@modules/billing/ui/PlanBanner';
import { PlanView } from '@modules/billing/ui/PlanView';
import { useFinances } from '../../application/FinancesContext';
import { useAlertNotifications } from '../../application/hooks/useAlertNotifications';
import { useDashboard, type UseDashboardReturn } from '../../application/hooks/useDashboard';
import { AccountsView } from '../views/AccountsView';
import { AnalysisView } from '../views/AnalysisView';
import { BudgetsView } from '../views/BudgetsView';
import { GoalsView } from '../views/GoalsView';
import { SearchView } from '../views/SearchView';
import { SettingsView } from '../views/SettingsView';
import { SECTION_BY_ID, type DashboardTab } from '../navigation';
import { AnnualChart } from './AnnualChart';
import { BurgerMenu } from './BurgerMenu';
import { CategoryManager } from './CategoryManager';
import { CustomAlertsTab } from './CustomAlertsTab';
import { EditTransactionModal } from './EditTransactionModal';
import { ImportModal } from './ImportModal';
import { MonthlyView, MonthNavCard } from './MonthlyView';
import { RecurringRulesTab } from './RecurringRulesTab';
import { monthAlertMessage } from './monthAlertMessage';
import '../css/Dashboard.css';
import '../css/Sections.css';

/** Sections that need nothing from the dashboard. */
const SIMPLE_VIEWS: Partial<Record<DashboardTab, () => ReactElement>> = {
  analysis: () => <AnalysisView />,
  accounts: () => <AccountsView />,
  budgets: () => <BudgetsView />,
  goals: () => <GoalsView />,
  plan: () => <PlanView />,
  offers: () => <OffersView />,
};

function TabContent({ dash }: { dash: UseDashboardReturn }) {
  const { year, categories } = useFinances();
  const simple = SIMPLE_VIEWS[dash.tab];
  if (simple) return simple();
  switch (dash.tab) {
    case 'annual':
      return (
        <div className="card">
          <AnnualChart initialYear={year} onMonthClick={dash.handleMonthClick} />
        </div>
      );
    case 'search':
      return <SearchView onEdit={dash.setEditingTransaction} refreshKey={dash.editVersion} />;
    case 'automations':
      return <RecurringRulesTab categories={categories} />;
    case 'custom-alerts':
      return <CustomAlertsTab categories={categories} />;
    case 'settings':
      return <SettingsView onOpenProfile={dash.openProfile} />;
    default:
      return (
        <MonthlyView
          onEditTransaction={dash.setEditingTransaction}
          onManageCategories={dash.openCategoryModal}
          onManageBudgets={() => dash.setTab('budgets')}
        />
      );
  }
}

function Header({ dash, sectionLabel }: { dash: UseDashboardReturn; sectionLabel: string }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  return (
    <header className="header">
      <div className="header-brand">
        <button
          className="burger-btn"
          onClick={() => dash.setMenuOpen(true)}
          aria-label={t('app.menu.open')}
          aria-expanded={dash.menuOpen}
        >
          <span className="burger-btn-logo">💰</span>
          <span className="burger-btn-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <div>
          <h1 className="header-title">{t('app.header.title')}</h1>
          <p className="header-sub">{sectionLabel}</p>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="header-user header-user-btn"
          onClick={dash.openProfile}
          aria-label={t('app.header.openProfile')}
          title={t('app.header.openProfile')}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="header-avatar" />
          ) : (
            <span className="header-avatar-placeholder" aria-hidden="true">
              👤
            </span>
          )}
          <span className="header-user-name">{user?.name}</span>
        </button>
        <LanguageSwitcher />
        <button onClick={logout} className="btn-logout">
          {t('app.header.logout')}
        </button>
      </div>
    </header>
  );
}

/** Dialogs opened from anywhere in the dashboard. */
function DashboardModals({ dash }: { dash: UseDashboardReturn }) {
  const finances = useFinances();
  return (
    <>
      {dash.showCategoryModal && (
        <CategoryManager
          onClose={dash.closeCategoryModal}
          categories={finances.categories}
          onAdd={finances.addCategory}
          onUpdate={finances.updateCategory}
          onDelete={finances.removeCategory}
        />
      )}
      {dash.showProfile && <ProfilePage onClose={dash.closeProfile} />}
      {dash.showImport && (
        <ImportModal
          accounts={finances.accounts}
          onClose={dash.closeImport}
          onImported={() => finances.refresh({ invalidate: true })}
        />
      )}
      {dash.editingTransaction && (
        <EditTransactionModal
          transaction={dash.editingTransaction}
          categories={finances.categories}
          accounts={finances.accounts}
          onSave={dash.handleSaveEdit}
          onClose={() => dash.setEditingTransaction(null)}
          onManageCategories={() => {
            dash.setEditingTransaction(null);
            dash.openCategoryModal();
          }}
          availableBalance={finances.available}
        />
      )}
    </>
  );
}

/** Notifies new budget alerts of the current period (when enabled in Settings). */
function useBudgetAlertNotifications() {
  const { t, tCategory } = useI18n();
  const settings = useOptionalSettings()?.settings ?? null;
  const { isCurrentPeriod, year, month, alerts } = useFinances();
  useAlertNotifications({
    enabled: !!settings?.notificationsEnabled,
    isCurrentPeriod,
    year,
    month,
    alerts,
    title: t('app.header.title'),
    message: (alert) => monthAlertMessage(alert, t, tCategory),
  });
}

export function Dashboard() {
  const { t } = useI18n();
  const finances = useFinances();
  const plan = useOptionalPlan();
  const dash = useDashboard({
    navigateTo: finances.navigateTo,
    updateTransaction: finances.updateTransaction,
  });
  const section = SECTION_BY_ID[dash.tab];
  useBudgetAlertNotifications();

  // Free plan: the import button opens the paywall instead of the importer.
  const openImport =
    plan && !plan.isPremium
      ? () => plan.openUpgrade({ kind: 'feature', feature: 'import' })
      : dash.openImport;

  return (
    <div className="dashboard">
      <div className="dashboard-sticky">
        <Header dash={dash} sectionLabel={`${section.icon} ${t(section.labelKey)}`} />
        {dash.tab === 'monthly' && (
          <div className="sticky-nav">
            <div className="sticky-nav-inner">
              <MonthNavCard onImport={openImport} />
            </div>
          </div>
        )}
      </div>

      <main className="main">
        <PlanBanner onOpenPlan={() => dash.setTab('plan')} />
        <div role="region" aria-label={t(section.labelKey)}>
          <TabContent dash={dash} />
        </div>
      </main>

      <BurgerMenu
        open={dash.menuOpen}
        tab={dash.tab}
        onSelectTab={dash.setTab}
        onClose={() => dash.setMenuOpen(false)}
      />
      <DashboardModals dash={dash} />
    </div>
  );
}
