import { MONTH_SHORT, fmtCurrency } from '../types';
import type { AnnualMonthTableProps } from '../types/AnnualChart.types';
import { isMonthInFuture } from '@modules/finances/domain/nextMonthLogic';
import { useI18n } from '@core/i18n/I18nContext';

export function AnnualMonthTable({ months, year, now, onMonthClick }: AnnualMonthTableProps) {
    const { t } = useI18n();

    return (
        <div className="annual-table-wrap">
            <table className="annual-table">
                <thead>
                    <tr>
                        <th>{t('app.annual.table.month')}</th>
                        <th style={{ color: '#4ade80' }}>{t('app.annual.table.income')}</th>
                        <th style={{ color: '#f87171' }}>{t('app.annual.table.expenses')}</th>
                        <th style={{ color: '#a78bfa' }}>{t('app.annual.table.saving')}</th>
                        <th>{t('app.annual.table.balance')}</th>
                    </tr>
                </thead>
                <tbody>
                    {months.map(({ month, income, expenses, saving, balance }) => (
                        <tr key={month}>
                            <td className="annual-td-month">
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
                            </td>
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
    );
}
