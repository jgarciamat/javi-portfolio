import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type { LogicalRange } from 'lightweight-charts';
import { useI18n } from '@core/i18n/I18nContext';
import { useMediaQuery } from '@shared/hooks/useMediaQuery';
import { storage } from '@shared/utils/storage';
import { formatCountdown, summarize, untilClose } from '../domain/chart';
import { formatChange, formatDateTime, formatVolume, pnl } from '../domain/format';
import type { LayerId } from '../domain/indicators';
import { layerLevels, layerLines, legend } from '../domain/layers';
import type { Candle, CryptoInterval } from '../domain/types';
import { LayerBar } from './LayerBar';
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
  /** Size of each candle, for the countdown to the close of the last one. */
  interval: CryptoInterval;
  lines: ChartLine[];
  /** Visual layers that are on (averages, bands, levels…). */
  layers: LayerId[];
  onToggleLayer: (layer: LayerId) => void;
  /** What goes just below the layer chips (the bar of the guide). */
  layerExtra?: ReactNode;
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

/** Open, high, low, close and volume of the candle under the pointer (or the last one), in a line. */
function Readout({ candle }: { candle: Candle | null }) {
  const { t, locale } = useI18n();
  const money = useMoney();
  if (!candle) return <p className="cc-chart-readout" />;
  const figure = (key: string, value: string, className?: string) => (
    <span>
      <abbr title={t(`app.crypto.chart.${key}`)}>{t(`app.crypto.chart.short.${key}`)}</abbr>{' '}
      <b className={className}>{value}</b>
    </span>
  );
  return (
    <p className="cc-chart-readout">
      <span>{formatDateTime(candle.time, locale)}</span>
      {figure('open', money.shownPrice(candle.open))}
      {figure('high', money.shownPrice(candle.high))}
      {figure('low', money.shownPrice(candle.low))}
      {figure('close', money.shownPrice(candle.close), pnl(candle.close - candle.open))}
      {figure('volume', formatVolume(candle.volume, locale))}
    </p>
  );
}

/** Time left until the last candle closes (ticking every second) and how many are on screen. */
function CandlePill({
  opened,
  interval,
  count,
}: {
  opened: number;
  interval: CryptoInterval;
  count: number;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <p className="cc-chart-pill">
      <span className="cc-close">
        {t('app.crypto.market.candleClose')}{' '}
        <b>{formatCountdown(untilClose(opened, interval, now))}</b>
      </span>
      <span>{t('app.crypto.market.inView', { count })}</span>
    </p>
  );
}

type IconName = 'zoomOut' | 'zoomIn' | 'recent' | 'all' | 'full' | 'exitFull';

/** Small line icons of the zoom bar. */
const ICONS: Record<IconName, string> = {
  zoomOut: 'M4 8h8',
  zoomIn: 'M4 8h8M8 4v8',
  recent: 'M3 8h8M8 4.5 11.5 8 8 11.5M13.5 3v10',
  all: 'M2.5 8h11M5 5.5 2.5 8 5 10.5M11 5.5l2.5 2.5-2.5 2.5',
  full: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
  exitFull: 'M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5',
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="cc-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={ICONS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** «− Alejar», «+ Acercar», «Reciente», «Todo» and full screen, below the chart. */
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
  // Icon, visible word, full name (when the word is shorter) and keyboard shortcut.
  const buttons: [IconName, string, string | undefined, string, () => void][] = [
    ['zoomOut', t('app.crypto.chart.zoomOut'), undefined, '-', chart.zoomOut],
    ['zoomIn', t('app.crypto.chart.zoomIn'), undefined, '+', chart.zoomIn],
    [
      'recent',
      t('app.crypto.chart.recentShort'),
      t('app.crypto.chart.recent'),
      'End',
      chart.showRecent,
    ],
    ['all', t('app.crypto.chart.allShort'), t('app.crypto.chart.all'), 'Home', chart.showAll],
  ];
  const full = expanded ? t('app.crypto.chart.exitFull') : t('app.crypto.chart.full');
  return (
    <div className="cc-chart-tools" role="group" aria-label={t('app.crypto.chart.tools')}>
      {buttons.map(([icon, word, name, key, act]) => (
        <button
          key={icon}
          type="button"
          className="cc-zoom"
          aria-label={name}
          aria-keyshortcuts={key}
          title={`${name ?? word} (${key === '-' ? '−' : key})`}
          onClick={act}
        >
          <Icon name={icon} />
          {word}
        </button>
      ))}
      <button
        type="button"
        className="cc-zoom cc-zoom--full"
        aria-pressed={expanded}
        title={expanded ? `${full} (Esc)` : full}
        onClick={onExpand}
      >
        <Icon name={expanded ? 'exitFull' : 'full'} />
        {full}
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

/**
 * The lines of the person's operations in words, top to bottom (the drawing cannot be read out),
 * and a key of how #1 and #2 are drawn: solid and dashed for the first, long dashes and dots in a
 * lighter tone for the second.
 */
function LinesKey({ id, lines }: { id: string; lines: ChartLine[] }) {
  const { t } = useI18n();
  const money = useMoney();
  const slots = [...new Set(lines.map((l) => l.slot ?? 0))]
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const words = [...lines]
    .sort((a, b) => b.price - a.price)
    .map((l) => `${l.title}: ${money.shownPrice(l.price)}`);
  return (
    <>
      <p id={id} className="sr-only">
        {words.length ? t('app.crypto.chart.linesSummary', { lines: words.join('; ') }) : ''}
      </p>
      {slots.length > 0 && (
        <p className="cc-chart-slots" aria-hidden="true">
          <span>{t('app.crypto.chart.slotsKey')}</span>
          {slots.map((slot) => (
            <span
              key={slot}
              className={`cc-chart-slot cc-chart-slot--${slot % 2 ? 'odd' : 'even'}`}
            >
              <i /> #{slot}
            </span>
          ))}
        </p>
      )}
    </>
  );
}

/** Candles on screen out of `total`: all of them until the chart says which ones it shows. */
const inView = (total: number, shown: { from: number; to: number } | null): number =>
  shown ? Math.max(0, Math.min(total - 1, shown.to) - Math.max(0, shown.from) + 1) : total;

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
 * purchases and pending orders, plus the chips of the visual layers with their values. Buttons
 * and keys do the same as the mouse, and a text summary is read out instead of the drawing.
 */
export function PriceChart({
  candles,
  viewKey,
  label,
  interval,
  lines,
  layers,
  onToggleLayer,
  layerExtra,
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
  const linesId = useId();

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
  const last = candles[candles.length - 1];

  return (
    <div ref={root} className={`cc-chart${full.expanded ? ' cc-chart--expanded' : ''}`}>
      <RotateHint onFull={full.enter} />
      <div className="cc-chart-head">
        <Readout candle={chart.hovered ?? last ?? null} />
        {last && (
          <CandlePill
            opened={last.time}
            interval={interval}
            count={inView(candles.length, shown)}
          />
        )}
      </div>
      <LayerBar
        active={layers}
        legend={legend(lineData, levelData, layers, t)}
        onToggle={onToggleLayer}
      />
      {layerExtra}
      <div
        ref={container}
        className="cc-chart-canvas"
        tabIndex={0}
        role="img"
        aria-roledescription={t('app.crypto.chart.role')}
        aria-label={label}
        aria-describedby={`${summaryId} ${linesId} ${helpId}`}
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
      <LinesKey id={linesId} lines={lines} />
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
