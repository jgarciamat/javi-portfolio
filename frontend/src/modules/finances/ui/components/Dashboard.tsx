import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { useAuth } from '@shared/hooks/useAuth';
import { Icon } from '@shared/components/Icon';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { useScrollToStart, useStickyBarHeight } from '@shared/hooks/useStickyBar';
import { lazyNamed } from '@shared/utils/lazyNamed';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { PlanBanner } from '@modules/billing/ui/PlanBanner';
import { HouseholdJoinPrompt } from './HouseholdJoinPrompt';
import { useFinances } from '../../application/FinancesContext';
import { useAlertNotifications } from '../../application/hooks/useAlertNotifications';
import { useBillReminders } from '../../application/hooks/useBillReminders';
import { useImportReminders } from '../../application/hooks/useImportReminders';
import { useDashboard, type UseDashboardReturn } from '../../application/hooks/useDashboard';
import { useImportRequest } from '../../application/hooks/useImportRequest';
import type { SharedContent } from '@core/share/sharedImport';
import { useWelcomeTour } from '../../application/hooks/useWelcomeTour';
import { SECTION_BY_ID, type DashboardTab } from '../navigation';
import { GuidedTour } from '../tour/GuidedTour';
import { TourOffer } from '../tour/TourOffer';
import { BurgerMenu } from './BurgerMenu';
import { InviteDialog } from './InviteDialog';
import { useOpenFirstStep } from '../../application/hooks/useOpenFirstStep';
import { EditTransactionModal } from './EditTransactionModal';
import { MonthlyView, MonthNavCard } from './MonthlyView';
import { monthAlertMessage } from './monthAlertMessage';
import { BrandLogo } from '@shared/components/BrandLogo';
import { SocialIcons } from '@shared/components/SocialLinks';
import { IosInstallHint } from '@shared/components/IosInstallHint';
import '../css/Dashboard.css';
import '../css/Sections.css';

// The monthly view is the landing tab; every other section and dialog is its own chunk.
const AnalysisView = lazyNamed(() => import('../views/AnalysisView'), 'AnalysisView');
const MoneyLeaksView = lazyNamed(() => import('../views/MoneyLeaksView'), 'MoneyLeaksView');
const AccountsView = lazyNamed(() => import('../views/AccountsView'), 'AccountsView');
const BudgetsView = lazyNamed(() => import('../views/BudgetsView'), 'BudgetsView');
const GoalsView = lazyNamed(() => import('../views/GoalsView'), 'GoalsView');
const AssetsView = lazyNamed(() => import('../views/AssetsView'), 'AssetsView');
const BusinessView = lazyNamed(() => import('../views/BusinessView'), 'BusinessView');
const LearnView = lazyNamed(() => import('../views/LearnView'), 'LearnView');
const InvestView = lazyNamed(() => import('@modules/invest/ui/InvestView'), 'InvestView');
const CryptoConsoleView = lazyNamed(
  () => import('@modules/crypto/ui/CryptoConsoleView'),
  'CryptoConsoleView'
);
const HealthView = lazyNamed(() => import('../views/HealthView'), 'HealthView');
const RentaView = lazyNamed(() => import('../views/RentaView'), 'RentaView');
const HaciendaView = lazyNamed(() => import('../views/HaciendaView'), 'HaciendaView');
const VideosView = lazyNamed(() => import('../views/VideosView'), 'VideosView');
const SplitView = lazyNamed(() => import('../views/SplitView'), 'SplitView');
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

/**
 * The tour, its offer and the install notice, one at a time. The terms dialog cannot be
 * dismissed: they all wait until the terms are accepted.
 */
function TourAndNotices({
  tour,
  onShowTab,
  termsPending,
}: {
  tour: ReturnType<typeof useWelcomeTour>;
  onShowTab: (tab: DashboardTab) => void;
  termsPending: boolean;
}) {
  if (termsPending) return null;
  return (
    <>
      {tour.offer && <TourOffer onAnswer={tour.answerOffer} />}
      {tour.open && (
        <GuidedTour
          steps={tour.steps}
          onShowTab={onShowTab}
          onClose={tour.close}
          initialDontShowAgain={tour.dontShowAgain}
          guide={tour.kind === 'guide'}
        />
      )}
      {!tour.offer && !tour.open && <IosInstallHint />}
    </>
  );
}

