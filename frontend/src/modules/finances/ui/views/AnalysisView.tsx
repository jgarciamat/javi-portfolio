import { useState } from 'react';
import { useResource } from '@shared/hooks/useResource';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { CategoryTrend, NetWorthPoint } from '@modules/finances/domain/types';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import '@modules/billing/ui/css/Billing.css';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';

function Change({ pct }: { pct: number | null }) {
  const { percent } = useFormat();
  if (pct === null) return <span className="trend trend--flat">—</span>;
  const cls = pct > 5 ? 'trend--up' : pct < -5 ? 'trend--down' : 'trend--flat';
  return (
    <span className={`trend ${cls}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {percent(Math.abs(pct), 0)}
    </span>
  );
}

const SERIES: {
  key: keyof Pick<NetWorthPoint, 'netWorth' | 'available' | 'saved'>;
  color: string;
  labelKey: string;
}[] = [
  { key: 'netWorth', color: '#6366f1', labelKey: 'app.analysis.netWorth' },
  { key: 'available', color: '#22c55e', labelKey: 'app.analysis.available' },
  { key: 'saved', color: '#a78bfa', labelKey: 'app.analysis.saved' },
];

/** Small dependency-free line chart (SVG) for the net worth evolution. */
function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const { t } = useI18n();
  const { money, monthName } = useFormat();
  const width = 640;
  const height = 300;
  const pad = { top: 20, right: 20, bottom: 40, left: 110 };
  const values = points.flatMap((p) => SERIES.map((s) => p[s.key]));
  const min = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const max = rawMax === min ? min + 1 : rawMax;
  // Few labels on long ranges so they stay readable on phones.
  const labelEvery = Math.ceil(points.length / 6);
  const x = (i: number) =>
    pad.left + (i * (width - pad.left - pad.right)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.top + ((max - v) * (height - pad.top - pad.bottom)) / (max - min);
  const ticks = [max, (max + min) / 2, min];

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('app.analysis.netWorthTitle')}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" className="chart-axis">
              {money(v, { decimals: false })}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`${p.year}-${p.month}`}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              className="chart-axis"
            >
              {monthName(p.month, 'short')}
            </text>
          ) : null
        )}
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth={s.key === 'netWorth' ? 3 : 2}
            points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')}
          >
            <title>{t(s.labelKey)}</title>
          </polyline>
        ))}
      </svg>
      <figcaption className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {t(s.labelKey)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Trends and net worth are part of Premium. */
export function AnalysisView() {
  const plan = useOptionalPlan();
  const { t } = useI18n();
  // Wait for the plan: a free user would otherwise trigger the paywall on load.
  if (plan?.loading && !plan.overview) return <div className="card">{t('app.common.loading')}</div>;
  if (plan && !plan.isPremium) {
    return (
      <div className="card premium-locked">
        <h2 className="section-title">
          📈 {t('app.tabs.analysis')} <span className="premium-chip">Premium</span>
        </h2>
        <p className="section-hint">{t('app.analysis.locked')}</p>
        <button
          className="btn-primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'insights' })}
        >
          {t('billing.seePlans')}
        </button>
      </div>
    );
  }
  return <AnalysisContent />;
}

function TrendsCard() {
  const { insightsApi } = useApi();
  const { t, tCategory } = useI18n();
  const { money, monthLabel } = useFormat();
  const { year, month } = useFinances();
  const { data: trends, error } = useResource(
    () => insightsApi.trends(year, month).then((r) => r.categories),
    [insightsApi, year, month]
  );
  const columns = ['category', 'thisMonth', 'previous', 'vsPrevious', 'average3', 'vsAverage'];

  return (
    <div className="card">
      <h2 className="section-title">
        📈 {t('app.analysis.trendsTitle', { month: monthLabel(year, month) })}
      </h2>
      <p className="section-hint">{t('app.analysis.trendsHint')}</p>
      {error && <p className="form-error">{error}</p>}
      {trends?.length === 0 && <p className="empty-state">{t('app.analysis.noData')}</p>}
      {trends && trends.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{t(`app.analysis.${c}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trends.map((row: CategoryTrend) => (
                <tr key={row.categoryName}>
                  <td>{tCategory(row.categoryName)}</td>
                  <td>{money(row.current)}</td>
                  <td>{money(row.previous)}</td>
                  <td>
                    <Change pct={row.changeVsPreviousPct} />
                  </td>
                  <td>{money(row.average3)}</td>
                  <td>
                    <Change pct={row.changeVsAveragePct} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const RANGES = [6, 12, 24];

function NetWorthCard() {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const { money } = useFormat();
  const [months, setMonths] = useState(12);
  const { data: points, error } = useResource(
    () => insightsApi.netWorth(months),
    [insightsApi, months]
  );
  const last: NetWorthPoint | undefined = points?.[points.length - 1];

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">💼 {t('app.analysis.netWorthTitle')}</h2>
        <select
          className="tx-input select-compact"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          aria-label={t('app.analysis.range')}
        >
          {RANGES.map((n) => (
            <option key={n} value={n}>
              {n} {t('app.analysis.months')}
            </option>
          ))}
        </select>
      </div>
      <p className="section-hint">{t('app.analysis.netWorthHint')}</p>
      {error && <p className="form-error">{error}</p>}
      {points && last && (
        <>
          <NetWorthChart points={points} />
          <p className="section-total-line">
            {t('app.analysis.currentNetWorth')}: <strong>{money(last.netWorth)}</strong>
          </p>
        </>
      )}
    </div>
  );
}

function AnalysisContent() {
  return (
    <div className="section-view">
      <TrendsCard />
      <NetWorthCard />
    </div>
  );
}
