import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { LogicalRange } from 'lightweight-charts';
import { useI18n } from '@core/i18n/I18nContext';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { storage } from '@shared/utils/storage';
import { summarize } from '../domain/chart';
import { formatChange, formatDateTime, formatVolume, tone } from '../domain/format';
import { LAYER_COLORS, type LayerId } from '../domain/indicators';
import { layerLevels, layerLines, legend, type LegendItem } from '../domain/layers';
import type { Candle } from '../domain/types';
import { useMoney } from './money';
import { useCandleChart, type CandleChart, type ChartLine } from './useCandleChart';
import './css/PriceChart.css';

export type { ChartLine } from './useCandleChart';

interface PriceChartProps {
  /** Candles already in the display currency. */
  candles: Candle[];
  /** Coin, size and currency: when they change the view goes back to the recent candles. */
  viewKey: string;
  /** «Gráfica de Bitcoin, velas de 1 hora», read out with the chart. */
  label: string;
  lines: ChartLine[];
  /** Visual layers that are on (averages, bands, levels…). */
  layers: LayerId[];
  /** Change (%) of the candles on screen, for the header; null when there are none. */
  onVisibleChange: (percent: number | null) => void;
}

const HINT_KEY = 'mm_crypto_rotate_hint';
const PORTRAIT_PHONE = '(orientation: portrait) and (max-width: 719px)';

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};
const orientation = () => (screen as { orientation?: LockableOrientation }).orientation;

/** Open, high, low, close and volume of the candle under the pointer (or the last one). */
function Readout({ candle }: { candle: Candle | null }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  if (!candle) return <div className="cc-chart-readout" />;
  const price = (key: string, value: number, className?: string) => (
    <span>
      {t(`app.crypto.chart.${key}`)} <b className={className}>{money.shownPrice(value)}</b>
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
        <button key={key} type="button" className="cc-tool" onClick={act}>
          {t(`app.crypto.chart.${key}`)}
        </button>
      ))}
      <button
        type="button"
        className="cc-tool cc-tool--strong"
        aria-pressed={expanded}
        onClick={onExpand}
      >
        {expanded ? t('app.crypto.chart.exitFull') : t('app.crypto.chart.full')}
      </button>
    </div>
  );
}

/** A phone that turns, drawn with lines (it only moves when the person allows motion). */
function RotatingPhone() {
  return (
    <svg className="cc-rotate-phone" viewBox="0 0 48 48" aria-hidden="true">
      <rect
        x="16"
        y="6"
        width="16"
        height="36"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="37" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** «Turn the phone»: shown once on a phone held upright, until it is dismissed. */
function RotateHint({ onFull }: { onFull: () => void }) {
  const { t } = useI18n();
  const portrait = useMediaQuery(PORTRAIT_PHONE);
  const [seen, setSeen] = useState(() => storage.get(HINT_KEY) === '1');
  if (!portrait || seen) return null;
  const dismiss = () => {
    setSeen(true);
    storage.set(HINT_KEY, '1');
  };
  return (
    <div className="cc-rotate" role="status">
      <RotatingPhone />
      <p>{t('app.crypto.chart.rotate')}</p>
      <div className="cc-rotate-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            dismiss();
            onFull();
          }}
        >
          {t('app.crypto.chart.full')}
        </button>
        <button type="button" className="cc-tool" onClick={dismiss}>
          {t('app.crypto.chart.rotateOk')}
        </button>
      </div>
    </div>
  );
}

function Legend({ items }: { items: LegendItem[] }) {
  const { t } = useI18n();
  const money = useMoney();
  if (!items.length) return null;
  return (
    <ul className="cc-legend" aria-label={t('app.crypto.layers.legendLabel')}>
      {items.map((item) => (
        <li key={item.layer}>
          <i style={{ background: LAYER_COLORS[item.layer] }} aria-hidden="true" />
          <b>{t(`app.crypto.layers.names.${item.layer}`)}</b>
          {item.values.length === 0 ? (
            <span>{t('app.crypto.layers.noData')}</span>
          ) : (
            item.values.map((v) => (
              <span key={v.label}>
                {v.label} {v.price === null ? '—' : money.shownPrice(v.price)}
              </span>
            ))
          )}
        </li>
      ))}
    </ul>
  );
}

/** Full screen: the browser's own when it allows it, turned sideways on phones that let us. */
function useFullScreen(root: RefObject<HTMLDivElement | null>) {
  const [expanded, setExpanded] = useState(false);
  const native = useRef(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    const onChange = () => {
      if (native.current && !document.fullscreenElement) {
        native.current = false;
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onChange);
    };
  }, [expanded]);

  const enter = () => {
    setExpanded(true);
    // iPhone Safari and some WebViews have no element full screen: the page layout still fills
    // the view, and turning the phone is up to the person.
    root.current
      ?.requestFullscreen?.()
      .then(() => {
        native.current = true;
        return orientation()?.lock?.('landscape');
      })
      .catch(() => undefined);
  };
  const leave = () => {
    setExpanded(false);
    if (native.current && document.fullscreenElement) {
      native.current = false;
      void document.exitFullscreen().catch(() => undefined);
    }
    try {
      orientation()?.unlock?.();
    } catch {
      // Not locked: nothing to undo.
    }
  };
  return { expanded, toggle: () => (expanded ? leave() : enter()), enter };
}

/**
 * Candle chart of a coin, as in the original console: candles and volume, drag to move, wheel or
 * pinch to zoom, the prices of the candle under the pointer and the lines of the person's
 * purchases and pending orders, plus the visual layers that are on with their legend. Buttons
 * and keys do the same as the mouse, and a text summary is read out instead of the drawing.
 */
export function PriceChart({
  candles,
  viewKey,
  label,
  lines,
  layers,
  onVisibleChange,
}: PriceChartProps) {
  const { t, locale } = useI18n();
  const money = useMoney();
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<LogicalRange | null>(null);
  const from = range ? Math.ceil(range.from) : null;
  const to = range ? Math.floor(range.to) : 0;
  const shown = useMemo(() => (from === null ? null : { from, to }), [from, to]);
  const lineData = useMemo(() => layerLines(candles, layers), [candles, layers]);
  const levelData = useMemo(
    () => layerLevels(candles, layers, shown, t, locale),
    [candles, layers, shown, t, locale]
  );
  const chart = useCandleChart(container, {
    candles,
    viewKey,
    lines,
    locale,
    layerLines: lineData,
    layerLevels: levelData,
    onRange: setRange,
  });
  const full = useFullScreen(root);
  const helpId = useId();
  const summaryId = useId();

  const visible = shown ? summarize(candles, shown.from, shown.to) : null;
  const change = visible ? visible.changePercent : null;
  useEffect(() => {
    onVisibleChange(change);
  }, [change, onVisibleChange]);

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

  const whole = summarize(candles);

  return (
    <div ref={root} className={`cc-chart${full.expanded ? ' cc-chart--expanded' : ''}`}>
      <RotateHint onFull={full.enter} />
      <Readout candle={chart.hovered ?? candles[candles.length - 1] ?? null} />
      <Legend items={legend(lineData, levelData, layers, t)} />
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
              open: money.shownPrice(whole.first.open),
              close: money.shownPrice(whole.last.close),
              high: money.shownPrice(whole.high),
              low: money.shownPrice(whole.low),
              change: formatChange(whole.changePercent, locale),
            })
          : t('app.crypto.chart.empty')}
      </p>
      <Tools chart={chart} expanded={full.expanded} onExpand={full.toggle} />
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
