import type { CategoryChartProps, BarChartProps } from '../types';
import '../css/CategoryChart.css';
import { formatCurrency } from '../types/CategoryChart.types';
import { useI18n } from '@core/i18n/I18nContext';

function BarChart({ data, title, color, total, tCategory }: BarChartProps & { tCategory: (n: string) => string }) {
    const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
    if (sorted.length === 0) return null;

    return (
        <div>
            <h4 className="chart-title">{title}</h4>
            <div>
                {sorted.map(([cat, amount]) => {
                    const pct = total > 0 ? (amount / total) * 100 : 0;
                    return (
                        <div key={cat} className="bar-row">
                            <div className="bar-label">
                                <span className="bar-label-name">{tCategory(cat)}</span>
                                <span className="bar-label-value">{formatCurrency(amount)} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="bar-track">
                                <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function CategoryChart({ summary }: CategoryChartProps) {
    const { t, tCategory } = useI18n();
    return (
        <div className="chart-grid">
            <BarChart data={summary.expensesByCategory} title={t('app.categoryChart.expenses')} color="#f87171" total={summary.totalExpenses} tCategory={tCategory} />
            <BarChart data={summary.incomeByCategory} title={t('app.categoryChart.income')} color="#4ade80" total={summary.totalIncome} tCategory={tCategory} />
            <BarChart data={summary.savingByCategory} title={t('app.categoryChart.saving')} color="#a78bfa" total={summary.totalSaving} tCategory={tCategory} />
        </div>
    );
}

