import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { todayDateOnly } from '@shared/utils/format';
import type { Transaction, TransactionType } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import {
  useTransactionView,
  type TransactionViewMode,
} from '../../application/hooks/useTransactionView';
import { useGettingStarted } from '../../application/hooks/useGettingStarted';
import { useEnoughData } from '../../application/hooks/useEnoughData';
import { useTransactionBulk } from '../../application/hooks/useTransactionBulk';
import { useRowSelection } from '@shared/hooks/useRowSelection';
import { TransactionBulkActions } from './TransactionBulkActions';
import { useOpenFirstStep } from '../../application/hooks/useOpenFirstStep';
import { InviteeGoal } from '@modules/billing/ui/InviteeGoal';
import type { DashboardTab } from '../navigation';
import { AIAdvisor } from './AIAdvisor';
import { BudgetProgress } from './BudgetProgress';
import { CapturedPayments } from './CapturedPayments';
import { CategoryChart } from './CategoryChart';
import { CustomAlertsBanner } from './CustomAlertsBanner';
import { EmptyMonthPanel } from './EmptyMonthPanel';
import type { ImportSource } from './ImportSources';
import { ForecastPanel } from './ForecastPanel';
import { GettingStarted } from './GettingStarted';
import { RatePrompt } from './RatePrompt';
import { MonthRecap } from './MonthRecap';
import { LeaksTeaser } from './LeaksTeaser';
import { MonthActions } from './MonthActions';
import { MonthAlerts } from './MonthAlerts';
import { AccountCards } from './AccountCards';
import { QuickAdd } from './QuickAdd';
import { SampleDataCard } from './SampleDataCard';
import { SummaryCards } from './SummaryCards';
import { TransactionCalendarView } from './TransactionCalendarView';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { TransactionWeekView } from './TransactionWeekView';
import '../css/TransactionViews.css';
import { Icon } from '@shared/components/Icon';

/** The period differs from the calendar month (custom month start day). */
export function periodRange(
  year: number,
  month: number,
  start: string | null,
  end: string | null
): { start: string; end: string } | null {
  const calendarStart = `${year}-${String(month).padStart(2, '0')}-01`;
  return start && end && start !== calendarStart ? { start, end } : null;
}

// ─── Month navigator (sticky bar of the dashboard) ───────────────────────────

export function MonthNavCard() {
  const format = useFormat();
  const { t } = useI18n();
  const f = useFinances();
  const range = periodRange(f.year, f.month, f.periodStart, f.periodEnd);

  return (
    <div className="card" data-tour="month-nav">
      <nav className="month-nav" aria-label={t('app.nav.ariaLabel')}>
        <button onClick={f.goToPrev} disabled={f.isPrevDisabled} className="btn-nav">
          ‹ {t('app.nav.prev')}
        </button>
        <div className="month-nav-center">
          <div className="month-nav-title">
            <span className="month-nav-title-text">
              {format.monthLabel(f.year, f.month)}
              {f.isCurrentPeriod ? (
                <span className="month-nav-badge">{t('app.nav.currentMonth')}</span>
              ) : (
                <button className="month-nav-badge month-nav-badge--btn" onClick={f.goToCurrent}>
                  {t('app.nav.goToCurrentMonth')}
                </button>
              )}
            </span>
          </div>
          {range && <div className="month-nav-range">{format.range(range.start, range.end)}</div>}
        </div>
        <button onClick={f.goToNext} disabled={f.isNextDisabled} className="btn-nav">
          {t('app.nav.next')} ›
        </button>
      </nav>
    </div>
  );
}

/** `?add=expense|income|saving` (the app icon shortcuts) opens the new-movement form. */
const QUICK_ADD: Record<string, TransactionType> = {
  expense: 'EXPENSE',
  income: 'INCOME',
  saving: 'SAVING',
};

// ─── Movements panel ──────────────────────────────────────────────────────────

const VIEW_MODES: { value: TransactionViewMode; icon: string; labelKey: string }[] = [
  { value: 'day', icon: '☀️', labelKey: 'app.transactions.view.day' },
  { value: 'week', icon: '📅', labelKey: 'app.transactions.view.week' },
  { value: 'calendar', icon: '🗓️', labelKey: 'app.transactions.view.calendar' },
];

