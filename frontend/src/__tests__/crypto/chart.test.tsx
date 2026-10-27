import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { PriceChart } from '@modules/crypto/ui/PriceChart';
import type { ChartLine } from '@modules/crypto/ui/useCandleChart';
import { candleList } from '@test-utils/crypto';
import { renderWithI18n } from '@test-utils/render';
import { charts, type FakeChart } from '../../__mocks__/lightweightCharts';

const candles = candleList(5);
const lines: ChartLine[] = [
  { id: 'p1', price: 101, title: 'Tu compra', kind: 'entry', slot: 1 },
  { id: 'o1', price: 95, title: 'Compra límite', kind: 'order', slot: null },
];
const onVisibleChange = jest.fn();
const onToggleLayer = jest.fn();

function draw(props: Partial<Parameters<typeof PriceChart>[0]> = {}) {
  const view = renderWithI18n(
    <PriceChart
      candles={candles}
      viewKey="BTC:1h"
      label="Gráfica de Bitcoin"
      interval="1h"
      lines={[]}
      layers={[]}
      onToggleLayer={onToggleLayer}
      onVisibleChange={onVisibleChange}
      {...props}
    />
  );
  const chart = charts[charts.length - 1];
  return { ...view, chart };
}

/** What a screen reader says about the chart (its description), with plain spaces. */
const described = () =>
  screen
    .getByRole('img', { name: /^Gráfica/ })
    .getAttribute('aria-describedby')!
    .split(' ')
    .map((id) => document.getElementById(id)!.textContent)
    .join(' ')
    .replace(/\u00a0|\u202f/g, ' ');

const series = (chart: FakeChart, kind: string) => chart.series.find((s) => s.kind === kind)!;

