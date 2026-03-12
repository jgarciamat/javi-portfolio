import { MONTH_NAMES } from '../types';
import '../css/TransactionViews.css';
import { useI18n } from '@core/i18n/I18nContext';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { useTransactionView } from '../../application/hooks/useTransactionView';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import { SummaryCards } from './SummaryCards';
import { TransactionTable } from './TransactionTable';
import { TransactionWeekView } from './TransactionWeekView';
import { TransactionCalendarView } from './TransactionCalendarView';
import { TransactionForm } from './TransactionForm';
import { CategoryChart } from './CategoryChart';
import { BudgetAlerts } from './BudgetAlerts';
import { AIAdvisor } from './AIAdvisor';
import type { MonthlyViewProps } from '../types/MonthlyView.types';
import type { WeekGroup } from '@modules/finances/domain/transactionGrouping';
import type { CalendarCell } from '@modules/finances/domain/transactionGrouping';
import type { TransactionViewMode } from '../../application/hooks/useTransactionView';
import type { Transaction } from '@modules/finances/domain/types';

// ─── Sub-component: transaction tabs + collapsible panel ─────────────────────

const TX_VIEW_MODES = [
    { value: 'day' as const, icon: '☀️', labelKey: 'app.transactions.view.day' as const },
    { value: 'week' as const, icon: '📅', labelKey: 'app.transactions.view.week' as const },
    { value: 'calendar' as const, icon: '🗓️', labelKey: 'app.transactions.view.calendar' as const },
];

interface TxPanelProps {
    mode: TransactionViewMode;
    setMode: (m: TransactionViewMode) => void;
    transactions: Transaction[];
    weekGroups: WeekGroup[];
    calendarRows: CalendarCell[][];
    year: number;
    month: number;
    onDeleteTransaction: MonthlyViewProps['onDeleteTransaction'];
    onPatchTransaction: MonthlyViewProps['onPatchTransaction'];
    onEditTransaction: MonthlyViewProps['onEditTransaction'];
    t: (key: string, params?: Record<string, string>) => string;
}

function TransactionPanel({ mode, setMode, transactions, weekGroups, calendarRows, year, month, onDeleteTransaction, onPatchTransaction, onEditTransaction, t }: TxPanelProps) {
    return (
        <>
            {transactions.length > 0 && (
                <nav className="tx-tabs" role="tablist" aria-label={t('app.transactions.title', { count: '' }).trim()}>
                    {TX_VIEW_MODES.map(({ value, icon, labelKey }) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={mode === value}
                            className={`tab-btn${mode === value ? ' active' : ''}`}
                            onClick={() => setMode(value)}
                        >
                            {icon} {t(labelKey)}
                        </button>
                    ))}
                </nav>
            )}
            <CollapsiblePanel
                title={<>📋 {t('app.transactions.title', { count: String(transactions.length) })}</>}
                style={{ marginBottom: '0' }}
            >
                {mode === 'day' && (
                    <TransactionTable
                        transactions={transactions}
                        onDelete={onDeleteTransaction}
                        onPatch={onPatchTransaction}
                        onEdit={onEditTransaction}
                    />
                )}
                {mode === 'week' && <TransactionWeekView weekGroups={weekGroups} />}
                {mode === 'calendar' && (
                    <TransactionCalendarView calendarRows={calendarRows} year={year} month={month} />
                )}
            </CollapsiblePanel>
        </>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MonthlyView({
    year, month, isCurrentMonth, isPrevDisabled, isNextDisabled,
    transactions, summary, carryover, categories, loading, error,
    onPrev, onNext, onGoToCurrentMonth, onAddTransaction, onDeleteTransaction, onPatchTransaction, onEditTransaction, onManageCategories,
}: MonthlyViewProps) {
    const { t, tCategory, locale } = useI18n();
    const { exportMonthCSV } = useExportCSV();
    const { mode, setMode, weekGroups, calendarRows } = useTransactionView({
        transactions,
        locale,
        year,
        month,
    });

    return (
        <>
            <div className="card">
                <nav className="month-nav" aria-label={t('app.nav.ariaLabel')}>
                    <button onClick={onPrev} disabled={isPrevDisabled} className="btn-nav" title={t('app.nav.prev')}>‹ {t('app.nav.prev')}</button>
                    <div className="month-nav-center">
                        <div className="month-nav-title">
                            <span className="month-nav-title-text">
                                {MONTH_NAMES[month - 1]} {year}
                                {isCurrentMonth
                                    ? <div className="month-nav-badge">{t('app.nav.currentMonth')}</div>
                                    : <button className="month-nav-badge month-nav-badge--btn" onClick={onGoToCurrentMonth} title={t('app.nav.goToCurrentMonth')}>{t('app.nav.goToCurrentMonth')}</button>
                                }
                            </span>
                            {transactions.length > 0 && (
                                <OptionsDropdown
                                    ariaLabel={t('app.export.options')}
                                    options={[{
                                        icon: '📥',
                                        label: t('app.export.month'),
                                        onClick: () => exportMonthCSV(transactions, summary, year, month, tCategory),
                                    }]}
                                />
                            )}
                        </div>
                    </div>
                    <button onClick={onNext} disabled={isNextDisabled} className="btn-nav" title={t('app.nav.next')}>{t('app.nav.next')} ›</button>
                </nav>
            </div>

            {error && (
                <div role="alert" style={{ background: '#4c0519', border: '1px solid #be123c', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', color: '#fca5a5' }}>
                    ⚠️ {t('app.error.backendDown', { error })}
                </div>
            )}

            <div className="month-content">
                {loading && (
                    <div className="month-loading-overlay" aria-label={t('app.loading')}>
                        <svg className="month-spinner" viewBox="0 0 50 50" aria-hidden="true">
                            <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                        </svg>
                    </div>
                )}

                <BudgetAlerts summary={summary} carryover={carryover} />
                {summary && <SummaryCards summary={summary} carryover={carryover} />}

                <TransactionForm
                    categories={categories}
                    onSubmit={(dto) => onAddTransaction(dto).then(() => { })}
                    onManageCategories={onManageCategories}
                    viewYear={year}
                    viewMonth={month}
                    availableBalance={(carryover ?? 0) + (summary?.balance ?? 0)}
                />

                <AIAdvisor year={year} month={month} />

                {/* ── Transaction tabs + panel ───────────────────────────── */}
                <TransactionPanel
                    mode={mode}
                    setMode={setMode}
                    transactions={transactions}
                    weekGroups={weekGroups}
                    calendarRows={calendarRows}
                    year={year}
                    month={month}
                    onDeleteTransaction={onDeleteTransaction}
                    onPatchTransaction={onPatchTransaction}
                    onEditTransaction={onEditTransaction}
                    t={t}
                />

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
    );
}
