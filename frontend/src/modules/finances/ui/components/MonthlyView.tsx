import { MONTH_NAMES } from '../types';
import { useI18n } from '@core/i18n/I18nContext';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import { SummaryCards } from './SummaryCards';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';
import { CategoryChart } from './CategoryChart';
import { BudgetAlerts } from './BudgetAlerts';
import { AIAdvisor } from './AIAdvisor';
import type { MonthlyViewProps } from '../types/MonthlyView.types';

export function MonthlyView({
    year, month, isCurrentMonth, isPrevDisabled, isNextDisabled,
    transactions, summary, carryover, categories, loading, error,
    onPrev, onNext, onGoToCurrentMonth, onAddTransaction, onDeleteTransaction, onPatchTransaction, onEditTransaction, onManageCategories,
}: MonthlyViewProps) {
    const { t, tCategory } = useI18n();
    const { exportMonthCSV } = useExportCSV();

    return (
        <>
            <div className="card">
                <div className="month-nav">
                    <button onClick={onPrev} disabled={isPrevDisabled} className="btn-nav">‹ {t('app.nav.prev')}</button>
                    <div className="month-nav-center">
                        <div className="month-nav-title">
                            <span className="month-nav-title-text">
                                {MONTH_NAMES[month - 1]} {year}
                                {isCurrentMonth
                                    ? <div className="month-nav-badge">{t('app.nav.currentMonth')}</div>
                                    : <button className="month-nav-badge month-nav-badge--btn" onClick={onGoToCurrentMonth}>{t('app.nav.goToCurrentMonth')}</button>
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
                    <button onClick={onNext} disabled={isNextDisabled} className="btn-nav">{t('app.nav.next')} ›</button>
                </div>
            </div>

            {error && (
                <div style={{ background: '#4c0519', border: '1px solid #be123c', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', color: '#fca5a5' }}>
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

                <CollapsiblePanel
                    title={<>📋 {t('app.transactions.title', { count: String(transactions.length) })}</>}
                    style={{ marginBottom: '0' }}
                >
                    <TransactionTable
                        transactions={transactions}
                        onDelete={onDeleteTransaction}
                        onPatch={onPatchTransaction}
                        onEdit={onEditTransaction}
                    />
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
    );
}
