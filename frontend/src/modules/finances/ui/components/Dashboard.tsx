import { Suspense, type ReactElement } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useAuth } from '@shared/hooks/useAuth';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { lazyNamed } from '@shared/utils/lazyNamed';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { PlanBanner } from '@modules/billing/ui/PlanBanner';
import { useFinances } from '../../application/FinancesContext';
import { useAlertNotifications } from '../../application/hooks/useAlertNotifications';
import { useDashboard, type UseDashboardReturn } from '../../application/hooks/useDashboard';
import { useWelcomeTour } from '../../application/hooks/useWelcomeTour';
import { SECTION_BY_ID, type DashboardTab } from '../navigation';
import { GuidedTour } from '../tour/GuidedTour';
import { BurgerMenu } from './BurgerMenu';
import { EditTransactionModal } from './EditTransactionModal';
import { MonthlyView, MonthNavCard } from './MonthlyView';
import { monthAlertMessage } from './monthAlertMessage';
import '../css/Dashboard.css';
import '../css/Sections.css';

// The monthly view is the landing tab; every other section and dialog is its own chunk.
const AnalysisView = lazyNamed(() => import('../views/AnalysisView'), 'AnalysisView');
const AccountsView = lazyNamed(() => import('../views/AccountsView'), 'AccountsView');
const BudgetsView = lazyNamed(() => import('../views/BudgetsView'), 'BudgetsView');
const GoalsView = lazyNamed(() => import('../views/GoalsView'), 'GoalsView');
const SearchView = lazyNamed(() => import('../views/SearchView'), 'SearchView');
const SettingsView = lazyNamed(() => import('../views/SettingsView'), 'SettingsView');
const PlanView = lazyNamed(() => import('@modules/billing/ui/PlanView'), 'PlanView');
const OffersView = lazyNamed(() => import('@modules/billing/ui/OffersView'), 'OffersView');
const AnnualChart = lazyNamed(() => import('./AnnualChart'), 'AnnualChart');
const RecurringRulesTab = lazyNamed(() => import('./RecurringRulesTab'), 'RecurringRulesTab');
const CustomAlertsTab = lazyNamed(() => import('./CustomAlertsTab'), 'CustomAlertsTab');
const CategoryManager = lazyNamed(() => import('./CategoryManager'), 'CategoryManager');
const ImportModal = lazyNamed(() => import('./ImportModal'), 'ImportModal');
const ProfilePage = lazyNamed(() => import('@modules/auth/ui/ProfilePage'), 'ProfilePage');

/** Sections that need nothing from the dashboard. */
const SIMPLE_VIEWS: Partial<Record<DashboardTab, () => ReactElement>> = {
  analysis: () => <AnalysisView />,
  accounts: () => <AccountsView />,
  budgets: () => <BudgetsView />,
  goals: () => <GoalsView />,
  plan: () => <PlanView />,
  offers: () => <OffersView />,
};

function SectionLoading() {
  const { t } = useI18n();
  return (
    <p className="empty-block" role="status">
      {t('app.common.loading')}
    </p>
  );
}

function TabContent({ dash, onStartTour }: { dash: UseDashboardReturn; onStartTour: () => void }) {
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
      return <SettingsView onOpenProfile={dash.openProfile} onStartTour={onStartTour} />;
    default:
      return (
        <MonthlyView
          onEditTransaction={dash.setEditingTransaction}
          onManageCategories={dash.openCategoryModal}
          onManageBudgets={() => dash.setTab('budgets')}
          onOpenTab={dash.setTab}
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
  const tour = useWelcomeTour(dash.tab, dash.setTab);
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
        <div role="region" aria-label={t(section.labelKey)} data-tour="section">
          {/* A failing section does not take the menu down; changing section clears the error. */}
          <ErrorBoundary key={dash.tab}>
            <Suspense fallback={<SectionLoading />}>
              <TabContent dash={dash} onStartTour={tour.start} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <BurgerMenu
        open={dash.menuOpen}
        tab={dash.tab}
        onSelectTab={dash.setTab}
        onClose={() => dash.setMenuOpen(false)}
      />
      <Suspense fallback={null}>
        <DashboardModals dash={dash} />
      </Suspense>
      {tour.open && (
        <GuidedTour
          steps={tour.steps}
          onShowTab={dash.setTab}
          onClose={tour.close}
          initialDontShowAgain={tour.dontShowAgain}
        />
      )}
    </div>
  );
}