/** Sections that need nothing from the dashboard. */
const SIMPLE_VIEWS: Partial<
  Record<DashboardTab, (open: (tab: DashboardTab) => void) => ReactElement>
> = {
  analysis: (open) => <AnalysisView onOpenTab={open} />,
  health: () => <HealthView />,
  accounts: () => <AccountsView />,
  budgets: () => <BudgetsView />,
  goals: (open) => <GoalsView onOpenTab={open} />,
  split: () => <SplitView />,
  assets: () => <AssetsView />,
  business: (open) => <BusinessView onOpenTab={open} />,
  renta: (open) => <RentaView onOpenTab={open} />,
  hacienda: (open) => <HaciendaView onOpenTab={open} />,
  learn: (open) => <LearnView onOpenTab={open} />,
  invest: () => <InvestView />,
  crypto: () => <CryptoConsoleView />,
  videos: () => <VideosView />,
  plan: (open) => <PlanWithSteps onOpenTab={open} />,
  offers: () => <OffersView />,
};

/** "Your plan", whose first steps for an invited user open the right section. */
function PlanWithSteps({ onOpenTab }: { onOpenTab: (tab: DashboardTab) => void }) {
  return <PlanView onOpenStep={useOpenFirstStep(onOpenTab)} />;
}

function SectionLoading() {
  const { t } = useI18n();
  return (
    <p className="empty-block" role="status">
      {t('app.common.loading')}
    </p>
  );
}

/** «How does it work?»: opens the steps of the tour about the open section, and only those. */
function SectionGuideButton({ label, onStart }: { label: string; onStart: () => void }) {
  const { t } = useI18n();
  return (
    <div className="section-guide-row">
      <button
        type="button"
        className="section-guide-btn"
        onClick={onStart}
        aria-label={t('app.tour.guide.aria', { section: label })}
      >
        <Icon name="compass" size={16} /> {t('app.tour.guide.open')}
      </button>
    </div>
  );
}

function TabContent({
  dash,
  onStartTour,
  onStartFullTour,
  onImport,
}: {
  dash: UseDashboardReturn;
  onStartTour: () => void;
  onStartFullTour: () => void;
  onImport: () => void;
}) {
  const { year, categories } = useFinances();
  const simple = SIMPLE_VIEWS[dash.tab];
  if (simple) return simple(dash.setTab);
  switch (dash.tab) {
    case 'annual':
      return (
        <div className="card">
          <AnnualChart initialYear={year} onMonthClick={dash.handleMonthClick} />
        </div>
      );
    case 'leaks':
      return <MoneyLeaksView onImport={onImport} onOpenTab={dash.setTab} />;
    case 'search':
      return <SearchView onEdit={dash.setEditingTransaction} refreshKey={dash.editVersion} />;
    case 'automations':
      return <RecurringRulesTab categories={categories} />;
    case 'custom-alerts':
      return <CustomAlertsTab categories={categories} />;
    case 'settings':
      return (
        <SettingsView
          onOpenProfile={dash.openProfile}
          onStartTour={onStartTour}
          onStartFullTour={onStartFullTour}
        />
      );
    default:
      return (
        <MonthlyView
          onEditTransaction={dash.setEditingTransaction}
          onManageCategories={dash.openCategoryModal}
          onManageBudgets={() => dash.setTab('budgets')}
          onOpenTab={dash.setTab}
          onImport={onImport}
        />
      );
  }
}

function Header({ dash, sectionLabel }: { dash: UseDashboardReturn; sectionLabel: ReactNode }) {
  const { t } = useI18n();
  const { logout } = useAuth();
  return (
    <header className="header">
      <div className="header-brand">
        <button
          className="burger-btn"
          data-tour="menu"
          onClick={() => dash.setMenuOpen(true)}
          aria-label={t('app.menu.open')}
          aria-expanded={dash.menuOpen}
        >
          <BrandLogo className="burger-btn-logo" size={28} />
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
        <SocialIcons />
      </div>
      <button
        type="button"
        className="header-learn-btn"
        data-tour="learn-btn"
        onClick={() => dash.setTab('videos')}
        aria-label={t('app.header.learn')}
        aria-current={dash.tab === 'videos' ? 'page' : undefined}
      >
        <Icon name="video" size={18} />
        <span className="header-learn-long">{t('app.header.learn')}</span>
        <span className="header-learn-short" aria-hidden="true">
          {t('app.header.learnShort')}
        </span>
      </button>
      <div className="header-actions">
        <LanguageSwitcher />
        <button onClick={logout} className="btn-logout">
          {t('app.header.logout')}
        </button>
      </div>
    </header>
  );
}

