import { ScrollRegion } from '@shared/components/ScrollRegion';
import { useState } from 'react';
import { useResource } from '@shared/hooks/useResource';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type {
  CategoryTrend,
  DetectedSubscription,
  NetWorthPoint,
} from '@modules/finances/domain/types';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { PremiumOnly } from '@modules/billing/ui/PremiumOnly';
import '@modules/billing/ui/css/Billing.css';
import { useFinances } from '../../application/FinancesContext';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';
import { ExportButtons } from '../components/ExportButtons';

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
  // Theme colours: lighter shades on dark, darker ones on light.
  { key: 'netWorth', color: 'var(--accent-400)', labelKey: 'app.analysis.netWorth' },
  { key: 'available', color: 'var(--green-400)', labelKey: 'app.analysis.available' },
  { key: 'saved', color: 'var(--violet-400)', labelKey: 'app.analysis.saved' },
];

/** Small dependency-free line chart (SVG) for the net worth evolution. */
function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const { t } = useI18n();
  const { money, monthName, monthLabel } = useFormat();
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
            style={{ stroke: s.color }}
            strokeWidth={s.key === 'netWorth' ? 3 : 2}
            points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')}
          >
            <title>{t(s.labelKey)}</title>
          </polyline>
        ))}
      </svg>
      {/* The same figures as text, for screen readers. */}
      <table className="sr-only">
        <caption>{t('app.analysis.netWorthTitle')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('app.analysis.month')}</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col">
                {t(s.labelKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={`${p.year}-${p.month}`}>
              <th scope="row">{monthLabel(p.year, p.month)}</th>
              {SERIES.map((s) => (
                <td key={s.key}>{money(p[s.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

/**
 * The analysis tab: the subscriptions found are for everyone (the free plan sees the most
 * expensive ones); the trends and the net worth evolution are Premium.
 */
export function AnalysisView() {
  return (
    <div className="section-view">
      <SubscriptionsCard />
      <PremiumOnly
        icon="trend"
        titleKey="app.analysis.trendsName"
        hintKey="app.analysis.trendsLocked"
      >
        <TrendsCard />
      </PremiumOnly>
      <PremiumOnly
        icon="briefcase"
        titleKey="app.analysis.netWorthTitle"
        hintKey="app.analysis.netWorthLocked"
      >
        <NetWorthCard />
      </PremiumOnly>
    </div>
  );
}

function TrendsCard() {
  const { insightsApi } = useApi();
  const { t, tCategory } = useI18n();
  const { money, monthLabel, currency } = useFormat();
  const { year, month } = useFinances();
  const { data: trends, error } = useResource(
    () => insightsApi.trends(year, month).then((r) => r.categories),
    [insightsApi, year, month]
  );
  const columns = ['category', 'thisMonth', 'previous', 'vsPrevious', 'average3', 'vsAverage'];
  const table = () => ({
    head: [
      t('app.analysis.category'),
      `${t('app.analysis.thisMonth')} (${currency})`,
      `${t('app.analysis.previous')} (${currency})`,
      `${t('app.analysis.vsPrevious')} (%)`,
      `${t('app.analysis.average3')} (${currency})`,
      `${t('app.analysis.vsAverage')} (%)`,
    ],
    rows: trends!.map((row) => [
      tCategory(row.categoryName),
      row.current,
      row.previous,
      row.changeVsPreviousPct,
      row.average3,
      row.changeVsAveragePct,
    ]),
  });

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="trend" /> {t('app.analysis.trendsTitle', { month: monthLabel(year, month) })}
      </h2>
      <p className="section-hint">{t('app.analysis.trendsHint')}</p>
      <ExportButtons
        name={`tendencias_${year}-${String(month).padStart(2, '0')}`}
        what={t('app.analysis.trendsName')}
        count={trends?.length ?? 0}
        table={table}
        pdf={{ range: monthLabel(year, month) }}
      />
      {error && <p className="form-error">{error}</p>}
      {trends?.length === 0 && <p className="empty-state">{t('app.analysis.noData')}</p>}
      {trends && trends.length > 0 && (
        <ScrollRegion
          className="table-scroll"
          label={t('app.analysis.trendsTitle', { month: monthLabel(year, month) })}
        >
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
        </ScrollRegion>
      )}
    </div>
  );
}

const RANGES = [6, 12, 24];

function NetWorthCard() {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const { money, currency } = useFormat();
  const [months, setMonths] = useState(12);
  const { data: points, error } = useResource(
    () => insightsApi.netWorth(months),
    [insightsApi, months]
  );
  const last: NetWorthPoint | undefined = points?.[points.length - 1];
  const table = () => ({
    head: [t('app.analysis.month'), ...SERIES.map((s) => `${t(s.labelKey)} (${currency})`)],
    rows: points!.map((p) => [
      `${p.year}-${String(p.month).padStart(2, '0')}`,
      ...SERIES.map((s) => p[s.key]),
    ]),
  });

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">
          <Icon name="briefcase" /> {t('app.analysis.netWorthTitle')}
        </h2>
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
      <ExportButtons
        name="patrimonio_evolucion"
        what={t('app.analysis.netWorthTitle')}
        count={points?.length ?? 0}
        table={table}
        pdf={{ range: `${months} ${t('app.analysis.months')}` }}
      />
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

function SubscriptionRow({ item }: { item: DetectedSubscription }) {
  const { t } = useI18n();
  const { money, date } = useFormat();
  return (
    <tr>
      <td>
        {item.description}
        {item.priceIncrease && (
          <span className="trend trend--up">
            {' '}
            ▲{' '}
            {t('app.subscriptions.increase', {
              from: money(item.priceIncrease.from),
              to: money(item.priceIncrease.to),
            })}
          </span>
        )}
      </td>
      <td>{t(`app.subscriptions.${item.cadence}`)}</td>
      <td>{money(item.amount)}</td>
      <td>{money(item.annualCost)}</td>
      <td>{date(item.nextDate)}</td>
    </tr>
  );
}

/** Charges that repeat like a subscription, to review what is being paid for. */
function SubscriptionsCard() {
  const { insightsApi } = useApi();
  const { t } = useI18n();
  const { money, currency } = useFormat();
  const { data, error } = useResource(() => insightsApi.subscriptions(), [insightsApi]);
  const columns = ['name', 'cadence', 'amount', 'perYear', 'next'];
  const table = () => ({
    head: columns.map((c) =>
      c === 'amount' || c === 'perYear'
        ? `${t(`app.subscriptions.col.${c}`)} (${currency})`
        : t(`app.subscriptions.col.${c}`)
    ),
    rows: data!.subscriptions.map((item) => [
      item.description,
      t(`app.subscriptions.${item.cadence}`),
      item.amount,
      item.annualCost,
      item.nextDate.slice(0, 10),
    ]),
  });

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="repeat" /> {t('app.subscriptions.title')}
      </h2>
      <p className="section-hint">{t('app.subscriptions.hint')}</p>
      <ExportButtons
        name="suscripciones"
        what={t('app.subscriptions.title')}
        count={data?.subscriptions.length ?? 0}
        table={table}
        pdf
      />
      {error && <p className="form-error">{error}</p>}
      {data?.subscriptions.length === 0 && (
        <p className="empty-state">{t('app.subscriptions.none')}</p>
      )}
      {data && data.subscriptions.length > 0 && (
        <>
          <p className="section-total-line">
            {t('app.subscriptions.total', {
              monthly: money(data.monthly),
              annual: money(data.annual),
            })}
          </p>
          {data.locked && (
            <p className="section-hint">{t('app.subscriptions.found', { count: data.count })}</p>
          )}
          <ScrollRegion className="table-scroll" label={t('app.subscriptions.title')}>
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{t(`app.subscriptions.col.${c}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((item) => (
                  <SubscriptionRow key={item.key} item={item} />
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          {data.locked && <MoreSubscriptions hidden={data.count - data.subscriptions.length} />}
        </>
      )}
    </div>
  );
}

/** Free plan: the full list is Premium. */
function MoreSubscriptions({ hidden }: { hidden: number }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  return (
    <div className="plan-upsell">
      <p className="section-hint">
        <Icon name="lock" />{' '}
        {hidden > 0
          ? t('app.subscriptions.moreLocked', { count: hidden })
          : t('app.subscriptions.fullLocked')}{' '}
        <span className="premium-chip">Premium</span>
      </p>
      {plan && (
        <button
          className="btn-primary"
          onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'insights' })}
        >
          {t('billing.seePlans')}
        </button>
      )}
    </div>
  );
}
