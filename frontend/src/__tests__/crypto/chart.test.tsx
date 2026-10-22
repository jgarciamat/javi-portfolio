import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { PriceChart } from '@modules/crypto/ui/PriceChart';
import type { ChartLine } from '@modules/crypto/ui/useCandleChart';
import { candleList } from '@test-utils/crypto';
import { renderWithI18n } from '@test-utils/render';
import { charts, type FakeChart } from '../../__mocks__/lightweightCharts';

const candles = candleList(5);
const lines: ChartLine[] = [
  { id: 'p1', price: 101, title: 'Tu compra', kind: 'entry' },
  { id: 'o1', price: 95, title: 'Compra límite', kind: 'order' },
];
const onVisibleChange = jest.fn();

function draw(props: Partial<Parameters<typeof PriceChart>[0]> = {}) {
  const view = renderWithI18n(
    <PriceChart
      candles={candles}
      viewKey="BTC:1h"
      label="Gráfica de Bitcoin"
      interval="1h"
      lines={[]}
      layers={[]}
      onVisibleChange={onVisibleChange}
      {...props}
    />
  );
  const chart = charts[charts.length - 1];
  return { ...view, chart };
}

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

  it('shows the candle under the pointer in one short line with the full names on hover', () => {
    draw();
    const open = screen.getByTitle('Apertura');
    expect(open).toHaveTextContent('Ap.');
    expect(open.closest('p')).toHaveTextContent(/Vol\. 14/);
    expect(screen.getByText(/La vela cierra en/)).toBeInTheDocument();
  });

  it('draws the layers that are on with their legend, and removes them', () => {
    const many = candleList(40);
    const { chart, rerender, unmount } = draw({
      candles: many,
      layers: ['ema20', 'bollinger', 'profile', 'fibonacci', 'ema200', 'levels'],
    });
    expect(chart.series.filter((s) => s.kind === 'Line')).toHaveLength(5);
    expect(series(chart, 'Line').data[0]).toEqual({ time: many[0].time / 1000 });
    expect(series(chart, 'Line').data[30]).toHaveProperty('value');
    const legend = screen.getByRole('list', { name: 'Valores de las capas encendidas' });
    expect(legend).toHaveTextContent('EMA 20');
    expect(legend).toHaveTextContent('sin datos');
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
        onVisibleChange={onVisibleChange}
      />
    );
    expect(chart.series.filter((s) => s.kind === 'Line')).toHaveLength(0);
    expect(screen.queryByRole('list', { name: 'Valores de las capas encendidas' })).toBeNull();
    rerender(
      <PriceChart
        candles={many}
        viewKey="BTC:1h"
        label="Gráfica"
        interval="1h"
        lines={[]}
        layers={['vwap']}
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
        lines={[{ id: 'o2', price: 120, title: 'SL', kind: 'stopLoss' }]}
        layers={[]}
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

  it('says so when there are no candles', () => {
    draw({ candles: [] });
    expect(screen.getByText('No hay velas que mostrar.')).toBeInTheDocument();
  });
});
