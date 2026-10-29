/**
 * Stand-in for TradingView Lightweight Charts™ in Jest (jsdom has no canvas). It records what the
 * app asks for and lets a test move the crosshair or the visible range like a person would.
 */
type Listener<T> = (value: T) => void;

export class FakeSeries {
  data: unknown[] = [];
  options: Record<string, unknown>;
  lines: { options: Record<string, unknown>; removed: boolean }[] = [];
  scaleOptions: Record<string, unknown> = {};
  constructor(
    public readonly kind: string,
    options: Record<string, unknown>
  ) {
    this.options = options;
  }
  /** Every setData (the whole series drawn again) and every update (one bar, in place). */
  sets = 0;
  updates: unknown[] = [];
  setData(data: unknown[]) {
    this.data = data;
    this.sets += 1;
  }
  /** Like the library: replaces the last bar with the same time or appends a newer one. */
  update(bar: { time: number }) {
    this.updates.push(bar);
    const last = this.data[this.data.length - 1] as { time: number } | undefined;
    if (last && last.time === bar.time) this.data = [...this.data.slice(0, -1), bar];
    else if (!last || bar.time > last.time) this.data = [...this.data, bar];
    else throw new Error('Cannot update oldest data');
  }
  applyOptions(options: Record<string, unknown>) {
    this.options = { ...this.options, ...options };
  }
  priceScale() {
    return { applyOptions: (o: Record<string, unknown>) => (this.scaleOptions = o) };
  }
  createPriceLine(options: Record<string, unknown>) {
    const line = { options, removed: false };
    this.lines.push(line);
    return line;
  }
  removePriceLine(line: { removed: boolean }) {
    line.removed = true;
  }
  /** Set by a test: the scale cannot say where a price is (as before anything is drawn). */
  blind = false;
  /** Prices to pixels: one pixel per unit, 300 at the bottom (0 € → y 300). */
  priceToCoordinate(price: number) {
    return this.blind ? null : 300 - price;
  }
  coordinateToPrice(y: number) {
    return this.blind ? null : 300 - y;
  }
  primitives: { updateAllViews?: () => void }[] = [];
  attachPrimitive(primitive: { updateAllViews?: () => void }) {
    this.primitives.push(primitive);
  }
  detachPrimitive(primitive: { updateAllViews?: () => void }) {
    this.primitives = this.primitives.filter((p) => p !== primitive);
  }
}

export class FakeChart {
  series: FakeSeries[] = [];
  removed = false;
  options: Record<string, unknown>;
  crosshair: Listener<{ time?: number }>[] = [];
  ranges: Listener<{ from: number; to: number } | null>[] = [];
  visibleRange: { from: number; to: number } | null = null;
  barSpacing = 6;
  /** Set by a test: the time scale cannot say which candle a pixel is. */
  blind = false;
  position = 0;
  fitted = 0;
  constructor(
    public readonly element: HTMLElement,
    options: Record<string, unknown>
  ) {
    this.options = options;
  }
  addSeries(definition: { type: string }, options: Record<string, unknown>) {
    const series = new FakeSeries(definition.type, options);
    this.series.push(series);
    return series;
  }
  applyOptions(options: Record<string, unknown>) {
    this.options = { ...this.options, ...options };
  }
  removeSeries(series: FakeSeries) {
    this.series = this.series.filter((s) => s !== series);
  }
  subscribeCrosshairMove(fn: Listener<{ time?: number }>) {
    this.crosshair.push(fn);
  }
  unsubscribeCrosshairMove(fn: Listener<{ time?: number }>) {
    this.crosshair = this.crosshair.filter((f) => f !== fn);
  }
  remove() {
    this.removed = true;
  }
  paneSize() {
    return { width: 600, height: 300 };
  }
  timeScale() {
    // Ten pixels per candle, from the first one on screen.
    const from = () => this.visibleRange?.from ?? 0;
    return {
      logicalToCoordinate: (logical: number) => (logical - from()) * 10,
      coordinateToLogical: (x: number) => (this.blind ? null : x / 10 + from()),
      subscribeVisibleLogicalRangeChange: (fn: Listener<{ from: number; to: number } | null>) =>
        this.ranges.push(fn),
      unsubscribeVisibleLogicalRangeChange: (fn: Listener<{ from: number; to: number } | null>) => {
        this.ranges = this.ranges.filter((f) => f !== fn);
      },
      setVisibleLogicalRange: (range: { from: number; to: number }) => {
        this.visibleRange = range;
      },
      fitContent: () => {
        this.fitted += 1;
      },
      options: () => ({ barSpacing: this.barSpacing }),
      applyOptions: (o: { barSpacing: number }) => {
        this.barSpacing = o.barSpacing;
      },
      scrollPosition: () => this.position,
      scrollToPosition: (position: number) => {
        this.position = position;
      },
    };
  }
  /** Moves the crosshair to a candle time (seconds), or away from the chart. */
  hover(time?: number) {
    this.crosshair.forEach((fn) => fn({ time }));
  }
  /** Changes the candles on screen, like a drag or a zoom. */
  show(range: { from: number; to: number } | null) {
    this.ranges.forEach((fn) => fn(range));
    this.paint();
  }
  /** The chart paints itself: what is attached to its series is told. */
  paint() {
    this.series.forEach((s) => s.primitives.forEach((p) => p.updateAllViews?.()));
  }
}

export const charts: FakeChart[] = [];

export function createChart(element: HTMLElement, options: Record<string, unknown>) {
  const chart = new FakeChart(element, options);
  charts.push(chart);
  return chart;
}

export const CandlestickSeries = { type: 'Candlestick' };
export const HistogramSeries = { type: 'Histogram' };
export const LineSeries = { type: 'Line' };
export const ColorType = { Solid: 'solid' };
export const LineStyle = { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3 };
