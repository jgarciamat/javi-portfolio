import { useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { buildAnnualChartData, type AnnualMonthEntry } from '@modules/finances/domain/annual';
import { isBeyondHorizon } from '@modules/finances/domain/nextMonthLogic';
import { useFinances } from '../../application/FinancesContext';
import { useAnnualChart } from '../../application/hooks/useAnnualChart';
import { useAnnualSummary } from '../../application/hooks/useAnnualSummary';
import { useExportCSV } from '../../application/hooks/useExportCSV';
import { AnnualReportDialog } from './AnnualReportDialog';
import '../css/AnnualChart.css';

interface AnnualChartProps {
  initialYear: number;
  /** Opens the month view of the clicked month. */
  onMonthClick?: (year: number, month: number) => void;
}

const SERIES = [
  { key: 'income', color: '#4ade80', className: 'annual-bar-income' },
  { key: 'expenses', color: '#f87171', className: 'annual-bar-expense' },
  { key: 'saving', color: '#a78bfa', className: 'annual-bar-saving' },
] as const;

const BALANCE_COLOR = (balance: number) => (balance >= 0 ? '#6366f1' : '#ef4444');

function MonthLabel({
  year,
  month,
  onMonthClick,
}: {
  year: number;
  month: number;
  onMonthClick?: AnnualChartProps['onMonthClick'];
}) {
  const format = useFormat();
  const { currentPeriod } = useFinances();
  const short = format.monthName(month, 'short');
  // Months beyond the planning horizon cannot be opened.
  if (!onMonthClick || isBeyondHorizon(year, month, currentPeriod)) return <>{short}</>;
  return (
    <button
      type="button"
      className="annual-month-btn"
      onClick={() => onMonthClick(year, month)}
      title={format.monthLabel(year, month)}
    >
      {short}
    </button>
  );
}

function Totals({ totals }: { totals: ReturnType<typeof buildAnnualChartData>['totals'] }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const cards = [
    { label: 'app.annual.totalIncome', value: totals.income, color: SERIES[0].color },
    { label: 'app.annual.totalExpenses', value: totals.expenses, color: SERIES[1].color },
    { label: 'app.annual.totalSaving', value: totals.saving, color: SERIES[2].color },
    {
      label: 'app.annual.annualBalance',
      value: totals.balance,
      color: BALANCE_COLOR(totals.balance),
    },
  ];
  return (
    <div className="annual-totals">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="annual-total-card" style={{ borderColor: color }}>
          <span className="annual-total-label">{t(label)}</span>
          <span className="annual-total-value" style={{ color }}>
            {money(value, { decimals: false })}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthTable({
  months,
  year,
  onMonthClick,
}: {
  months: AnnualMonthEntry[];
  year: number;
  onMonthClick?: AnnualChartProps['onMonthClick'];
}) {
  const { t } = useI18n();
  const { money } = useFormat();
  const cell = (n: number) => (n > 0 ? money(n, { decimals: false }) : '—');
  return (
    <div className="annual-table-wrap">
      <table className="annual-table">
        <thead>
          <tr>
            <th>{t('app.annual.table.month')}</th>
            {SERIES.map((s) => (
              <th key={s.key} style={{ color: s.color }}>
                {t(`app.annual.table.${s.key}`)}
              </th>
            ))}
            <th>{t('app.annual.table.balance')}</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <td className="annual-td-month">
                <MonthLabel year={year} month={m.month} onMonthClick={onMonthClick} />
              </td>
              {SERIES.map((s) => (
                <td key={s.key} style={{ color: s.color }}>
                  {cell(m[s.key])}
                </td>
              ))}
              <td style={{ color: BALANCE_COLOR(m.balance), fontWeight: 700 }}>
                {money(m.balance, { decimals: false })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Income, expenses and saving of every month of a year. */
export function AnnualChart({ initialYear, onMonthClick }: AnnualChartProps) {
  const chart = useAnnualChart(initialYear, useFinances().currentPeriod);
  const { year } = chart;
  const { data, loading, error } = useAnnualSummary(year);
  const { months, maxVal, totals } = useMemo(() => buildAnnualChartData(data), [data]);
  const { t } = useI18n();
  const format = useFormat();
  const { exportAnnualCSV } = useExportCSV();
  const plan = useOptionalPlan();
  const [reportOpen, setReportOpen] = useState(false);
  const openReport = () =>
    plan && !plan.isPremium
      ? plan.openUpgrade({ kind: 'feature', feature: 'insights' })
      : setReportOpen(true);

  return (
    <div className="annual-view">
      {reportOpen && <AnnualReportDialog year={year} onClose={() => setReportOpen(false)} />}
      <nav className="annual-header" aria-label={t('app.nav.yearNav')}>
        <button
          className="btn-nav"
          onClick={chart.prevYear}
          disabled={chart.prevYearDisabled}
          aria-label={String(year - 1)}
        >
          ‹ {year - 1}
        </button>
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
                { icon: '📄', label: t('app.report.open'), onClick: openReport },
              ]}
            />
          )}
        </h2>
        <button
          className="btn-nav"
          onClick={chart.nextYear}
          disabled={chart.nextYearDisabled}
          aria-label={String(year + 1)}
        >
          {year + 1} ›
        </button>
      </nav>

      <div className="annual-legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <span className="legend-dot" style={{ background: s.color }} />{' '}
            {t(`app.annual.legend.${s.key}`)}
          </span>
        ))}
      </div>

      {loading && <div className="annual-empty">⏳ {t('app.annual.loading')}</div>}
      {error && (
        <div className="annual-empty annual-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="annual-chart-wrap">
            <div className="annual-chart">
              {months.map((m) => (
                <div key={m.month} className="annual-col">
                  <div className="annual-bars">
                    <div className="annual-bar-group">
                      {SERIES.map((s) => {
                        const text = `${t(`app.annual.legend.${s.key}`)}: ${format.money(m[s.key], {
                          decimals: false,
                        })}`;
                        return (
                          <div
                            key={s.key}
                            className={`annual-bar ${s.className}`}
                            style={{ height: `${(m[s.key] / maxVal) * 100}%` }}
                            role="img"
                            aria-label={`${format.monthName(m.month, 'short')} ${year} — ${text}`}
                            onMouseEnter={(e) => chart.showTooltip(e, text, s.color)}
                            onMouseMove={(e) => chart.showTooltip(e, text, s.color)}
                            onMouseLeave={chart.hideTooltip}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="annual-month-label">
                    <MonthLabel year={year} month={m.month} onMonthClick={onMonthClick} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {chart.tooltip && (
            <div
              className="annual-tooltip"
              style={{
                left: chart.tooltip.x,
                top: chart.tooltip.y,
                borderColor: chart.tooltip.color,
                color: chart.tooltip.color,
              }}
            >
              {chart.tooltip.text}
            </div>
          )}

          <Totals totals={totals} />
          <MonthTable months={months} year={year} onMonthClick={onMonthClick} />
        </>
      )}
    </div>
  );
}
