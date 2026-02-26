import type { CategoryChartProps, BarChartProps } from '../types';
import { formatCurrency } from '../types/CategoryChart.types';

function BarChart({ data, title, color, total }: BarChartProps) {
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
                                <span className="bar-label-name">{cat}</span>
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
    return (
        <div className="chart-grid">
            <BarChart data={summary.expensesByCategory} title="Gastos por categoría" color="#f87171" total={summary.totalExpenses} />
            <BarChart data={summary.incomeByCategory} title="Ingresos por categoría" color="#4ade80" total={summary.totalIncome} />
            <BarChart data={summary.savingByCategory} title="Ahorros por categoría" color="#a78bfa" total={summary.totalSaving} />
        </div>
    );
}