function MovementsPanel({
  onEdit,
  accountId,
}: {
  onEdit: (tx: Transaction) => void;
  accountId: string | null;
}) {
  const { t, locale } = useI18n();
  const f = useFinances();
  const showAccount = f.accounts.filter((a) => !a.archived).length > 1;
  const bulk = useTransactionBulk();
  const transactions = useMemo(() => {
    const hidden = new Set(bulk.hidden);
    return f.transactions.filter(
      (tx) => !hidden.has(tx.id) && (!accountId || tx.accountId === accountId)
    );
  }, [f.transactions, accountId, bulk.hidden]);
  const range = useMemo(
    () => periodRange(f.year, f.month, f.periodStart, f.periodEnd),
    [f.year, f.month, f.periodStart, f.periodEnd]
  );
  const view = useTransactionView({
    transactions,
    locale,
    year: f.year,
    month: f.month,
    range,
  });
  // Rows in the order of the view on screen, so Shift ranges follow what the user sees.
  const order = useMemo(
    () =>
      (view.mode === 'week' ? view.weekGroups.flatMap((w) => w.days) : view.dayGroups).flatMap(
        (d) => d.items.map((tx) => tx.id)
      ),
    [view.mode, view.weekGroups, view.dayGroups]
  );
  const selection = useRowSelection(order);

  return (
    <>
      {transactions.length > 0 && (
        <div className="tx-tabs" role="tablist" aria-label={t('app.transactions.viewMode')}>
          {VIEW_MODES.map(({ value, icon, labelKey }) => (
            <button
              key={value}
              role="tab"
              aria-selected={view.mode === value}
              className={`tab-btn${view.mode === value ? ' active' : ''}`}
              onClick={() => view.setMode(value)}
            >
              {icon} {t(labelKey)}
            </button>
          ))}
        </div>
      )}
      <CollapsiblePanel
        title={
          <>
            <Icon name="clipboard" /> {t('app.transactions.title', { count: transactions.length })}
          </>
        }
        className="collapsible-panel--flush"
        tourId="movements"
      >
        {view.mode === 'day' && (
          <TransactionTable
            transactions={transactions}
            showAccount={showAccount}
            onDelete={f.removeTransaction}
            onPatch={f.patchTransaction}
            onEdit={onEdit}
            selection={selection}
            pageKey={`${f.year}-${f.month}|${accountId ?? ''}`}
          />
        )}
        {view.mode === 'week' && (
          <TransactionWeekView weekGroups={view.weekGroups} selection={selection} />
        )}
        {view.mode === 'calendar' && (
          <TransactionCalendarView
            calendarRows={view.calendarRows}
            year={f.year}
            month={f.month}
            range={range}
          />
        )}
      </CollapsiblePanel>
      {/* Outside the panel: its clipping would keep the bar from sticking to the screen. */}
      <TransactionBulkActions selection={selection} transactions={transactions} bulk={bulk} />
    </>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

const quickAddOf = (param: string | null): TransactionType | null => QUICK_ADD[param ?? ''] ?? null;

/** Today in the current period; until the month arrives its first day is a good guess. */
function defaultDateOf(f: ReturnType<typeof useFinances>): string {
  return f.isCurrentPeriod
    ? todayDateOnly()
    : (f.periodStart ?? `${f.year}-${String(f.month).padStart(2, '0')}-01`);
}

/**
 * «Do I reach the end of the month?», once there are movements enough for it to mean something;
 * before that, a calm line instead of red warnings about data not there yet.
 */
function Forecast({ empty }: { empty: boolean }) {
  const { t } = useI18n();
  const enough = useEnoughData();
  if (enough) return <ForecastPanel />;
  if (empty) return null;
  return (
    <p className="card section-hint forecast-not-yet">
      <Icon name="sparkles" /> {t('app.forecast.notYet')}
    </p>
  );
}

/** Only for the current period: first steps or the recap, the rate prompt and the forecast. */
function CurrentPeriodPanels({
  checklist,
  onOpenTab,
  onAddMovement,
  empty,
}: {
  checklist: ReturnType<typeof useGettingStarted>;
  onOpenTab: (tab: DashboardTab) => void;
  /** Opens the form of a new movement (the first step of «First steps»). */
  onAddMovement: () => void;
  empty: boolean;
}) {
  const f = useFinances();
  const openStep = useOpenFirstStep(onOpenTab);
  if (!f.isCurrentPeriod) return null;
  return (
    <>
      <InviteeGoal onOpenStep={openStep} dismissible refreshKey={f.transactions.length} />
      {checklist.visible ? (
        <GettingStarted checklist={checklist} onOpenTab={onOpenTab} onAddMovement={onAddMovement} />
      ) : (
        <MonthRecap />
      )}
      {!checklist.visible && (
        <RatePrompt movements={f.transactions.length} onInvite={() => onOpenTab('plan')} />
      )}
      <LeaksTeaser onOpen={() => onOpenTab('leaks')} />
      <Forecast empty={empty} />
    </>
  );
}

/** Spinner over the month while it loads. */
function MonthLoading() {
  const { t } = useI18n();
  return (
    <div className="month-loading-overlay" role="status" aria-label={t('app.loading')}>
      <svg className="month-spinner" viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
      </svg>
    </div>
  );
}

interface MonthlyViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onManageCategories: () => void;
  onManageBudgets: () => void;
  onOpenTab: (tab: DashboardTab) => void;
  /** Opens the bank statement importer (free and unlimited on every plan), on one of its tabs. */
  onImport?: (source?: ImportSource) => void;
}

export function MonthlyView({
  onEditTransaction,
  onManageCategories,
  onManageBudgets,
  onOpenTab,
  onImport,
}: MonthlyViewProps) {
  const { t } = useI18n();
  const f = useFinances();
  const checklist = useGettingStarted();
  const [params, setParams] = useSearchParams();
  const quickAdd = quickAddOf(params.get('add'));
  const defaultDate = defaultDateOf(f);
  const activeAccounts = f.accounts.filter((a) => !a.archived);
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [accountRequest, setAccountRequest] = useState<{ id: string } | null>(null);
  // An account that was archived or deleted no longer filters anything.
  const filterId = activeAccounts.some((a) => a.id === accountFilter) ? accountFilter : null;
  /** Nothing in the month yet: what to do first, and nothing that needs movements. */
  const empty = f.transactions.length === 0 && !f.loading;
  const addExpense = () => setParams({ add: 'expense' }, { replace: true });
  const importFile = onImport && (() => onImport());
  // Before the first movement it is an option of the empty month; then, the line of sample data.
  const sample = <SampleDataCard onOpenLeaks={() => onOpenTab('leaks')} onImport={importFile} />;

  return (
    <>
      {f.error && (
        <div role="alert" className="error-banner">
          <Icon name="alert" /> {t('app.error.backendDown', { error: f.error })}
        </div>
      )}

      <div className="month-content">
        {f.loading && <MonthLoading />}

        <MonthAlerts alerts={f.alerts} />
        <CustomAlertsBanner summary={f.summary} carryover={f.carryover} />
        {f.isCurrentPeriod && <CapturedPayments />}
        {empty ? (
          <EmptyMonthPanel onImport={onImport} onAddExpense={addExpense}>
            {sample}
          </EmptyMonthPanel>
        ) : (
          <>
            <MonthActions onImport={importFile} />
            {sample}
          </>
        )}
        {/* Near the top: on a phone it is the quickest way to note a movement down. */}
        <QuickAdd
          transactions={f.transactions}
          defaultDate={defaultDate}
          onAdd={f.addTransaction}
        />
        <TransactionForm
          categories={f.categories}
          accounts={f.accounts}
          onSubmit={async (dto) => {
            await f.addTransaction(dto);
          }}
          onManageCategories={onManageCategories}
          defaultDate={defaultDate}
          availableBalance={f.available}
          quickAdd={quickAdd}
          onQuickAddDone={() => setParams({}, { replace: true })}
          accountRequest={accountRequest}
          transactions={f.transactions}
        />
        {f.summary && <SummaryCards summary={f.summary} carryover={f.carryover} />}
        {activeAccounts.length > 1 && (
          <AccountCards
            accounts={activeAccounts}
            selectedId={filterId}
            onSelect={setAccountFilter}
            onAdd={(id) => setAccountRequest({ id })}
            onTransfer={() => onOpenTab('accounts')}
          />
        )}
        <CurrentPeriodPanels
          checklist={checklist}
          onOpenTab={onOpenTab}
          onAddMovement={addExpense}
          empty={empty}
        />

        <BudgetProgress budgets={f.budgets} onManage={onManageBudgets} />
        {!empty && (
          <>
            <AIAdvisor year={f.year} month={f.month} onAnalyzed={() => checklist.complete('ai')} />
            <MovementsPanel onEdit={onEditTransaction} accountId={filterId} />
          </>
        )}

        {f.summary && f.transactions.length > 0 && (
          <CollapsiblePanel
            title={`📊 ${t('app.categoryChart.title')}`}
            className="collapsible-panel--spaced"
          >
            <CategoryChart summary={f.summary} />
          </CollapsiblePanel>
        )}
      </div>
    </>
  );
}
