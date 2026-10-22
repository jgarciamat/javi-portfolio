import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { summarize } from '../domain/chart';
import { formatChange, formatDateTime, formatPrice, formatVolume, tone } from '../domain/format';
import type { Candle } from '../domain/types';
import { useCandleChart, type CandleChart, type ChartLine } from './useCandleChart';
import './css/PriceChart.css';

export type { ChartLine } from './useCandleChart';

interface PriceChartProps {
  candles: Candle[];
  /** Coin and size: when they change the view goes back to the recent candles. */
  viewKey: string;
  /** «Gráfica de Bitcoin, velas de 1 hora», read out with the chart. */
  label: string;
  lines: ChartLine[];
}

/** Open, high, low, close and volume of the candle under the pointer (or the last one). */
function Readout({ candle }: { candle: Candle | null }) {
  const { t, locale } = useI18n();
  if (!candle) return <div className="cc-chart-readout" />;
  const price = (key: string, value: number, className?: string) => (
    <span>
      {t(`app.crypto.chart.${key}`)} <b className={className}>{formatPrice(value, locale)}</b>
    </span>
  );
  return (
    <div className="cc-chart-readout">
      <span>{formatDateTime(candle.time, locale)}</span>
      {price('open', candle.open)}
      {price('high', candle.high)}
      {price('low', candle.low)}
      {price('close', candle.close, `cc-${tone(candle.close - candle.open)}`)}
      <span>
        {t('app.crypto.chart.volume')} <b>{formatVolume(candle.volume, locale)}</b>
      </span>
    </div>
  );
}

function Tools({
  chart,
  expanded,
  onExpand,
}: {
  chart: CandleChart;
  expanded: boolean;
  onExpand: () => void;
}) {
  const { t } = useI18n();
  const buttons: [string, () => void][] = [
    ['zoomIn', chart.zoomIn],
    ['zoomOut', chart.zoomOut],
    ['recent', chart.showRecent],
    ['all', chart.showAll],
  ];
  return (
    <div className="cc-chart-tools" role="group" aria-label={t('app.crypto.chart.tools')}>
      {buttons.map(([key, act]) => (
        <button key={key} type="button" className="btn-secondary" onClick={act}>
          {t(`app.crypto.chart.${key}`)}
        </button>
      ))}
      <button type="button" className="btn-secondary" aria-pressed={expanded} onClick={onExpand}>
        {expanded ? t('app.crypto.chart.exitFull') : t('app.crypto.chart.full')}
      </button>
    </div>
  );
}

/**
 * Candle chart of a coin, as in the original console: candles and volume, drag to move, wheel or
 * pinch to zoom, the prices of the candle under the pointer, the change of the visible period and
 * the lines of the person's purchases and pending orders. Buttons and keys do the same as the
 * mouse, and a text summary is read out instead of the drawing.
 */
export function PriceChart({ candles, viewKey, label, lines }: PriceChartProps) {
  const { t, locale } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const chart = useCandleChart(container, { candles, viewKey, lines, locale });
  const [expanded, setExpanded] = useState(false);
  const helpId = useId();
  const summaryId = useId();

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const keys: Record<string, () => void> = {
    ArrowLeft: () => chart.scroll(-5),
    ArrowRight: () => chart.scroll(5),
    '+': chart.zoomIn,
    '=': chart.zoomIn,
    '-': chart.zoomOut,
    Home: chart.showAll,
    End: chart.showRecent,
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const act = keys[event.key];
    if (!act) return;
    event.preventDefault();
    act();
  };

  const visible = chart.range ? summarize(candles, chart.range.from, chart.range.to) : null;
  const whole = summarize(candles);

  return (
    <div className={`cc-chart${expanded ? ' cc-chart--expanded' : ''}`}>
      <Readout candle={chart.hovered ?? candles[candles.length - 1] ?? null} />
      {visible && (
        <p className="cc-chart-period">
          {t('app.crypto.chart.periodChange')}{' '}
          <b className={`cc-${tone(visible.changePercent)}`}>
            {formatChange(visible.changePercent, locale)}
          </b>
        </p>
      )}
      <div
        ref={container}
        className="cc-chart-canvas"
        tabIndex={0}
        role="img"
        aria-roledescription={t('app.crypto.chart.role')}
        aria-label={label}
        aria-describedby={`${summaryId} ${helpId}`}
        onKeyDown={onKeyDown}
      />
      <p id={summaryId} className="sr-only">
        {whole
          ? t('app.crypto.chart.summary', {
              from: formatDateTime(whole.first.time, locale),
              to: formatDateTime(whole.last.time, locale),
              open: formatPrice(whole.first.open, locale),
              close: formatPrice(whole.last.close, locale),
              high: formatPrice(whole.high, locale),
              low: formatPrice(whole.low, locale),
              change: formatChange(whole.changePercent, locale),
            })
          : t('app.crypto.chart.empty')}
      </p>
      <Tools chart={chart} expanded={expanded} onExpand={() => setExpanded((v) => !v)} />
      <p id={helpId} className="cc-chart-help">
        {t('app.crypto.chart.help')}
      </p>
      <p className="cc-chart-credit">
        {t('app.crypto.chart.credit')}{' '}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
          TradingView Lightweight Charts™
        </a>{' '}
        · Copyright © 2025 TradingView, Inc.
      </p>
    </div>
  );
}