const phone = (matches: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

beforeEach(() => {
  onVisibleChange.mockClear();
  localStorage.clear();
  charts.length = 0;
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme');
});

describe('PriceChart', () => {
  it('draws candles and volume with the TradingView attribution and opens on the recent candles', () => {
    const { chart } = draw();
    expect((chart.options.layout as { attributionLogo: boolean }).attributionLogo).toBe(true);
    expect(series(chart, 'Candlestick').data).toHaveLength(5);
    expect(series(chart, 'Candlestick').data[0]).toEqual({
      time: candles[0].time / 1000,
      open: 100,
      high: 103,
      low: 99,
      close: 102,
    });
    const volume = series(chart, 'Histogram');
    expect(volume.data[1]).toMatchObject({ value: 11, color: '#ef444466' });
    expect(volume.scaleOptions).toEqual({ scaleMargins: { top: 0.8, bottom: 0 } });
    expect(chart.visibleRange).toEqual({ from: 0, to: 8 });
    expect(screen.getByRole('link', { name: /TradingView Lightweight Charts/ })).toHaveAttribute(
      'href',
      'https://www.tradingview.com/'
    );
    expect(screen.getByRole('img', { name: 'Gráfica de Bitcoin' })).toHaveAttribute(
      'tabindex',
      '0'
    );
  });

  it('formats prices, times and axis marks for the person', () => {
    const { chart } = draw();
    const options = chart.options as {
      localization: { priceFormatter: (p: number) => string; timeFormatter: (t: number) => string };
      timeScale: { tickMarkFormatter: (t: number, kind: number) => string };
    };
    expect(options.localization.priceFormatter(0.5)).toBe('0,5000');
    expect(options.localization.timeFormatter(candles[0].time / 1000)).toContain('2026');
    expect(options.timeScale.tickMarkFormatter(candles[0].time / 1000, 0)).toBe('2026');
  });

  it('reads out the candle under the pointer, or the last one', () => {
    const { chart } = draw();
    expect(screen.getByText('106,00 €')).toBeInTheDocument();
    act(() => chart.hover(candles[1].time / 1000));
    expect(screen.getByText('101,00 €')).toBeInTheDocument();
    act(() => chart.hover(123));
    expect(screen.getByText('106,00 €')).toBeInTheDocument();
    act(() => chart.hover(undefined));
    expect(screen.getByText('106,00 €')).toBeInTheDocument();
  });

  it('tells the header the change of the candles on screen, and counts them', () => {
    const { chart } = draw();
    const count = () => screen.getByText(/Velas a la vista/).textContent;
    expect(onVisibleChange).toHaveBeenLastCalledWith(null);
    expect(count()).toBe('Velas a la vista: 5');
    act(() => chart.show({ from: 0, to: 1 }));
    expect(onVisibleChange.mock.calls.at(-1)![0]).toBeCloseTo(0.5);
    expect(count()).toBe('Velas a la vista: 2');
    act(() => chart.show({ from: -3, to: 9 }));
    expect(count()).toBe('Velas a la vista: 5');
    act(() => chart.show({ from: 3.2, to: 3.8 }));
    expect(onVisibleChange).toHaveBeenLastCalledWith(null);
    expect(count()).toBe('Velas a la vista: 0');
  });

  it('says there is little volume when over 30 % of the candles on screen have no trades', () => {
    // 40 candles: the last 15 are empty (one price, or no volume); nothing is filled in.
    const thin = candleList(40).map((c, i) =>
      i < 25 ? c : i % 2 ? { ...c, volume: 0 } : { ...c, high: c.open, low: c.open, close: c.open }
    );
    const note = () => document.querySelector('.cc-chart-thin');
    const { chart, rerender } = draw({ candles: thin, interval: '5m' });
    // Before the chart says what is on screen, the recent candles count (15 of 40 > 30 %).
    expect(note()).toHaveTextContent(
      'Poco volumen en esta moneda: prueba una temporalidad mayor (1 h o 4 h).'
    );
    expect(note()).toHaveAttribute('role', 'note');
    expect(series(chart, 'Candlestick').data).toHaveLength(40);
    act(() => chart.show({ from: 0, to: 24 }));
    expect(note()).toBeNull();
    act(() => chart.show({ from: 20, to: 39 }));
    expect(note()).not.toBeNull();
    // Too few candles to judge.
    act(() => chart.show({ from: 35, to: 39 }));
    expect(note()).toBeNull();
    act(() => chart.show({ from: 20, to: 39 }));
    const props = {
      label: 'Gráfica de Bitcoin',
      lines: [],
      layers: [],
      onToggleLayer,
      onVisibleChange,
    };
    rerender(<PriceChart {...props} candles={thin} viewKey="BTC:1h" interval="1h" />);
    expect(note()).toHaveTextContent('(4 h o 1 día)');
    rerender(<PriceChart {...props} candles={thin} viewKey="BTC:1h" interval="1d" />);
    expect(note()).toHaveTextContent('prueba una temporalidad mayor (1 sem.).');
    rerender(<PriceChart {...props} candles={thin} viewKey="BTC:1h" interval="1w" />);
    expect(note()).toHaveTextContent(
      'Poco volumen en esta moneda: muchas velas de este tramo no tienen operaciones.'
    );
  });

  it('shows the candle under the pointer in one short line with the full names on hover', () => {
    draw();
    const open = screen.getByTitle('Apertura');
    expect(open).toHaveTextContent('Ap.');
    expect(open.closest('p')).toHaveTextContent(/Volumen 14/);
    expect(screen.getByText(/La vela cierra en/)).toBeInTheDocument();
  });

  it('draws the layers that are on with their values in the chips, and removes them', () => {
    const many = candleList(40);
    const { chart, rerender, unmount } = draw({
      candles: many,
      layers: ['ema20', 'bollinger', 'profile', 'fibonacci', 'ema200', 'levels'],
    });
    expect(chart.series.filter((s) => s.kind === 'Line')).toHaveLength(5);
    expect(series(chart, 'Line').data[0]).toEqual({ time: many[0].time / 1000 });
    expect(series(chart, 'Line').data[30]).toHaveProperty('value');
    const chip = (name: RegExp) => screen.getByRole('button', { name });
    expect(chip(/^EMA 20 · \d/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^EMA 20 · /)).toHaveAttribute('title', expect.stringMatching(/^EMA 20: Ahora /));
    expect(chip(/^EMA 200 · —$/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^Bollinger ?: Superior .+, Media .+, Inferior /)).toHaveAttribute(
      'title',
      expect.stringContaining('Bandas de Bollinger: Superior')
    );
    expect(chip(/^Sop\.\/Resist\. ?: sin datos/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^EMA 50$/)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(/^EMA 50$/)).toHaveAttribute('title', 'EMA 50');
    fireEvent.click(chip(/^EMA 50$/));
    expect(onToggleLayer).toHaveBeenCalledWith('ema50');
    expect(series(chart, 'Candlestick').lines.map((l) => l.options.title)).toContain('POC');
    act(() => chart.show({ from: 5, to: 30 }));
    expect(
      series(chart, 'Candlestick').lines.some((l) => l.options.title === 'Fibo 50 %' && !l.removed)
    ).toBe(true);
    rerender(
      <PriceChart
        candles={many}
        viewKey="BTC:1h"
        label="Gráfica"
        interval="1h"
        lines={[]}
        layers={[]}
        onToggleLayer={onToggleLayer}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(chart.series.filter((s) => s.kind === 'Line')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'EMA 20' })).toHaveAttribute('aria-pressed', 'false');
    rerender(
      <PriceChart
        candles={many}
        viewKey="BTC:1h"
        label="Gráfica"
        interval="1h"
        lines={[]}
        layers={['vwap']}
        onToggleLayer={onToggleLayer}
        onVisibleChange={onVisibleChange}
      />
    );
    unmount();
    expect(chart.series.filter((s) => s.kind === 'Line')).toHaveLength(1);
  });

  it('asks to turn the phone once, and can go full screen from there', () => {
    phone(true);
    const { container, unmount } = draw();
    expect(screen.getByText('Gira el móvil para ver mejor la gráfica.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByText('Gira el móvil para ver mejor la gráfica.')).toBeNull();
    expect(localStorage.getItem('mm_crypto_rotate_hint')).toBe('1');
    unmount();
    draw();
    expect(screen.queryByText('Gira el móvil para ver mejor la gráfica.')).toBeNull();
    localStorage.clear();
    container.remove();
  });

  it('enters the browser full screen and turns sideways when it can', async () => {
    phone(true);
    const lock = jest.fn().mockResolvedValue(undefined);
    const unlock = jest.fn(() => {
      throw new Error('not locked');
    });
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { lock, unlock },
    });
    let element: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => element,
    });
    const exitFullscreen = jest.fn(() => {
      element = null;
      return Promise.reject(new Error('already left'));
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });
    HTMLElement.prototype.requestFullscreen = jest.fn(() => {
      element = document.body;
      return Promise.resolve();
    });
    const { container } = draw();
    const hint = screen.getByText('Gira el móvil para ver mejor la gráfica.').closest('div')!;
    fireEvent.click(hint.querySelector('button')!);
    await waitFor(() => expect(lock).toHaveBeenCalledWith('landscape'));
    expect(container.querySelector('.cc-chart--expanded')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Salir de pantalla completa' }));
    expect(exitFullscreen).toHaveBeenCalled();
    expect(unlock).toHaveBeenCalled();
    // Leaving with the browser's own gesture (Back, Esc) also folds the chart.
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    await waitFor(() => expect(element).not.toBeNull());
    await act(async () => undefined);
    element = null;
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(container.querySelector('.cc-chart--expanded')).toBeNull();
    // A full screen the browser refused keeps the page layout.
    HTMLElement.prototype.requestFullscreen = jest.fn(() => Promise.reject(new Error('no')));
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    await act(async () => undefined);
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(container.querySelector('.cc-chart--expanded')).not.toBeNull();
    delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
    delete (document as { fullscreenElement?: unknown }).fullscreenElement;
    delete (window.screen as { orientation?: unknown }).orientation;
  });

  it('zooms, moves and shows everything with buttons and keys', () => {
    const { chart } = draw();
    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(chart.barSpacing).toBeCloseTo(8.4);
    fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(chart.barSpacing).toBeCloseTo(6);
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: 'Alejar' }));
    expect(chart.barSpacing).toBe(2);
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(chart.barSpacing).toBe(60);
    const all = screen.getByRole('button', { name: 'Ver todo' });
    expect(all).toHaveTextContent('Todo');
    expect(all).toHaveAttribute('aria-keyshortcuts', 'Home');
    expect(all).toHaveAttribute('title', 'Ver todo (Home)');
    fireEvent.click(all);
    expect(chart.fitted).toBe(1);
    chart.visibleRange = null;
    fireEvent.click(screen.getByRole('button', { name: 'Lo más reciente' }));
    expect(chart.visibleRange).toEqual({ from: 0, to: 8 });
    expect(screen.getByRole('button', { name: 'Alejar' })).toHaveAttribute('title', 'Alejar (−)');
    expect(screen.getByRole('button', { name: 'Acercar' })).toHaveAttribute('title', 'Acercar (+)');

    const canvas = screen.getByRole('img', { name: 'Gráfica de Bitcoin' });
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    expect(chart.position).toBe(-5);
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(chart.position).toBe(5);
    fireEvent.keyDown(canvas, { key: '-' });
    expect(chart.barSpacing).toBeCloseTo(60 / 1.4);
    fireEvent.keyDown(canvas, { key: '+' });
    fireEvent.keyDown(canvas, { key: '=' });
    expect(chart.barSpacing).toBe(60);
    fireEvent.keyDown(canvas, { key: 'Home' });
    expect(chart.fitted).toBe(2);
    chart.visibleRange = null;
    fireEvent.keyDown(canvas, { key: 'End' });
    expect(chart.visibleRange).not.toBeNull();
    fireEvent.keyDown(canvas, { key: 'a' });
    expect(chart.position).toBe(5);
  });

  it('goes full screen and back, also with Escape', () => {
    const { container } = draw();
    const full = screen.getByRole('button', { name: 'Pantalla completa' });
    fireEvent.click(full);
    expect(container.querySelector('.cc-chart--expanded')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.cc-chart--expanded')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salir de pantalla completa' }));
    expect(container.querySelector('.cc-chart--expanded')).toBeNull();
  });

  it('shows the bar of the full screen only there, keeps focus inside and gives it back', () => {
    const { container } = draw({ fullBar: <button type="button">Barra</button> });
    expect(screen.queryByRole('button', { name: 'Barra' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    const opener = screen.getByRole('button', { name: 'Pantalla completa' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Barra' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Gráfica/ })).toHaveFocus();
    // Tab from the last control goes to the first one, Shift+Tab the other way round.
    const first = screen.getByRole('button', { name: 'Barra' });
    const last = screen.getByRole('link', { name: /TradingView/ });
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    // Tab in the middle is left to the browser.
    screen.getByRole('button', { name: 'Alejar' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Alejar' })).toHaveFocus();
    // Focus that got out of the chart comes back to it.
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.cc-chart--expanded')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('keeps the view on new candles of the same coin and goes back to recent on another', () => {
    const { chart, rerender } = draw();
    chart.visibleRange = { from: 1, to: 2 };
    const more = candleList(6);
    rerender(
      <PriceChart
        candles={more}
        viewKey="BTC:1h"
        label="Gráfica"
        interval="1h"
        lines={[]}
        layers={[]}
        onToggleLayer={onToggleLayer}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(chart.visibleRange).toEqual({ from: 1, to: 2 });
    expect(series(chart, 'Candlestick').data).toHaveLength(6);
    rerender(
      <PriceChart
        candles={more}
        viewKey="ETH:1h"
        label="Gráfica"
        interval="1h"
        lines={[]}
        layers={[]}
        onToggleLayer={onToggleLayer}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(chart.visibleRange).toEqual({ from: 0, to: 9 });
  });

  it('draws the lines of purchases and orders, and replaces them', () => {
    const { chart, rerender, unmount } = draw({ lines });
    const candleSeries = series(chart, 'Candlestick');
    expect(candleSeries.lines.map((l) => l.options)).toEqual([
      expect.objectContaining({ price: 101, title: 'Tu compra', lineStyle: 0, color: '#60a5fa' }),
      expect.objectContaining({
        price: 95,
        title: 'Compra límite',
        lineStyle: 2,
        color: '#fbbf24',
      }),
    ]);
    rerender(
      <PriceChart
        candles={candles}
        viewKey="BTC:1h"
        label="Gráfica"
        interval="1h"
        lines={[{ id: 'o2', price: 120, title: 'SL', kind: 'stopLoss', slot: 1 }]}
        layers={[]}
        onToggleLayer={onToggleLayer}
        onVisibleChange={onVisibleChange}
      />
    );
    expect(candleSeries.lines.filter((l) => l.removed)).toHaveLength(2);
    expect(candleSeries.lines[2].options).toMatchObject({ price: 120, color: '#ef4444' });
    unmount();
    expect(chart.removed).toBe(true);
    expect(candleSeries.lines[2].removed).toBe(false);
  });

  it('follows the theme colours', async () => {
    document.documentElement.style.setProperty('--slate-900', '#ffffff');
    const { chart } = draw();
    expect(chart.options.layout).toMatchObject({ background: { color: '#ffffff' } });
    document.documentElement.style.setProperty('--slate-900', '#000000');
    document.documentElement.style.setProperty('--green-500', '#00ff00');
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() =>
      expect(chart.options.layout).toMatchObject({ background: { color: '#000000' } })
    );
    expect(series(chart, 'Candlestick').options).toMatchObject({ upColor: '#00ff00' });
  });

  it('draws #2 apart from #1, reads the lines out and shows how each is drawn', async () => {
    const two: ChartLine[] = [
      { id: 'e1', price: 101, title: 'Entrada short #1', kind: 'entry', slot: 1 },
      { id: 't1', price: 99, title: 'TP #1', kind: 'takeProfit', slot: 1 },
      { id: 'e2', price: 102, title: 'Entrada long #2', kind: 'entry', slot: 2 },
      { id: 't2', price: 104, title: 'TP #2', kind: 'takeProfit', slot: 2 },
      { id: 's2', price: 100, title: 'SL #2', kind: 'stopLoss', slot: 2 },
      { id: 'o2', price: 98, title: 'Pendiente long #2', kind: 'order', slot: 2 },
    ];
    const { chart } = draw({ lines: two });
    // Solid and dashed for #1; long dashes and dots, in a lighter tone, for #2 (still green, red).
    const looks = series(chart, 'Candlestick').lines.map((l) => [
      l.options.title,
      l.options.lineStyle,
      l.options.color,
    ]);
    expect(looks).toEqual([
      ['Entrada short #1', 0, '#60a5fa'],
      ['TP #1', 2, '#22c55e'],
      ['Entrada long #2', 3, '#93c5fd'],
      ['TP #2', 1, '#86efac'],
      ['SL #2', 1, '#fca5a5'],
      ['Pendiente long #2', 1, '#fcd34d'],
    ]);
    // Close labels move apart on the price scale instead of covering each other.
    expect(chart.options.rightPriceScale).toMatchObject({ alignLabels: true });
    expect(described()).toContain(
      'Tus líneas en la gráfica, de arriba abajo: TP #2: 104,00 €; Entrada long #2: 102,00 €; ' +
        'Entrada short #1: 101,00 €; SL #2: 100,00 €; TP #1: 99,00 €; Pendiente long #2: 98,00 €.'
    );
    const key = document.querySelector('.cc-chart-slots')!;
    expect(key).toHaveAttribute('aria-hidden', 'true');
    expect(key.textContent).toBe('Tus operaciones: #1 #2');
    expect(key.querySelector('.cc-chart-slot--even')).not.toBeNull();

    // A new theme draws the lines again in its colours.
    document.documentElement.style.setProperty('--blue-300', '#123456');
    document.documentElement.setAttribute('data-theme', 'light');
    await waitFor(() =>
      expect(
        series(chart, 'Candlestick').lines.filter(
          (l) => !l.removed && l.options.color === '#123456'
        )
      ).toHaveLength(1)
    );
  });

  it('has no key nor spoken lines without operations, and no number on lines without one', () => {
    draw({ lines: [{ id: 'x', price: 95, title: 'Compra', kind: 'order', slot: null }] });
    expect(document.querySelector('.cc-chart-slots')).toBeNull();
    expect(series(charts[0], 'Candlestick').lines[0].options).toMatchObject({ lineStyle: 2 });
    expect(described()).toContain('Tus líneas');
    cleanup();
    draw();
    expect(described()).not.toContain('Tus líneas');
  });

  it('says so when there are no candles', () => {
    draw({ candles: [] });
    expect(screen.getByText('No hay velas que mostrar.')).toBeInTheDocument();
  });
});
