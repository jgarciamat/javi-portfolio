import { useAnnualSummary } from '../../application/hooks/useAnnualSummary';
import { useAnnualChart } from '../../application/hooks/useAnnualChart';
import type { AnnualChartProps } from '../types';
import { MONTH_SHORT, fmtCurrency } from '../types';

export function AnnualChart({ initialYear }: AnnualChartProps) {
    const { year, tooltip, showTooltip, moveTooltip, hideTooltip, leaveBar, prevYear, nextYear } = useAnnualChart(initialYear); const { data, loading, error } = useAnnualSummary(year);

    const months = data ? Object.entries(data.months).map(([k, v]) => ({ month: Number(k), ...v })) : [];

    const maxVal = months.length
        ? Math.max(...months.flatMap((m) => [m.income, m.expenses, m.saving]), 1)
        : 1;

    const totals = months.reduce(
        (acc, m) => ({ income: acc.income + m.income, expenses: acc.expenses + m.expenses, saving: acc.saving + m.saving }),
        { income: 0, expenses: 0, saving: 0 }
    );

    return (
        <div className="annual-view">
            {/* Year picker */}
            <div className="annual-header">
                <button className="btn-nav" onClick={prevYear}>‹ {year - 1}</button>
                <h2 className="annual-title">Balance anual {year}</h2>
                <button className="btn-nav" onClick={nextYear} disabled={year >= initialYear}>
                    {year + 1} ›
                </button>
            </div>

            {/* Legend */}
            <div className="annual-legend">
                <span className="legend-dot" style={{ background: '#4ade80' }} /> Ingresos
                <span className="legend-dot" style={{ background: '#f87171' }} /> Gastos
                <span className="legend-dot" style={{ background: '#a78bfa' }} /> Ahorro
            </div>

            {loading && (
                <div className="annual-empty">⏳ Cargando...</div>
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
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `Ingresos: ${fmtCurrency(income)}`, '#4ade80')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `Ingresos: ${fmtCurrency(income)}`, '#4ade80')}
                                                onMouseLeave={leaveBar}
                                            />
                                            <div
                                                className="annual-bar annual-bar-expense"
                                                style={{ height: `${(expenses / maxVal) * 100}%` }}
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `Gastos: ${fmtCurrency(expenses)}`, '#f87171')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `Gastos: ${fmtCurrency(expenses)}`, '#f87171')}
                                                onMouseLeave={leaveBar}
                                            />
                                            <div
                                                className="annual-bar annual-bar-saving"
                                                style={{ height: `${(saving / maxVal) * 100}%` }}
                                                onMouseEnter={/* istanbul ignore next */(e) => showTooltip(e, `Ahorro: ${fmtCurrency(saving)}`, '#a78bfa')}
                                                onMouseMove={/* istanbul ignore next */(e) => moveTooltip(e, `Ahorro: ${fmtCurrency(saving)}`, '#a78bfa')}
                                                onMouseLeave={leaveBar}
                                            />
                                        </div>
                                    </div>
                                    <div className="annual-month-label">{MONTH_SHORT[month - 1]}</div>
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
                    <div className="annual-totals">
                        <div className="annual-total-card" style={{ borderColor: '#4ade80' }}>
                            <span className="annual-total-label">Total ingresos</span>
                            <span className="annual-total-value" style={{ color: '#4ade80' }}>{fmtCurrency(totals.income)}</span>
                        </div>
                        <div className="annual-total-card" style={{ borderColor: '#f87171' }}>
                            <span className="annual-total-label">Total gastos</span>
                            <span className="annual-total-value" style={{ color: '#f87171' }}>{fmtCurrency(totals.expenses)}</span>
                        </div>
                        <div className="annual-total-card" style={{ borderColor: '#a78bfa' }}>
                            <span className="annual-total-label">Total ahorrado</span>
                            <span className="annual-total-value" style={{ color: '#a78bfa' }}>{fmtCurrency(totals.saving)}</span>
                        </div>
                        <div className="annual-total-card" style={{ borderColor: totals.income - totals.expenses - totals.saving >= 0 ? '#6366f1' : '#ef4444' }}>
                            <span className="annual-total-label">Balance anual</span>
                            <span className="annual-total-value" style={{ color: totals.income - totals.expenses - totals.saving >= 0 ? '#6366f1' : '#ef4444' }}>
                                {fmtCurrency(totals.income - totals.expenses - totals.saving)}
                            </span>
                        </div>
                    </div>

                    {/* Monthly detail table */}
                    <div className="annual-table-wrap">
                        <table className="annual-table">
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th style={{ color: '#4ade80' }}>Ingresos</th>
                                    <th style={{ color: '#f87171' }}>Gastos</th>
                                    <th style={{ color: '#a78bfa' }}>Ahorro</th>
                                    <th>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {months.map(({ month, income, expenses, saving, balance }) => (
                                    <tr key={month}>
                                        <td className="annual-td-month">{MONTH_SHORT[month - 1]}</td>
                                        <td style={{ color: '#4ade80' }}>{income > 0 ? fmtCurrency(income) : '—'}</td>
                                        <td style={{ color: '#f87171' }}>{expenses > 0 ? fmtCurrency(expenses) : '—'}</td>
                                        <td style={{ color: '#a78bfa' }}>{saving > 0 ? fmtCurrency(saving) : '—'}</td>
                                        <td style={{ color: balance >= 0 ? '#6366f1' : '#ef4444', fontWeight: 700 }}>
                                            {fmtCurrency(balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
