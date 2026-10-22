import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { PriceChart } from '@modules/crypto/ui/PriceChart';
import type { ChartLine } from '@modules/crypto/ui/useCandleChart';
import { candleList } from '@test-utils/crypto';
import { renderWithI18n } from '@test-utils/render';
import { charts, type FakeChart } from '../../__mocks__/lightweightCharts';

const candles = candleList(5);
const lines: ChartLine[] = [
  { id: 'p1', price: 101, title: 'Tu compra', kind: 'entry' },
  { id: 'o1', price: 95, title: 'Compra límite', kind: 'buy' },
];

function draw(props: Partial<Parameters<typeof PriceChart>[0]> = {}) {
  const view = renderWithI18n(
    <PriceChart
      candles={candles}
      viewKey="BTC:1h"
      label="Gráfica de Bitcoin"
      lines={[]}
      {...props}
    />
  );
  const chart = charts[charts.length - 1];
  return { ...view, chart };
}

const series = (chart: FakeChart, kind: string) => chart.series.find((s) => s.kind === kind)!;

beforeEach(() => {
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

  it('shows the change of the candles on screen', () => {
    const { chart } = draw();
    expect(screen.queryByText(/Cambio en lo que ves/)).toBeNull();
    act(() => chart.show({ from: 0, to: 1 }));
    expect(screen.getByText(/Cambio en lo que ves/).textContent).toMatch(/\+0,50\s%/);
    act(() => chart.show(null));
    expect(screen.queryByText(/Cambio en lo que ves/)).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(chart.fitted).toBe(1);
    chart.visibleRange = null;
    fireEvent.click(screen.getByRole('button', { name: 'Lo más reciente' }));
    expect(chart.visibleRange).toEqual({ from: 0, to: 8 });

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
    rerender(<PriceChart candles={more} viewKey="BTC:1h" label="Gráfica" lines={[]} />);
    expect(chart.visibleRange).toEqual({ from: 1, to: 2 });
    expect(series(chart, 'Candlestick').data).toHaveLength(6);
    rerender(<PriceChart candles={more} viewKey="ETH:1h" label="Gráfica" lines={[]} />);
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
        lines={[{ id: 'o2', price: 120, title: 'Venta límite', kind: 'sell' }]}
      />
    );
    expect(candleSeries.lines.filter((l) => l.removed)).toHaveLength(2);
    expect(candleSeries.lines[2].options).toMatchObject({ price: 120, color: '#a78bfa' });
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
