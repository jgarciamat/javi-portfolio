import { useAnnualSummary } from '../../application/hooks/useAnnualSummary';
import { useAnnualChart } from '../../application/hooks/useAnnualChart';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import '../css/AnnualChart.css';
import type { AnnualChartProps } from '../types';
import { MONTH_SHORT, fmtCurrency, buildAnnualChartData } from '../types/AnnualChart.types';
import { isMonthInFuture } from '@modules/finances/domain/nextMonthLogic';
import { useI18n } from '@core/i18n/I18nContext';
import { AnnualMonthTable } from './AnnualMonthTable';

interface TotalsProps {
    totals: { income: number; expenses: number; saving: number };
    t: (k: string) => string;
}

function AnnualTotals({ totals, t }: TotalsProps) {
    const balance = totals.income - totals.expenses - totals.saving;
    const balanceColor = balance >= 0 ? '#6366f1' : '#ef4444';
    return (
        <div className="annual-totals">
            <div className="annual-total-card" style={{ borderColor: '#4ade80' }}>
                <span className="annual-total-label">{t('app.annual.totalIncome')}</span>
                <span className="annual-total-value" style={{ color: '#4ade80' }}>{fmtCurrency(totals.income)}</span>
            </div>
            <div className="annual-total-card" style={{ borderColor: '#f87171' }}>
                <span className="annual-total-label">{t('app.annual.totalExpenses')}</span>
                <span className="annual-total-value" style={{ color: '#f87171' }}>{fmtCurrency(totals.expenses)}</span>
            </div>
            <div className="annual-total-card" style={{ borderColor: '#a78bfa' }}>
                <span className="annual-total-label">{t('app.annual.totalSaving')}</span>
                <span className="annual-total-value" style={{ color: '#a78bfa' }}>{fmtCurrency(totals.saving)}</span>
            </div>
            <div className="annual-total-card" style={{ borderColor: balanceColor }}>
                <span className="annual-total-label">{t('app.annual.annualBalance')}</span>
                <span className="annual-total-value" style={{ color: balanceColor }}>
                    {fmtCurrency(balance)}
                </span>
            </div>
        </div>
    );
}

export function AnnualChart({ initialYear, onMonthClick }: AnnualChartProps) {
    const { year, tooltip, showTooltip, moveTooltip, hideTooltip, leaveBar, prevYear, nextYear, prevYearDisabled, nextYearDisabled } = useAnnualChart(initialYear);
    const { data, loading, error } = useAnnualSummary(year);
    const { months, maxVal, totals } = buildAnnualChartData(data);
    const { t } = useI18n();
    const { exportAnnualCSV } = useExportCSV();

    const now = new Date();

    return (
        <div className="annual-view">
            {/* Year picker */}
            <div className="annual-header">
                <button className="btn-nav" onClick={prevYear} disabled={prevYearDisabled}>‹ {year - 1}</button>
                <h2 className="annual-title">
                    {t('app.annual.title')} {year}
                    {months.length > 0 && (
                        <OptionsDropdown
                            ariaLabel={t('app.export.options')}
                            options={[
                                {
                                    icon: '📥',
                                    label: t('app.export.annual'),
                                    onClick: () => exportAnnualCSV(months, year),
                                },
                            ]}
                        />
                    )}
                </h2>
                <button className="btn-nav" onClick={nextYear} disabled={nextYearDisabled}>
                    {year + 1} ›
                </button>
            </div>

            {/* Legend */}
            <div className="annual-legend">
                <span className="legend-dot" style={{ background: '#4ade80' }} /> {t('app.annual.legend.income')}
                <span className="legend-dot" style={{ background: '#f87171' }} /> {t('app.annual.legend.expenses')}
                <span className="legend-dot" style={{ background: '#a78bfa' }} /> {t('app.annual.legend.saving')}
            </div>

            {loading && (
                <div className="annual-empty">⏳ {t('app.annual.loading')}</div>
            )}
            {error && (
                <div className="annual-empty" style={{ color: '#f87171' }}>⚠️ {error}</div>
            )}

            {!loading && !error && (
                <>
                    {/* Chart */}
                    <div className="annual-chart-wrap" onMouseLeave={hideTooltip}>
                        <div className="annual-chart">
                            {months.map(({ month, income, expenses, saving }) => (
                                <div key={month} className="annual-col">
                                    <div className="annual-bars">
                                        <div className="annual-bar-group">
                                            <div
                                                className="annual-bar annual-bar-income"
                                                style={{ height: `${(income / maxVal) * 100}%` }}
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `${t('app.annual.legend.income')}: ${fmtCurrency(income)}`, '#4ade80')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `${t('app.annual.legend.income')}: ${fmtCurrency(income)}`, '#4ade80')}
                                                onMouseLeave={leaveBar}
                                            />
                                            <div
                                                className="annual-bar annual-bar-expense"
                                                style={{ height: `${(expenses / maxVal) * 100}%` }}
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `${t('app.annual.legend.expenses')}: ${fmtCurrency(expenses)}`, '#f87171')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `${t('app.annual.legend.expenses')}: ${fmtCurrency(expenses)}`, '#f87171')}
                                                onMouseLeave={leaveBar}
                                            />
                                            <div
                                                className="annual-bar annual-bar-saving"
                                                style={{ height: `${(saving / maxVal) * 100}%` }}
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `${t('app.annual.legend.saving')}: ${fmtCurrency(saving)}`, '#a78bfa')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `${t('app.annual.legend.saving')}: ${fmtCurrency(saving)}`, '#a78bfa')}
                                                onMouseLeave={leaveBar}
                                            />
                                        </div>
                                    </div>
                                    <div className="annual-month-label">
                                        {onMonthClick && !isMonthInFuture(year, month, now) ? (
                                            <button
                                                type="button"
                                                className="annual-month-btn"
                                                onClick={() => onMonthClick(year, month)}
                                                title={`Ver ${MONTH_SHORT[month - 1]} ${year}`}
                                            >
                                                {MONTH_SHORT[month - 1]}
                                            </button>
                                        ) : (
                                            MONTH_SHORT[month - 1]
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tooltip — fixed so it's never clipped by overflow:auto */}
                    {tooltip && (
                        <div
                            className="annual-tooltip"
                            style={{
                                left: tooltip.x,
                                top: tooltip.y,
                                borderColor: tooltip.color,
                                color: tooltip.color,
                            }}
                        >
                            {tooltip.text}
                        </div>
                    )}

                    {/* Annual totals */}
                    <AnnualTotals totals={totals} t={t} />

                    {/* Monthly detail table */}
                    <AnnualMonthTable months={months} year={year} now={now} onMonthClick={onMonthClick} />
                </>
            )}
        </div>
    );
}
