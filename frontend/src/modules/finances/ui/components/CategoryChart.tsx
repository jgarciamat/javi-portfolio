import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { FinancialSummary } from '@modules/finances/domain/types';
import { TYPE_COLORS } from '@modules/finances/domain/transactionTypes';
import '../css/CategoryChart.css';

interface BarChartProps {
  data: Record<string, number>;
  title: string;
  color: string;
  total: number;
}

/** Horizontal bars of each category's share of a total. */
function BarChart({ data, title, color, total }: BarChartProps) {
  const { tCategory } = useI18n();
  const { money, percent } = useFormat();
  const rows = Object.entries(data).sort(([, a], [, b]) => b - a);
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="chart-title">{title}</h4>
      {rows.map(([category, amount]) => {
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return (
          <div key={category} className="bar-row">
            <div className="bar-label">
              <span className="bar-label-name">{tCategory(category)}</span>
              <span className="bar-label-value">
                {money(amount)} ({percent(pct)})
              </span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryChart({ summary }: { summary: FinancialSummary }) {
  const { t } = useI18n();
  return (
    <div className="chart-grid">
      <BarChart
        data={summary.expensesByCategory}
        title={t('app.categoryChart.expenses')}
        color={TYPE_COLORS.EXPENSE}
        total={summary.totalExpenses}
      />
      <BarChart
        data={summary.incomeByCategory}
        title={t('app.categoryChart.income')}
        color={TYPE_COLORS.INCOME}
        total={summary.totalIncome}
      />
      <BarChart
        data={summary.savingByCategory}
        title={t('app.categoryChart.saving')}
        color={TYPE_COLORS.SAVING}
        total={summary.totalSaving}
      />
    </div>
  );
}
