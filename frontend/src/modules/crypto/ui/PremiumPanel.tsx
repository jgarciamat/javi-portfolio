import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { ExportButtons } from '@modules/finances/ui/components/ExportButtons';
import { Icon } from '@shared/components/Icon';
import type { Alerts } from '../application/useRanking';
import { parseDecimal } from '@shared/utils/numbers';
import { formatChange, formatDateTime, formatNumber } from '../domain/format';
import { EXAMPLE_ALERTS, EXAMPLE_STATS, PLAN_LINES, reportTable } from '../domain/season';
import type { CryptoCoin, PriceAlert, SimPortfolio, SimStats } from '../domain/types';
import { useMoney } from './money';
import './css/Season.css';

/** The way to Premium: the upgrade window inside the app, the pricing page elsewhere. */
export function PremiumButton({ label }: { label?: string }) {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const text = label ?? t('app.crypto.plans.cta');
  if (!plan) {
    return (
      <Link className="btn-primary cc-premium-cta" to="/pricing">
        <Icon name="star" /> {text}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn-primary cc-premium-cta"
      onClick={() => plan.openUpgrade({ kind: 'feature', feature: 'cryptoPro' })}
    >
      <Icon name="star" /> {text}
    </button>
  );
}

/** «Free and Premium in the console»: two columns, short sentences, why the ranking is fair. */
export function PlansCard({
  premium,
  headingLevel = 2,
}: {
  premium: boolean;
  headingLevel?: 2 | 3;
}) {
  const { t } = useI18n();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const column = (plan: 'free' | 'premium', icon: 'check' | 'star') => (
    <div className={`cc-plan cc-plan--${plan}`}>
      <h4>{t(`app.crypto.plans.${plan}Title`)}</h4>
      <ul>
        {PLAN_LINES[plan].map((line) => (
          <li key={line}>
            <Icon name={icon} /> {t(`app.crypto.plans.${plan}.${line}`)}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className="card cc-plans" aria-labelledby="cc-plans-title">
      <Heading id="cc-plans-title" className="section-title">
        {t('app.crypto.plans.title')}
      </Heading>
      <div className="cc-plans-columns">
        {column('free', 'check')}
        {column('premium', 'star')}
      </div>
      <p className="cc-plans-fair">
        <Icon name="shield" /> <b>{t('app.crypto.plans.fairTitle')}</b> {t('app.crypto.plans.fair')}
      </p>
      {premium ? <p className="cc-hint">{t('app.crypto.plans.youHave')}</p> : <PremiumButton />}
    </section>
  );
}

/** A Premium feature shown to free users: a preview with made-up data and what it unlocks. */
function Locked({ what, children }: { what: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="cc-locked">
      <p className="cc-example-tag">
        <Icon name="lock" /> {t('app.crypto.locked.example')}
      </p>
      <div className="cc-locked-preview" aria-hidden="true">
        {children}
      </div>
      <p>{t(`app.crypto.locked.${what}`)}</p>
      <PremiumButton label={t('app.crypto.locked.cta')} />
    </div>
  );
}

/** Equity of each day as a small line (with its summary for screen readers). */
export function EquityChart({ days }: { days: SimStats['equityDays'] }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  if (days.length < 2) return <p className="cc-hint">{t('app.crypto.stats.chartSoon')}</p>;
  const values = days.map((d) => d.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 300},${90 - ((v - min) / span) * 80}`)
    .join(' ');
  const first = values[0];
  const last = values[values.length - 1];
  return (
    <figure className="cc-equity">
      <svg
        viewBox="0 0 300 100"
        role="img"
        aria-label={t('app.crypto.stats.chartLabel', {
          from: money.amount(first),
          to: money.amount(last),
          days: days.length,
        })}
        preserveAspectRatio="none"
      >
        <polyline points={points} className={last >= first ? 'cc-up' : 'cc-down'} />
      </svg>
      <figcaption className="cc-hint">
        {t('app.crypto.stats.chartCaption', {
          min: money.amount(min),
          max: money.amount(max),
          percent: formatChange(((last - first) / first) * 100, locale),
        })}
      </figcaption>
    </figure>
  );
}

function StatsBody({ stats }: { stats: SimStats }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const trade = (h: SimStats['best']) =>
    h ? `${h.symbol} · ${money.amount(h.pnl, true)} (${formatChange(h.pnlPercent, locale)})` : '—';
  const amount = (v: number | null) => (v === null ? '—' : money.amount(v, true));
  const figures: [string, string][] = [
    [
      'winRate',
      stats.winRate === null
        ? '—'
        : t('app.crypto.stats.winRateValue', {
            rate: formatNumber(stats.winRate, locale),
            wins: stats.wins,
            losses: stats.losses,
          }),
    ],
    ['best', trade(stats.best)],
    ['worst', trade(stats.worst)],
    ['averageWin', amount(stats.averageWin)],
    ['averageLoss', amount(stats.averageLoss)],
  ];
  return (
    <>
      <dl className="cc-figures">
        {figures.map(([key, value]) => (
          <div key={key}>
            <dt>{t(`app.crypto.stats.${key}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="cc-subtitle">{t('app.crypto.stats.chartTitle')}</h3>
      <EquityChart days={stats.equityDays} />
      <h3 className="cc-subtitle">{t('app.crypto.stats.holdTitle')}</h3>
      <p>
        {stats.hold
          ? t('app.crypto.stats.hold', {
              coin: stats.hold.symbol,
              percent: formatChange(stats.hold.percent, locale),
              from: money.price(stats.hold.startPrice),
              to: money.price(stats.hold.price),
            })
          : t('app.crypto.stats.noHold')}
      </p>
      <p className="cc-hint">{t('app.crypto.stats.holdNote')}</p>
    </>
  );
}

/** Advanced statistics of the portfolio (Premium), or a preview with an example. */
export function StatsCard({ portfolio }: { portfolio: SimPortfolio }) {
  const { t } = useI18n();
  return (
    <section className="card cc-stats-card" aria-labelledby="cc-stats-title">
      <h2 id="cc-stats-title" className="section-title">
        {t('app.crypto.stats.title')} <span className="cc-premium-tag">Premium</span>
      </h2>
      {portfolio.stats ? (
        <StatsBody stats={portfolio.stats} />
      ) : (
        <Locked what="stats">
          <StatsBody stats={EXAMPLE_STATS} />
        </Locked>
      )}
    </section>
  );
}

function AlertList({
  alerts,
  onRemove,
  busy,
}: {
  alerts: PriceAlert[];
  onRemove?: (id: string) => void;
  busy?: boolean;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  if (!alerts.length) return <p className="cc-hint">{t('app.crypto.alerts.empty')}</p>;
  return (
    <ul className="cc-alerts">
      {alerts.map((a) => (
        <li key={a.id}>
          <span>
            {t(`app.crypto.alerts.condition.${a.condition}`, {
              coin: a.symbol,
              price: money.price(a.price),
            })}
          </span>
          <span className="cc-hint">
            {a.triggeredAt
              ? t('app.crypto.alerts.sent', { date: formatDateTime(a.triggeredAt, locale) })
              : t('app.crypto.alerts.waiting')}
          </span>
          {onRemove && (
            <button
              type="button"
              className="cc-tool"
              disabled={busy}
              aria-label={t('app.crypto.alerts.remove', { coin: a.symbol })}
              onClick={() => onRemove(a.id)}
            >
              <Icon name="trash" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function AlertForm({ coins, alerts }: { coins: CryptoCoin[]; alerts: Alerts }) {
  const { t } = useI18n();
  const money = useMoney();
  const [symbol, setSymbol] = useState(coins[0]?.symbol ?? 'BTC');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const value = parseDecimal(price);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await alerts.create({ symbol, condition, price: money.toBasePrice(value) })) setPrice('');
  };
  return (
    <form className="cc-alert-form" onSubmit={(e) => void submit(e)}>
      <label>
        <span className="cc-label">{t('app.crypto.alerts.coin')}</span>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {coins.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name} ({c.symbol})
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="cc-label">{t('app.crypto.alerts.when')}</span>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
        >
          <option value="above">{t('app.crypto.alerts.above')}</option>
          <option value="below">{t('app.crypto.alerts.below')}</option>
        </select>
      </label>
      <label>
        <span className="cc-label">{t('app.crypto.alerts.price', { symbol: money.symbol })}</span>
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          autoComplete="off"
        />
      </label>
      <button
        type="submit"
        className="btn-primary"
        disabled={alerts.action.pending || !(value > 0)}
      >
        {t('app.crypto.alerts.create')}
      </button>
    </form>
  );
}

/** Price alerts by notification (Premium), or a preview with examples. */
export function AlertsCard({
  premium,
  alerts,
  coins,
}: {
  premium: boolean;
  alerts: Alerts;
  coins: CryptoCoin[];
}) {
  const { t } = useI18n();
  const data = alerts.alerts;
  return (
    <section className="card cc-alerts-card" aria-labelledby="cc-alerts-title">
      <h2 id="cc-alerts-title" className="section-title">
        <Icon name="bell" /> {t('app.crypto.alerts.title')}{' '}
        <span className="cc-premium-tag">Premium</span>
      </h2>
      {!premium ? (
        <Locked what="alerts">
          <AlertList alerts={EXAMPLE_ALERTS} />
        </Locked>
      ) : alerts.error ? (
        <p className="error-banner" role="alert">
          {alerts.error}
        </p>
      ) : data ? (
        <>
          <p className="cc-hint">
            {t(data.pushEnabled ? 'app.crypto.alerts.how' : 'app.crypto.alerts.noPush', {
              max: data.max,
            })}
          </p>
          <AlertList
            alerts={data.alerts}
            busy={alerts.action.pending}
            onRemove={(id) => void alerts.remove(id)}
          />
          {alerts.action.error && (
            <p className="error-banner" role="alert">
              {alerts.action.error}
            </p>
          )}
          <AlertForm coins={coins} alerts={alerts} />
        </>
      ) : null}
    </section>
  );
}

/** The report of the season in PDF and CSV (Premium), or what it would include. */
export function SeasonReportButtons({ portfolio }: { portfolio: SimPortfolio }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const { cryptoApi } = useApi();
  const month = portfolio.season.month;
  if (!portfolio.plan.premium) {
    return (
      <p className="cc-report-locked">
        <Icon name="lock" /> {t('app.crypto.report.locked')}{' '}
        <PremiumButton label={t('app.crypto.locked.cta')} />
      </p>
    );
  }
  return (
    <div className="cc-report">
      <p className="cc-label">{t('app.crypto.report.title')}</p>
      <ExportButtons
        name={`consola_crypto_temporada_${month}`}
        what={t('app.crypto.report.what')}
        count={1}
        pdf
        table={async () => reportTable(await cryptoApi.report(month), t, locale, money.display)}
      />
    </div>
  );
}
