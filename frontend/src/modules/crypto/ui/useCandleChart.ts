import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesPrimitive,
  type Logical,
  type LogicalRange,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Locale } from '@core/i18n/I18nContext';
import { RECENT_CANDLES } from '../domain/chart';
import { chartTail } from '../domain/live';
import { logicalToTime, timeToLogical } from '../domain/drawings';
import { formatDateTime, formatPlain, formatTick, intlTag } from '../domain/format';
import { LAYER_COLORS } from '../domain/indicators';
import type { LayerLevel, LayerLine } from '../domain/layers';
import type { Candle, Slot } from '../domain/types';

/** A horizontal line on the chart: a purchase's entry price or a pending order's price. */
export interface ChartLine {
  id: string;
  price: number;
  title: string;
  kind: LineKind;
  /** Number of its operation (#1, #2): the second one is drawn apart. */
  slot: Slot;
}

type LineKind = 'entry' | 'takeProfit' | 'stopLoss' | 'order';

interface Palette {
  background: string;
  text: string;
  grid: string;
  up: string;
  down: string;
  /** Lines of the first operation of a coin, and (`second`) a lighter tone for the second one. */
  lines: Record<LineKind, string>;
  second: Record<LineKind, string>;
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
    lines: {
      entry: token(style, '--blue-400', '#60a5fa'),
      takeProfit: token(style, '--green-500', '#22c55e'),
      stopLoss: token(style, '--red-500', '#ef4444'),
      order: token(style, '--amber-400', '#fbbf24'),
    },
    // Green is still a take profit and red a stop loss: only the tone changes.
    second: {
      entry: token(style, '--blue-300', '#93c5fd'),
      takeProfit: token(style, '--green-300', '#86efac'),
      stopLoss: token(style, '--red-300', '#fca5a5'),
      order: token(style, '--amber-300', '#fcd34d'),
    },
  };
}

/**
 * How a line is drawn: the entry solid and the rest dashed for the first operation of a coin; long
 * dashes and dots, in a lighter tone, for the second one, so #1 and #2 never look alike.
 */
function lineLook(line: ChartLine, colors: Palette) {
  const second = !!line.slot && line.slot % 2 === 0;
  // [entry, take profit / stop loss / pending order]
  const styles = second
    ? [LineStyle.LargeDashed, LineStyle.Dotted]
    : [LineStyle.Solid, LineStyle.Dashed];
  return {
    color: (second ? colors.second : colors.lines)[line.kind],
    lineStyle: styles[line.kind === 'entry' ? 0 : 1],
  };
}

