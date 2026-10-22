import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Locale } from '@core/i18n/I18nContext';
import { RECENT_CANDLES } from '../domain/chart';
import { formatDateTime, formatPlain, formatTick, intlTag } from '../domain/format';
import type { Candle } from '../domain/types';

/** A horizontal line on the chart: a purchase's entry price or a pending order's price. */
export interface ChartLine {
  id: string;
  price: number;
  title: string;
  kind: 'entry' | 'buy' | 'sell';
}

interface Palette {
  background: string;
  text: string;
  grid: string;
  up: string;
  down: string;
  entry: string;
  buy: string;
  sell: string;
}

const token = (style: CSSStyleDeclaration, name: string, fallback: string) =>
  style.getPropertyValue(name).trim() || fallback;

/** The chart takes the colours of the current theme (light, dark, contrast) from the tokens. */
function palette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return {
    background: token(style, '--slate-900', '#0f172a'),
    text: token(style, '--slate-300', '#cbd5e1'),
    grid: token(style, '--slate-800', '#1e293b'),
    up: token(style, '--green-500', '#22c55e'),
    down: token(style, '--red-500', '#ef4444'),
    entry: token(style, '--blue-400', '#60a5fa'),
    buy: token(style, '--amber-400', '#fbbf24'),
    sell: token(style, '--violet-400', '#a78bfa'),
  };
}

const toTime = (ms: number) => (ms / 1000) as UTCTimestamp;
const fromTime = (time: Time) => (time as number) * 1000;
const ZOOM = 1.4;
const MIN_SPACING = 2;
const MAX_SPACING = 60;

interface Engine {
  chart: IChartApi;
  candles: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'>;
}

function build(element: HTMLElement, locale: Locale): Engine {
  const colors = palette();
  const chart = createChart(element, {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.text,
      fontSize: 13,
      // TradingView's logo on the chart: the attribution its licence asks for.
      attributionLogo: true,
    },
    grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.25 } },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 4,
      tickMarkFormatter: (time: Time, kind: number) => formatTick(fromTime(time), kind, locale),
    },
    localization: {
      locale: intlTag(locale),
      priceFormatter: (price: number) => formatPlain(price, locale),
      timeFormatter: (time: Time) => formatDateTime(fromTime(time), locale),
    },
    handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    // A finger moving up and down scrolls the page, as everywhere else in the app.
    handleScroll: {
      mouseWheel: false,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false,
    },
  });
  const candles = chart.addSeries(CandlestickSeries, {
    upColor: colors.up,
    downColor: colors.down,
    wickUpColor: colors.up,
    wickDownColor: colors.down,
    borderVisible: false,
  });
  const volume = chart.addSeries(HistogramSeries, {
    priceScaleId: '',
    priceFormat: { type: 'volume' },
    lastValueVisible: false,
    priceLineVisible: false,
  });
  volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
  return { chart, candles, volume };
}

/** Light, dark and contrast change classes and attributes of <html>: the chart follows. */
function recolor({ chart, candles }: Engine): void {
  const next = palette();
  chart.applyOptions({
    layout: { background: { type: ColorType.Solid, color: next.background }, textColor: next.text },
    grid: { vertLines: { color: next.grid }, horzLines: { color: next.grid } },
  });
  candles.applyOptions({
    upColor: next.up,
    downColor: next.down,
    wickUpColor: next.up,
    wickDownColor: next.down,
  });
}

export interface CandleChart {
  /** The candle under the pointer, if any. */
  hovered: Candle | null;
  /** Candles on screen (logical indexes), for the change of the visible period. */
  range: LogicalRange | null;
  zoomIn: () => void;
  zoomOut: () => void;
  scroll: (bars: number) => void;
  showRecent: () => void;
  showAll: () => void;
}

/**
 * TradingView Lightweight Charts™ behind a hook: the chart lives as long as the component (and
 * the language), new candles keep the view where the person left it unless the coin or size
 * changed, and the lines follow the purchases and pending orders.
 */
export function useCandleChart(
  container: RefObject<HTMLDivElement | null>,
  {
    candles,
    viewKey,
    lines,
    locale,
  }: { candles: Candle[]; viewKey: string; lines: ChartLine[]; locale: Locale }
): CandleChart {
  const engine = useRef<Engine | null>(null);
  const shownKey = useRef('');
  const data = useRef(candles);
  data.current = candles;
  const [hovered, setHovered] = useState<Candle | null>(null);
  const [range, setRange] = useState<LogicalRange | null>(null);

  useEffect(() => {
    const built = build(container.current!, locale);
    engine.current = built;
    const onCrosshair = (param: MouseEventParams) => {
      const time = param.time === undefined ? null : fromTime(param.time);
      setHovered(time === null ? null : (data.current.find((c) => c.time === time) ?? null));
    };
    built.chart.subscribeCrosshairMove(onCrosshair);
    built.chart.timeScale().subscribeVisibleLogicalRangeChange(setRange);
    const observer = new MutationObserver(() => recolor(built));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => {
      observer.disconnect();
      built.chart.unsubscribeCrosshairMove(onCrosshair);
      built.chart.timeScale().unsubscribeVisibleLogicalRangeChange(setRange);
      built.chart.remove();
      engine.current = null;
      shownKey.current = '';
    };
  }, [container, locale]);

  const timeScale = () => engine.current!.chart.timeScale();
  const showRecent = () => {
    const count = data.current.length;
    timeScale().setVisibleLogicalRange({
      from: Math.max(0, count - RECENT_CANDLES),
      to: count + 3,
    });
  };

  useEffect(() => {
    const { candles: candleSeries, volume } = engine.current!;
    const colors = palette();
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volume.setData(
      candles.map((c) => ({
        time: toTime(c.time),
        value: c.volume,
        color: `${c.close >= c.open ? colors.up : colors.down}66`,
      }))
    );
    if (shownKey.current !== viewKey) {
      shownKey.current = viewKey;
      showRecent();
    }
    // showRecent only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, viewKey, locale]);

  useEffect(() => {
    const series = engine.current!.candles;
    const colors = palette();
    const drawn: IPriceLine[] = lines.map((line) =>
      series.createPriceLine({
        price: line.price,
        color: colors[line.kind],
        lineWidth: 2,
        lineStyle: line.kind === 'entry' ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: line.title,
      })
    );
    return () => {
      // The chart may be gone already (language change): then its lines went with it.
      if (engine.current?.candles === series) drawn.forEach((line) => series.removePriceLine(line));
    };
  }, [lines, locale]);

  const zoom = (factor: number) => {
    const spacing = timeScale().options().barSpacing * factor;
    timeScale().applyOptions({ barSpacing: Math.min(MAX_SPACING, Math.max(MIN_SPACING, spacing)) });
  };

  return {
    hovered,
    range,
    zoomIn: () => zoom(ZOOM),
    zoomOut: () => zoom(1 / ZOOM),
    scroll: (bars) => timeScale().scrollToPosition(timeScale().scrollPosition() + bars, false),
    showRecent,
    showAll: () => timeScale().fitContent(),
  };
}
