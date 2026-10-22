import { Suspense, useId, useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { lazyNamed } from '@shared/utils/lazyNamed';
import { storage } from '@shared/utils/storage';
import { useCryptoMarket, type CryptoMarket } from '../application/useCryptoMarket';
import { useSimulator, type Simulator } from '../application/useSimulator';
import { CHART_INTERVALS, DEFAULT_INTERVAL } from '../domain/chart';
import { formatChange, formatPrice, tone } from '../domain/format';
import type { CryptoCoin, CryptoInterval, SimFill, SimPortfolio } from '../domain/types';
import { ChartTable } from './ChartTable';
import { DataNotice, Glossary, Help, RiskBanner } from './Notices';
import { OrderForm } from './OrderForm';
import { SimSettings, SimSummary } from './SimSummary';
import { ClosedPanel, OpenPanel, PendingPanel } from './TradePanels';
import type { ChartLine } from './useCandleChart';
import '../../finances/ui/css/Sections.css';
import './css/Crypto.css';

// The chart library goes in its own chunk, downloaded only when a chart is shown.
const PriceChart = lazyNamed(() => import('./PriceChart'), 'PriceChart');

const VIEW_KEY = 'mm_crypto_view';
const DEFAULT_SYMBOL = 'BTC';

interface View {
  symbol: string;
  interval: CryptoInterval;
}

/** The coin and candle size last looked at, on this device (a convenience, nothing more). */
export function savedView(): View {
  try {
    const saved = JSON.parse(storage.get(VIEW_KEY) ?? '{}') as Record<string, unknown>;
    const interval = CHART_INTERVALS.find((i) => i === saved.interval) ?? DEFAULT_INTERVAL;
    const symbol =
      typeof saved.symbol === 'string' && /^[A-Z]{2,6}$/.test(saved.symbol)
        ? saved.symbol
        : DEFAULT_SYMBOL;
    return { symbol, interval };
  } catch {
    return { symbol: DEFAULT_SYMBOL, interval: DEFAULT_INTERVAL };
  }
}

function Loading() {
  const { t } = useI18n();
  return (
    <p className="empty-block" role="status">
      {t('app.common.loading')}
    </p>
  );
}

function FillsNotice({ fills }: { fills: SimFill[] }) {
  const { t, locale } = useI18n();
  if (!fills.length) return null;
  return (
    <div className="cc-fills" role="status">
      <p>
        <b>{t('app.crypto.fills.title')}</b>
      </p>
      <ul>
        {fills.map((f) => (
          <li key={f.orderId}>
            {f.type === 'expired'
              ? t(`app.crypto.fills.expired.${f.side}`, { coin: f.symbol })
              : t('app.crypto.fills.filled', {
                  kind: t(`app.crypto.trades.kind.${f.side}.${f.type}`),
                  coin: f.symbol,
                  price: formatPrice(f.price!, locale),
                })}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Price of the chosen coin and how it moved in 24 hours (facts, nothing more). */
function Quote({ coin }: { coin: CryptoCoin | undefined }) {
  const { t, locale } = useI18n();
  return (
    <div className="cc-quote">
      <span className="cc-quote-price">
        {coin?.price == null ? '—' : formatPrice(coin.price, locale)}
      </span>
      {coin?.changePercent24h != null && (
        <span className={`cc-${tone(coin.changePercent24h)}`}>
          {t('app.crypto.market.change24h', {
            change: formatChange(coin.changePercent24h, locale),
          })}
        </span>
      )}
      {coin?.high24h != null && coin.low24h != null && (
        <span className="cc-quote-range">
          {t('app.crypto.market.range24h', {
            low: formatPrice(coin.low24h, locale),
            high: formatPrice(coin.high24h, locale),
          })}
        </span>
      )}
    </div>
  );
}

function Intervals({
  value,
  onChange,
}: {
  value: CryptoInterval;
  onChange: (i: CryptoInterval) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="cc-intervals">
      <legend className="field-label">{t('app.crypto.market.interval')}</legend>
      {CHART_INTERVALS.map((option) => (
        <label key={option} className={`cc-interval${option === value ? ' cc-interval--on' : ''}`}>
          <input
            type="radio"
            name="cc-interval"
            value={option}
            checked={option === value}
            onChange={() => onChange(option)}
          />
          <span aria-hidden="true">{t(`app.crypto.intervals.short.${option}`)}</span>
          <span className="sr-only">{t(`app.crypto.intervals.${option}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Lines of the person's purchases and pending orders of the coin on the chart. */
export function chartLines(
  p: SimPortfolio | null,
  symbol: string,
  t: (key: string) => string
): ChartLine[] {
  if (!p) return [];
  return [
    ...p.open
      .filter((o) => o.symbol === symbol)
      .map((o) => ({
        id: o.id,
        price: o.entryPrice,
        kind: 'entry' as const,
        title: t('app.crypto.chart.lineEntry'),
      })),
    ...p.pending
      .filter((o) => o.symbol === symbol)
      .map((o) => ({
        id: o.id,
        price: o.price,
        kind: o.side,
        title: t(`app.crypto.trades.kind.${o.side}.${o.type}`),
      })),
  ];
}

function MarketPanel({
  view,
  market,
  coin,
  lines,
  onChange,
}: {
  view: View;
  market: CryptoMarket;
  coin: CryptoCoin | undefined;
  lines: ChartLine[];
  onChange: (next: Partial<View>) => void;
}) {
  const { t } = useI18n();
  const coinId = useId();
  const coins = market.coins?.coins ?? [];
  const label = t('app.crypto.chart.label', {
    coin: coin?.name ?? view.symbol,
    interval: t(`app.crypto.intervals.${view.interval}`),
  });
  return (
    <section className="card cc-market" aria-labelledby="cc-market-title">
      <h2 id="cc-market-title" className="section-title">
        {t('app.crypto.market.title')}
      </h2>
      <div className="cc-market-head">
        <div className="field">
          <label className="field-label" htmlFor={coinId}>
            {t('app.crypto.market.coin')}
          </label>
          <select
            id={coinId}
            value={view.symbol}
            onChange={(e) => onChange({ symbol: e.target.value })}
          >
            {(coins.length ? coins : [{ symbol: view.symbol, name: view.symbol }]).map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
        <Quote coin={coin} />
      </div>
      <Intervals value={view.interval} onChange={(interval) => onChange({ interval })} />
      <p className="cc-helps">
        <Help term="interval" label={t('app.crypto.help.interval')} />
        <Help term="candle" label={t('app.crypto.help.candle')} />
        <Help term="volume" label={t('app.crypto.help.volume')} />
      </p>
      {market.error && !market.candles && (
        <p className="error-banner" role="alert">
          {market.error}{' '}
          <button type="button" className="btn-link" onClick={market.refresh}>
            {t('app.crypto.market.retry')}
          </button>
        </p>
      )}
      {market.loading && <Loading />}
      {market.candles && (
        <>
          <Suspense fallback={<Loading />}>
            <PriceChart
              candles={market.candles.candles}
              viewKey={`${view.symbol}:${view.interval}`}
              label={label}
              lines={lines}
            />
          </Suspense>
          <ChartTable candles={market.candles.candles} label={label} />
        </>
      )}
    </section>
  );
}

function SimulatorPanels({
  sim,
  symbol,
  coin,
}: {
  sim: Simulator;
  symbol: string;
  coin: CryptoCoin | undefined;
}) {
  const { portfolio, action } = sim;
  if (!portfolio) {
    return sim.loadError ? (
      <p className="error-banner" role="alert">
        {sim.loadError}
      </p>
    ) : (
      <Loading />
    );
  }
  return (
    <>
      <FillsNotice fills={sim.fills} />
      {action.error && (
        <p className="error-banner" role="alert">
          {action.error}
        </p>
      )}
      <SimSummary portfolio={portfolio} />
      <OrderForm
        symbol={symbol}
        coinName={coin?.name ?? symbol}
        price={coin?.price ?? null}
        cash={portfolio.account.cash}
        feeBps={portfolio.account.feeBps}
        busy={action.pending}
        onPlace={sim.place}
      />
      <OpenPanel
        trades={portfolio.open}
        pending={portfolio.pending}
        busy={action.pending}
        onPlace={sim.place}
      />
      <PendingPanel
        orders={portfolio.pending}
        busy={action.pending}
        days={portfolio.limits.pendingDays}
        onCancel={sim.cancel}
      />
      <ClosedPanel trades={portfolio.closed} />
      <SimSettings
        portfolio={portfolio}
        busy={action.pending}
        onFee={sim.setFee}
        onReset={sim.reset}
      />
    </>
  );
}

/**
 * «Consola crypto»: the chart of the main coins (candles, sizes, zoom) and a simulator with play
 * money to learn how buying and selling works and whether it would have gained or lost. Never
 * real money, no advice, no signals: neutral explanations only.
 */
export function CryptoConsoleView() {
  const { t } = useI18n();
  const [view, setView] = useState(savedView);
  const market = useCryptoMarket(view.symbol, view.interval, t('app.crypto.market.error'));
  const sim = useSimulator(t('app.crypto.sim.error'));
  const coin = market.coins?.coins.find((c) => c.symbol === view.symbol);
  const lines = useMemo(
    () => chartLines(sim.portfolio, view.symbol, t),
    [sim.portfolio, view.symbol, t]
  );

  const change = (next: Partial<View>) => {
    const value = { ...view, ...next };
    setView(value);
    storage.set(VIEW_KEY, JSON.stringify(value));
  };

  return (
    <div className="section-view cc">
      <RiskBanner />
      <DataNotice market={market.candles?.market ?? market.coins?.market ?? null} />
      <MarketPanel view={view} market={market} coin={coin} lines={lines} onChange={change} />
      <SimulatorPanels sim={sim} symbol={view.symbol} coin={coin} />
      <Glossary />
    </div>
  );
}