const toTime = (ms: number) => (ms / 1000) as UTCTimestamp;
const bar = (c: Candle) => ({
  time: toTime(c.time),
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
});
const volumeBar = (c: Candle, colors: Palette) => ({
  time: toTime(c.time),
  value: c.volume,
  color: `${c.close >= c.open ? colors.up : colors.down}66`,
});
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
    // Labels of lines whose prices are close move apart instead of covering each other.
    rightPriceScale: {
      borderVisible: false,
      alignLabels: true,
      scaleMargins: { top: 0.1, bottom: 0.25 },
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 4,
      // Wider candles by default (the library has no candle-width option; it scales with this).
      barSpacing: 10,
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

/** Lines and levels of the layers: drawn again whenever the candles or the layers change. */
function useLayerDrawing(
  current: () => Engine | null,
  candles: Candle[],
  layerLines: LayerLine[],
  layerLevels: LayerLevel[],
  locale: Locale
): void {
  useEffect(() => {
    const { chart } = current()!;
    const drawn = layerLines.map((line) => {
      const series = chart.addSeries(LineSeries, {
        color: LAYER_COLORS[line.layer],
        lineWidth: 2,
        lineStyle: line.dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(
        candles.map((c, i) => {
          const value = line.values[i];
          return value === null ? { time: toTime(c.time) } : { time: toTime(c.time), value };
        })
      );
      return series;
    });
    return () => {
      if (current()?.chart === chart) drawn.forEach((series) => chart.removeSeries(series));
    };
  }, [current, layerLines, candles, locale]);

  // Levels of the layers, as labelled horizontal lines.
  useEffect(() => {
    const series = current()!.candles;
    const drawn = layerLevels.map((level) =>
      series.createPriceLine({
        price: level.price,
        color: LAYER_COLORS[level.layer],
        lineWidth: 1,
        lineStyle: level.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
        title: level.title,
      })
    );
    return () => {
      if (current()?.candles === series) drawn.forEach((line) => series.removePriceLine(line));
    };
  }, [current, layerLevels, locale]);
}

/**
 * Data ↔ pixels of the chart's pane, for the drawings on top: a time (ms) and a price in the
 * display currency to x and y, and back. Null where the chart cannot say (nothing drawn yet).
 */
export interface Projection {
  width: number;
  height: number;
  x: (time: number) => number | null;
  y: (price: number) => number | null;
  time: (x: number) => number | null;
  price: (y: number) => number | null;
}

/** Where a few reference points land: when it changes, whatever is drawn on top must move. */
function signature({ chart, candles }: Engine, data: Candle[]): string {
  const timeScale = chart.timeScale();
  const { width, height } = chart.paneSize();
  // A price that does not move with the live tick (the first candle's), so only a real change of
  // the scale places the drawings again.
  const ref = data[0]?.close ?? 1;
  return [
    timeScale.logicalToCoordinate(0 as Logical),
    timeScale.logicalToCoordinate(1 as Logical),
    candles.priceToCoordinate(ref),
    candles.priceToCoordinate(ref * 2),
    width,
    height,
  ].join();
}

function project(engine: Engine, data: Candle[]): Projection {
  const timeScale = engine.chart.timeScale();
  const { width, height } = engine.chart.paneSize();
  return {
    width,
    height,
    x: (time) => {
      const logical = timeToLogical(data, time);
      return logical === null ? null : timeScale.logicalToCoordinate(logical as Logical);
    },
    y: (price) => engine.candles.priceToCoordinate(price),
    time: (x) => {
      const logical = timeScale.coordinateToLogical(x);
      return logical === null ? null : logicalToTime(data, logical);
    },
    price: (y) => engine.candles.coordinateToPrice(y),
  };
}

export interface CandleChart {
  /** The candle under the pointer, if any. */
  hovered: Candle | null;
  /** Pixels of the pane for the drawings (the hook renders again whenever they move). */
  projection: Projection | null;
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
    layerLines,
    layerLevels,
    onRange,
  }: {
    candles: Candle[];
    viewKey: string;
    lines: ChartLine[];
    locale: Locale;
    /** Averages, bands and VWAP of the layers that are on. */
    layerLines: LayerLine[];
    /** Volume profile, supports and resistances and Fibonacci levels. */
    layerLevels: LayerLevel[];
    /** Candles on screen changed (logical indexes): a drag, a zoom or new data. */
    onRange: (range: LogicalRange | null) => void;
  }
): CandleChart {
  const engine = useRef<Engine | null>(null);
  const shownKey = useRef('');
  // What the series hold now: the next candles that only move its end are updated in place.
  const drawn = useRef<{ engine: Engine | null; key: string; candles: Candle[] }>({
    engine: null,
    key: '',
    candles: [],
  });
  const data = useRef(candles);
  data.current = candles;
  const [hovered, setHovered] = useState<Candle | null>(null);
  // Bumped when the theme changes: the lines are drawn again in its colours.
  const [look, setLook] = useState(0);
  const rangeListener = useRef(onRange);
  rangeListener.current = onRange;
  // Bumped whenever the chart is painted with its pane moved, zoomed or rescaled: the drawings
  // on top are placed again.
  const [, setFrame] = useState(0);

  useEffect(() => {
    const built = build(container.current!, locale);
    engine.current = built;
    const onCrosshair = (param: MouseEventParams) => {
      const time = param.time === undefined ? null : fromTime(param.time);
      setHovered(time === null ? null : (data.current.find((c) => c.time === time) ?? null));
    };
    const setRange = (range: LogicalRange | null) => rangeListener.current(range);
    built.chart.subscribeCrosshairMove(onCrosshair);
    built.chart.timeScale().subscribeVisibleLogicalRangeChange(setRange);
    // Called by the chart on every paint (drag, zoom, the price scale stretched, new data).
    let seen = '';
    const watcher: ISeriesPrimitive = {
      updateAllViews: () => {
        const next = signature(built, data.current);
        if (next === seen) return;
        seen = next;
        setFrame((n) => n + 1);
      },
    };
    built.candles.attachPrimitive(watcher);
    const observer = new MutationObserver(() => {
      recolor(built);
      setLook((n) => n + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => {
      observer.disconnect();
      built.candles.detachPrimitive(watcher);
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

  // The live tick moves the last candle (or opens a new one) every couple of seconds: those are
  // updated in place, so the view, the zoom and what is drawn stay where the person left them.
  // Anything else (another coin or size, the full refresh changing older candles) is drawn again.
  useEffect(() => {
    const current = engine.current!;
    const colors = palette();
    const before = drawn.current;
    const tail =
      before.engine === current && before.key === viewKey
        ? chartTail(before.candles, candles)
        : null;
    if (tail) {
      tail.forEach((c) => {
        current.candles.update(bar(c));
        current.volume.update(volumeBar(c, colors));
      });
    } else {
      current.candles.setData(candles.map(bar));
      current.volume.setData(candles.map((c) => volumeBar(c, colors)));
    }
    drawn.current = { engine: current, key: viewKey, candles };
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
        ...lineLook(line, colors),
        lineWidth: 2,
        axisLabelVisible: true,
        title: line.title,
      })
    );
    return () => {
      // The chart may be gone already (language change): then its lines went with it.
      if (engine.current?.candles === series) drawn.forEach((line) => series.removePriceLine(line));
    };
  }, [lines, locale, look]);

  const currentEngine = useCallback(() => engine.current, []);
  useLayerDrawing(currentEngine, candles, layerLines, layerLevels, locale);

  const zoom = (factor: number) => {
    const spacing = timeScale().options().barSpacing * factor;
    timeScale().applyOptions({ barSpacing: Math.min(MAX_SPACING, Math.max(MIN_SPACING, spacing)) });
  };

  return {
    hovered,
    projection: engine.current ? project(engine.current, candles) : null,
    zoomIn: () => zoom(ZOOM),
    zoomOut: () => zoom(1 / ZOOM),
    scroll: (bars) => timeScale().scrollToPosition(timeScale().scrollPosition() + bars, false),
    showRecent,
    showAll: () => timeScale().fitContent(),
  };
}
