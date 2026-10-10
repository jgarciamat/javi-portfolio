import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { OptionsDropdown, type DropdownOption } from '@shared/components/OptionsDropdown';
import { todayDateOnly } from '@shared/utils/format';
import type { Transaction, TransactionType } from '@modules/finances/domain/types';
import { useFinances } from '../../application/FinancesContext';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import {
  useTransactionView,
  type TransactionViewMode,
} from '../../application/hooks/useTransactionView';
import { useGettingStarted } from '../../application/hooks/useGettingStarted';
import type { DashboardTab } from '../navigation';
import { AIAdvisor } from './AIAdvisor';
import { BudgetProgress } from './BudgetProgress';
import { CategoryChart } from './CategoryChart';
import { CustomAlertsBanner } from './CustomAlertsBanner';
import { ForecastPanel } from './ForecastPanel';
import { GettingStarted } from './GettingStarted';
import { MonthRecap } from './MonthRecap';
import { MonthAlerts } from './MonthAlerts';
import { SummaryCards } from './SummaryCards';
import { TransactionCalendarView } from './TransactionCalendarView';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { TransactionWeekView } from './TransactionWeekView';
import '../css/TransactionViews.css';

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

export function MonthNavCard({ onImport }: { onImport?: () => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const { exportMonthCSV } = useExportCSV();
  const f = useFinances();
  const range = periodRange(f.year, f.month, f.periodStart, f.periodEnd);
  const options: DropdownOption[] = [];
  if (f.transactions.length > 0) {
    options.push({
      icon: '📥',
      label: t('app.export.month'),
      onClick: () => exportMonthCSV(f.transactions, f.summary, f.year, f.month),
    });
  }
  if (onImport) options.push({ icon: '📤', label: t('app.import.open'), onClick: onImport });

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
            {options.length > 0 && (
              <OptionsDropdown ariaLabel={t('app.export.options')} options={options} />
            )}
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

function MovementsPanel({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { t, locale } = useI18n();
  const f = useFinances();
  const range = useMemo(
    () => periodRange(f.year, f.month, f.periodStart, f.periodEnd),
    [f.year, f.month, f.periodStart, f.periodEnd]
  );
  const view = useTransactionView({
    transactions: f.transactions,
    locale,
    year: f.year,
    month: f.month,
    range,
  });

  return (
    <>
      {f.transactions.length > 0 && (
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
        title={<>📋 {t('app.transactions.title', { count: f.transactions.length })}</>}
        className="collapsible-panel--flush"
        tourId="movements"
      >
        {view.mode === 'day' && (
          <TransactionTable
            transactions={f.transactions}
            onDelete={f.removeTransaction}
            onPatch={f.patchTransaction}
            onEdit={onEdit}
          />
        )}
        {view.mode === 'week' && <TransactionWeekView weekGroups={view.weekGroups} />}
        {view.mode === 'calendar' && (
          <TransactionCalendarView
            calendarRows={view.calendarRows}
            year={f.year}
            month={f.month}
            range={range}
          />
        )}
      </CollapsiblePanel>
    </>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

interface MonthlyViewProps {
  onEditTransaction: (tx: Transaction) => void;
  onManageCategories: () => void;
  onManageBudgets: () => void;
  onOpenTab: (tab: DashboardTab) => void;
}

export function MonthlyView({
  onEditTransaction,
  onManageCategories,
  onManageBudgets,
  onOpenTab,
}: MonthlyViewProps) {
  const { t } = useI18n();
  const f = useFinances();
  const checklist = useGettingStarted();
  const [params, setParams] = useSearchParams();
  const quickAdd = QUICK_ADD[params.get('add') ?? ''] ?? null;
  // Until the month arrives its first day is a good guess for the period start.
  const defaultDate = f.isCurrentPeriod
    ? todayDateOnly()
    : f.periodStart ?? `${f.year}-${String(f.month).padStart(2, '0')}-01`;

  return (
    <>
      {f.error && (
        <div role="alert" className="error-banner">
          ⚠️ {t('app.error.backendDown', { error: f.error })}
        </div>
      )}

      <div className="month-content">
        {f.loading && (
          <div className="month-loading-overlay" role="status" aria-label={t('app.loading')}>
            <svg className="month-spinner" viewBox="0 0 50 50" aria-hidden="true">
              <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
            </svg>
          </div>
        )}

        <MonthAlerts alerts={f.alerts} />
        <CustomAlertsBanner summary={f.summary} carryover={f.carryover} />
        {f.summary && <SummaryCards summary={f.summary} carryover={f.carryover} />}
        {f.isCurrentPeriod &&
          (checklist.visible ? (
            <GettingStarted checklist={checklist} onOpenTab={onOpenTab} />
          ) : (
            <MonthRecap />
          ))}
        {f.isCurrentPeriod && <ForecastPanel />}

        <BudgetProgress budgets={f.budgets} onManage={onManageBudgets} />
        <AIAdvisor year={f.year} month={f.month} onAnalyzed={() => checklist.complete('ai')} />
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
        />
        <MovementsPanel onEdit={onEditTransaction} />

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