/** Dialogs opened from anywhere in the dashboard. */
function DashboardModals({
  dash,
  shared,
}: {
  dash: UseDashboardReturn;
  /** What another app shared with Finanverso, for the importer. */
  shared: SharedContent | null;
}) {
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
      {dash.showProfile && (
        <ProfilePage
          onClose={dash.closeProfile}
          onOpenSettings={() => {
            dash.closeProfile();
            dash.setTab('settings');
          }}
          onOpenPlan={() => {
            dash.closeProfile();
            dash.setTab('plan');
          }}
        />
      )}
      {dash.showImport && (
        <ImportModal
          accounts={finances.accounts}
          categories={finances.categories}
          shared={shared}
          initialSource={dash.importSource}
          onClose={dash.closeImport}
          onImported={() => finances.refresh({ invalidate: true })}
          onOpenLeaks={() => {
            dash.closeImport();
            dash.setTab('leaks');
          }}
          onOpenGoals={() => {
            dash.closeImport();
            dash.setTab('goals');
          }}
          onOpenBudgets={() => {
            dash.closeImport();
            dash.setTab('budgets');
          }}
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
  useBillReminders(!!settings?.notificationsEnabled, settings?.currentPeriod ?? null);
  useImportReminders(!!settings?.notificationsEnabled, settings?.monthStartDay ?? null);
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
  const sectionLabel = t(section.labelKey);
  const tour = useWelcomeTour(dash.tab, dash.setTab);
  const shared = useImportRequest(dash.openImport);
  useBudgetAlertNotifications();

  // The browser tab names the open section: "Presupuestos · Finanverso".
  const appName = t('app.header.title');
  useEffect(() => {
    const previous = document.title;
    document.title = `${sectionLabel} · ${appName}`;
    return () => {
      document.title = previous;
    };
  }, [sectionLabel, appName]);

  // A section chosen in the menu takes the focus (after the menu gives it back to its button).
  const sectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  useStickyBarHeight(stickyRef);
  useScrollToStart(dash.tab, finances.year, finances.month);
  const [menuPicks, setMenuPicks] = useState(0);
  useEffect(() => {
    if (menuPicks > 0) sectionRef.current!.focus();
  }, [menuPicks]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const selectFromMenu = (next: DashboardTab) => {
    dash.setTab(next);
    setMenuPicks((n) => n + 1);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-sticky" ref={stickyRef}>
        <Header
          dash={dash}
          sectionLabel={
            <>
              <span className="section-badge" style={{ color: section.color }}>
                <Icon name={section.icon} size={14} />
              </span>{' '}
              {sectionLabel}
            </>
          }
        />
        {dash.tab === 'monthly' && (
          <div className="sticky-nav">
            <div className="sticky-nav-inner">
              <MonthNavCard />
            </div>
          </div>
        )}
      </div>

      <main className="main">
        <PlanBanner onOpenPlan={() => dash.setTab('plan')} />
        <HouseholdJoinPrompt />
        <div
          ref={sectionRef}
          className="dashboard-section"
          role="region"
          aria-label={sectionLabel}
          tabIndex={-1}
          data-tour="section"
          style={{ '--section-color': section.color } as CSSProperties}
        >
          {tour.hasGuide && <SectionGuideButton label={sectionLabel} onStart={tour.startGuide} />}
          {/* A failing section does not take the menu down; changing section clears the error. */}
          <ErrorBoundary key={dash.tab}>
            <Suspense fallback={<SectionLoading />}>
              <TabContent
                dash={dash}
                onStartTour={tour.start}
                onStartFullTour={tour.startFull}
                onImport={dash.openImport}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      <BurgerMenu
        open={dash.menuOpen}
        tab={dash.tab}
        onSelectTab={selectFromMenu}
        onOpenProfile={dash.openProfile}
        onOpenInvite={() => setInviteOpen(true)}
        onClose={() => dash.setMenuOpen(false)}
      />
      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
      <Suspense fallback={null}>
        <DashboardModals dash={dash} shared={shared} />
      </Suspense>
      <TourAndNotices
        tour={tour}
        onShowTab={dash.setTab}
        termsPending={!!plan?.overview?.terms.mustAccept}
      />
    </div>
  );
}
