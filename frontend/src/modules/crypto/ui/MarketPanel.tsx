import { useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import type { CryptoMarket } from '../application/useCryptoMarket';
import { CHART_INTERVALS } from '../domain/chart';
import { DISPLAY_CURRENCIES, convertCandles, type DisplayCurrency } from '../domain/currency';
import { formatChange, formatDateTime, pnl } from '../domain/format';
import type { LayerId } from '../domain/indicators';
import type { Candle, CryptoCoin, CryptoInterval } from '../domain/types';
import { ChartTable } from './ChartTable';
import { CoinIcon, CoinList } from './CoinList';
import { LearnButton, LearnPanel, type Guide } from './Learn';
import { useMoney } from './money';
import type { ChartLine } from './useCandleChart';

let chart: typeof import('./PriceChart') | null = null;
let chartChunk: Promise<void> | null = null;

/**
 * The chart library goes in its own chunk, asked for once as soon as the console opens. The
 * console waits for it with the data, so the chart is drawn in the same paint as the rest.
 */
export const loadChart = () =>
  (chartChunk ??= import('./PriceChart').then((module) => {
    chart = module;
  }));

export interface View {
  symbol: string;
  interval: CryptoInterval;
}

function Intervals({
  value,
  onChange,
  name = 'cc-interval',
}: {
  value: CryptoInterval;
  onChange: (i: CryptoInterval) => void;
  /** Radio group name: apart in the full screen bar, so the two copies never share a choice. */
  name?: string;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="cc-segmented cc-intervals">
      <legend className="sr-only">{t('app.crypto.market.interval')}</legend>
      {CHART_INTERVALS.map((option) => (
        <label key={option} className={option === value ? 'is-on' : undefined}>
          <input
            type="radio"
            name={name}
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

/** «€ EUR | $ USD»: how every amount of the console is shown. */
export function CurrencySwitch({
  value,
  onChange,
  name = 'cc-currency',
}: {
  value: DisplayCurrency;
  onChange: (c: DisplayCurrency) => void;
  name?: string;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="cc-segmented cc-currency">
      <legend className="sr-only">{t('app.crypto.currency.label')}</legend>
      {DISPLAY_CURRENCIES.map((option) => (
        <label key={option} className={option === value ? 'is-on' : undefined}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={option === value}
            onChange={() => onChange(option)}
          />
          {option === 'USD' ? '$ USD' : '€ EUR'}
        </label>
      ))}
    </fieldset>
  );
}

/** Coin, price, its 24-hour change and the change of what is on screen. */
function QuoteHead({
  coin,
  symbol,
  change,
}: {
  coin: CryptoCoin | undefined;
  symbol: string;
  change: number | null;
}) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const day = coin?.changePercent24h ?? null;
  return (
    <div className="cc-quote-main">
      <CoinIcon symbol={symbol} />
      <p className="cc-quote-name">
        {coin?.name ?? symbol} <small>{`${symbol} / ${money.display.currency}`}</small>
      </p>
      <div className="cc-quote-line">
        <p className="cc-quote-price">{coin?.price == null ? '—' : money.price(coin.price)}</p>
        <p className="cc-quote-changes">
          {day !== null && (
            <span className={pnl(day)}>
              {t('app.crypto.market.change24h', { change: formatChange(day, locale) })}
            </span>
          )}
          {change !== null && (
            <span>
              {t('app.crypto.chart.periodChange')}{' '}
              <b className={pnl(change)}>{formatChange(change, locale)}</b>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/** Best offers, the 24-hour range and volume, and when the prices arrived: one row of cells. */
function Stats({ coin, updatedAt }: { coin: CryptoCoin | undefined; updatedAt: string | null }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const price = (v: number | null | undefined) => (v == null ? '—' : money.price(v));
  const stats: [string, string][] = [
    ['bid', price(coin?.bid)],
    ['ask', price(coin?.ask)],
    ['high', price(coin?.high24h)],
    ['low', price(coin?.low24h)],
    ['volume', coin?.volume24h == null ? '—' : money.amount(coin.volume24h)],
    ['updated', updatedAt ? formatDateTime(updatedAt, locale) : '—'],
  ];
  return (
    <dl className="cc-stats">
      {stats.map(([key, text]) => (
        <div key={key}>
          <dt>{t(`app.crypto.market.stats.${key}`)}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What stays in reach with the chart in full screen: the coin (with a small selector to change
 * it), its price and changes, the candle sizes and the currency, in one compact bar.
 */
function FullBar({
  coins,
  view,
  coin,
  change,
  currency,
  onChange,
  onCurrency,
}: {
  coins: CryptoCoin[];
  view: View;
  coin: CryptoCoin | undefined;
  change: number | null;
  currency: DisplayCurrency;
  onChange: (next: Partial<View>) => void;
  onCurrency: (c: DisplayCurrency) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="cc-full-bar">
      <QuoteHead coin={coin} symbol={view.symbol} change={change} />
      <label className="cc-full-coin">
        <span className="sr-only">{t('app.crypto.chart.pickCoin')}</span>
        <select value={view.symbol} onChange={(e) => onChange({ symbol: e.target.value })}>
          {coins.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name} ({c.symbol})
            </option>
          ))}
        </select>
      </label>
      <Intervals
        name="cc-full-interval"
        value={view.interval}
        onChange={(interval) => onChange({ interval })}
      />
      <CurrencySwitch name="cc-full-currency" value={currency} onChange={onCurrency} />
    </div>
  );
}

const coinName = (coin: CryptoCoin | undefined, symbol: string): string => coin?.name ?? symbol;

/**
 * Once drawn, the chart stays mounted (empty, under a blue frame) while other candles load, so a
 * chart in full screen survives a change of coin, candle size or currency.
 */
function useWaiting(market: CryptoMarket): boolean {
  const [drawn, setDrawn] = useState(false);
  if (market.candles && !drawn) setDrawn(true);
  return !market.candles && drawn && !market.error;
}

/** The chart (or why it is missing) for the candles in the display currency. */
function ChartArea({
  market,
  candles,
  viewKey,
  label,
  interval,
  lines,
  layers,
  onToggleLayer,
  layerExtra,
  fullBar,
  onVisibleChange,
}: {
  market: CryptoMarket;
  candles: Candle[];
  viewKey: string;
  label: string;
  interval: CryptoInterval;
  lines: ChartLine[];
  layers: LayerId[];
  onToggleLayer: (layer: LayerId) => void;
  layerExtra: ReactNode;
  fullBar: ReactNode;
  onVisibleChange: (percent: number | null) => void;
}) {
  const { t } = useI18n();
  const waiting = useWaiting(market);
  // Loaded before the panel is shown (see loadChart).
  const { PriceChart } = chart!;
  return (
    <>
      {market.error && !market.candles && (
        <p className="error-banner" role="alert">
          {market.error}{' '}
          <button type="button" className="btn-link" onClick={market.refresh}>
            {t('app.crypto.market.retry')}
          </button>
        </p>
      )}
      {(market.candles || waiting) && (
        <PriceChart
          candles={waiting ? [] : candles}
          viewKey={waiting ? `${viewKey}:loading` : viewKey}
          loading={waiting}
          label={label}
          interval={interval}
          lines={lines}
          layers={layers}
          onToggleLayer={onToggleLayer}
          layerExtra={layerExtra}
          fullBar={fullBar}
          onVisibleChange={onVisibleChange}
        />
      )}
    </>
  );
}

/**
 * The market, compact like a trading desk: the coins in pages as tall as the price and the chart,
 * the price with the candle sizes and the currency on one row, the figures of the day in one row
 * of cells, the layer chips and «Learn before playing» just above the chart, the table that
 * stands in for the chart at its foot and, below, the panel of the guide.
 */
export function MarketPanel({
  view,
  market,
  coin,
  lines,
  layers,
  currency,
  onChange,
  onCurrency,
  onToggleLayer,
  guide,
  premium,
}: {
  view: View;
  market: CryptoMarket;
  coin: CryptoCoin | undefined;
  lines: ChartLine[];
  layers: LayerId[];
  currency: DisplayCurrency;
  onChange: (next: Partial<View>) => void;
  onCurrency: (c: DisplayCurrency) => void;
  onToggleLayer: (layer: LayerId) => void;
  guide: Guide;
  /** Whether the person has Premium (for the «Free and Premium» tab of the guide). */
  premium: boolean;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const [change, setChange] = useState<number | null>(null);
  const coins = market.coins?.coins ?? [];
  const label = t('app.crypto.chart.label', {
    coin: coinName(coin, view.symbol),
    interval: t(`app.crypto.intervals.${view.interval}`),
  });
  const raw = market.candles?.candles;
  const candles = useMemo(
    () => (raw ? convertCandles(raw, money.display) : []),
    [raw, money.display]
  );

  return (
    <section className="card cc-market" aria-labelledby="cc-market-title">
      <h2 id="cc-market-title" className="section-title">
        {t('app.crypto.market.title')}
      </h2>
      <div className="cc-market-grid">
        <CoinList
          coins={coins}
          selected={view.symbol}
          onSelect={(symbol) => onChange({ symbol })}
        />
        <div className="cc-market-top">
          <div className="cc-market-head">
            <QuoteHead coin={coin} symbol={view.symbol} change={market.candles ? change : null} />
            <div className="cc-market-controls">
              <Intervals value={view.interval} onChange={(interval) => onChange({ interval })} />
              <CurrencySwitch value={currency} onChange={onCurrency} />
            </div>
          </div>
          <Stats coin={coin} updatedAt={market.candles?.market.updatedAt ?? null} />
        </div>
        <div className="cc-market-chart">
          <ChartArea
            market={market}
            candles={candles}
            viewKey={`${view.symbol}:${view.interval}:${money.display.currency}`}
            label={label}
            interval={view.interval}
            lines={lines}
            layers={layers}
            onToggleLayer={onToggleLayer}
            layerExtra={<LearnButton guide={guide} />}
            fullBar={
              <FullBar
                coins={coins}
                view={view}
                coin={coin}
                change={market.candles ? change : null}
                currency={currency}
                onChange={onChange}
                onCurrency={onCurrency}
              />
            }
            onVisibleChange={setChange}
          />
          <ChartTable candles={candles} label={label} />
        </div>
        <div className="cc-market-below">
          <LearnPanel guide={guide} premium={premium} />
        </div>
      </div>
    </section>
  );
}
