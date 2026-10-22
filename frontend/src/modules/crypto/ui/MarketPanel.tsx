import { Suspense, useMemo, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { lazyNamed } from '@shared/utils/lazyNamed';
import type { CryptoMarket } from '../application/useCryptoMarket';
import { CHART_INTERVALS } from '../domain/chart';
import { DISPLAY_CURRENCIES, convertCandles, type DisplayCurrency } from '../domain/currency';
import { formatChange, formatDateTime, tone } from '../domain/format';
import type { GuideSection } from '../domain/guide';
import type { LayerId } from '../domain/indicators';
import type { Candle, CryptoCoin, CryptoInterval } from '../domain/types';
import { ChartTable } from './ChartTable';
import { CoinIcon, CoinList } from './CoinList';
import { LayerBar } from './LayerBar';
import { useMoney } from './money';
import type { ChartLine } from './useCandleChart';

// The chart library goes in its own chunk, downloaded only when a chart is shown.
const PriceChart = lazyNamed(() => import('./PriceChart'), 'PriceChart');

export interface View {
  symbol: string;
  interval: CryptoInterval;
}

export function Loading() {
  const { t } = useI18n();
  return (
    <p className="empty-block" role="status">
      {t('app.common.loading')}
    </p>
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
    <fieldset className="cc-segmented cc-intervals">
      <legend className="sr-only">{t('app.crypto.market.interval')}</legend>
      {CHART_INTERVALS.map((option) => (
        <label key={option} className={option === value ? 'is-on' : undefined}>
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

/** «€ EUR | $ USD»: how every amount of the console is shown. */
export function CurrencySwitch({
  value,
  onChange,
}: {
  value: DisplayCurrency;
  onChange: (c: DisplayCurrency) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="cc-segmented cc-currency">
      <legend className="sr-only">{t('app.crypto.currency.label')}</legend>
      {DISPLAY_CURRENCIES.map((option) => (
        <label key={option} className={option === value ? 'is-on' : undefined}>
          <input
            type="radio"
            name="cc-currency"
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
            <span className={`cc-${tone(day)}`}>
              {t('app.crypto.market.change24h', { change: formatChange(day, locale) })}
            </span>
          )}
          {change !== null && (
            <span>
              {t('app.crypto.chart.periodChange')}{' '}
              <b className={`cc-${tone(change)}`}>{formatChange(change, locale)}</b>
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

const coinName = (coin: CryptoCoin | undefined, symbol: string): string => coin?.name ?? symbol;

/** The chart (or why it is missing) for the candles in the display currency. */
function ChartArea({
  market,
  candles,
  viewKey,
  label,
  interval,
  lines,
  layers,
  onVisibleChange,
}: {
  market: CryptoMarket;
  candles: Candle[];
  viewKey: string;
  label: string;
  interval: CryptoInterval;
  lines: ChartLine[];
  layers: LayerId[];
  onVisibleChange: (percent: number | null) => void;
}) {
  const { t } = useI18n();
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
      {market.loading && <Loading />}
      {market.candles && (
        <Suspense fallback={<Loading />}>
          <PriceChart
            candles={candles}
            viewKey={viewKey}
            label={label}
            interval={interval}
            lines={lines}
            layers={layers}
            onVisibleChange={onVisibleChange}
          />
        </Suspense>
      )}
    </>
  );
}

/**
 * The market, compact like a trading desk: every coin in a column with its own scroll as tall as
 * the price and the chart, the price with the candle sizes and the currency on one row, the figures
 * of the day in one row of cells, the chart, and below it the layers and the table that stands in
 * for the chart.
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
  onGuide,
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
  onGuide: (section: GuideSection) => void;
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
            onVisibleChange={setChange}
          />
        </div>
        <div className="cc-market-below">
          <LayerBar active={layers} onToggle={onToggleLayer} onGuide={onGuide} />
          <ChartTable candles={candles} label={label} />
        </div>
      </div>
    </section>
  );
}
