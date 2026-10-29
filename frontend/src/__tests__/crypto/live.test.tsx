import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiProvider } from '@core/context/ApiContext';
import { useIdle, useLiveMarket } from '@modules/crypto/application/useLiveMarket';
import {
  IDLE_MS,
  LIVE_MAX_BACKOFF_MS,
  LIVE_REFRESH_MS,
  chartTail,
  fits,
  liveCoin,
  mergeLive,
  withLive,
} from '@modules/crypto/domain/live';
import type { Candle, CryptoInterval } from '@modules/crypto/domain/types';
import { formatClock } from '@modules/crypto/domain/format';
import { CryptoConsoleView } from '@modules/crypto/ui/CryptoConsoleView';
import { PriceChart } from '@modules/crypto/ui/PriceChart';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithI18n, renderWithProviders } from '@test-utils/render';
import { charts, type FakeChart } from '../../__mocks__/lightweightCharts';

// Every price here is made up.
const candle = (time: number, close: number, volume = 1): Candle => ({
  time,
  open: 100,
  high: Math.max(100, close),
  low: Math.min(100, close),
  close,
  volume,
});
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');

describe('merging the live tick', () => {
  const series = [candle(1, 101), candle(2, 102), candle(3, 103)];

  it('replaces the candle in progress, finishes the one before and adds a new one', () => {
    expect(mergeLive(series, [candle(2, 102.5), candle(3, 104)])).toEqual([
      candle(1, 101),
      candle(2, 102.5),
      candle(3, 104),
    ]);
    expect(mergeLive(series, [candle(3, 105), candle(4, 99)])).toEqual([
      ...series.slice(0, 2),
      candle(3, 105),
      candle(4, 99),
    ]);
    // Older than what is drawn: left alone (the same array back).
    expect(mergeLive(series, [candle(1, 50)])).toBe(series);
    expect(mergeLive([], [candle(1, 50)])).toEqual([]);
    expect(mergeLive([candle(5, 1)], [candle(4, 2)])).toEqual([candle(5, 1)]);
  });

  it('tells when only the end moved, to update it in place', () => {
    expect(chartTail([], series)).toBeNull();
    expect(chartTail(series, series.slice(0, 2))).toBeNull();
    expect(chartTail(series, [...series, candle(4, 1), candle(5, 1)])).toBeNull();
    expect(chartTail(series, [candle(1, 90), ...series.slice(1)])).toBeNull();
    expect(chartTail(series, [...series.slice(0, 2), candle(9, 1)])).toBeNull();
    expect(chartTail(series, [...series])).toEqual([]);
    expect(chartTail(series, [...series.slice(0, 2), candle(3, 110)])).toEqual([candle(3, 110)]);
    expect(chartTail(series, [...series, candle(4, 1)])).toEqual([candle(4, 1)]);
    expect(chartTail(series, [...series.slice(0, 2), candle(3, 99), candle(4, 1)])).toEqual([
      candle(3, 99),
      candle(4, 1),
    ]);
  });

  it('takes a tick only for its own coin, size and market, and never an older one', () => {
    const answer = fx.candles('BTC', '1h');
    const tick = fx.live(110);
    expect(fits(null, answer)).toBe(false);
    expect(fits(tick, null)).toBe(false);
    expect(fits(tick, answer)).toBe(true);
    expect(fits({ ...tick, symbol: 'ETH' }, answer)).toBe(false);
    expect(fits({ ...tick, interval: '5m' }, answer)).toBe(false);
    expect(fits({ ...tick, quote: 'USDT' }, answer)).toBe(false);
    expect(fits(fx.live(110, { seconds: -1 }), answer)).toBe(false);
    expect(
      fits(
        { ...tick, market: { ...tick.market, updatedAt: null } },
        { ...answer, market: { ...answer.market, updatedAt: null } }
      )
    ).toBe(true);
  });

  it('moves the coin to the last price: change worked out again, the day stretched', () => {
    const [btc, eth, shib] = fx.coins().coins;
    // 50.000 € after +1,5 %: the day opened at 49.261,08 €.
    expect(liveCoin(btc, 52_000)).toMatchObject({
      price: 52_000,
      changePercent24h: 5.56,
      high24h: 52_000,
      low24h: 48_500,
    });
    expect(liveCoin(btc, 48_000)).toMatchObject({ high24h: 51_000, low24h: 48_000 });
    expect(liveCoin(shib, 0.00002)).toMatchObject({
      price: 0.00002,
      changePercent24h: null,
      high24h: null,
      low24h: null,
    });
    expect(liveCoin({ ...eth, changePercent24h: null }, 2100).changePercent24h).toBeNull();
    const list = fx.coins();
    const moved = withLive(list, fx.live(51_000));
    expect(moved.coins[0].price).toBe(51_000);
    expect(moved.coins[1]).toBe(list.coins[1]);
    expect(withLive(list, fx.live(51_000, { seconds: -5 }))).toBe(list);
    expect(withLive(list, { ...fx.live(51_000), quote: 'USDT' }).coins[0]).toBe(list.coins[0]);
    const unknown = { ...list, market: { ...list.market, updatedAt: null } };
    const noTime = fx.live(51_000);
    expect(
      withLive(unknown, { ...noTime, market: { ...noTime.market, updatedAt: null } }).coins[0].price
    ).toBe(51_000);
  });

  it('writes the time of a live price with its seconds', () => {
    expect(formatClock('2026-03-15T12:00:07Z', 'es')).toMatch(/\d{2}:00:07/);
  });
});

/** The hook with the fake API (a tick that answers what each test says). */
function hook(
  change: (api: FakeApi) => void,
  initial: { symbol: string; interval: CryptoInterval; onScreen: boolean } = {
    symbol: 'BTC',
    interval: '1h',
    onScreen: true,
  }
) {
  const api = createFakeApi();
  change(api);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider value={api}>{children}</ApiProvider>
  );
  const view = renderHook((p) => useLiveMarket(p.symbol, p.interval, p.onScreen), {
    wrapper,
    initialProps: initial,
  });
  return { ...view, api };
}

const flush = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

describe('useLiveMarket', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    setHidden(false);
  });

  it('asks every 2 s once the last answer arrived, only for the coin and size on screen', async () => {
    const { result, api, rerender } = hook((a) =>
      a.cryptoApi.live.mockImplementation((symbol, interval) =>
        Promise.resolve(fx.live(110, { symbol, interval }))
      )
    );
    await flush();
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ state: 'live', tick: { price: 110 } });
    await flush(LIVE_REFRESH_MS - 1);
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(1);
    await flush(1);
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(2);
    // Another coin: asked at once, and the tick of the last one is not shown meanwhile.
    api.cryptoApi.live.mockImplementation(() => new Promise(() => undefined));
    rerender({ symbol: 'ETH', interval: '1h', onScreen: true });
    expect(result.current).toEqual({ tick: null, state: 'off' });
    await flush();
    expect(api.cryptoApi.live).toHaveBeenLastCalledWith('ETH', '1h');
  });

  it('drops a late answer of the coin before', async () => {
    let answer: (value: ReturnType<typeof fx.live>) => void = () => undefined;
    const { result, api, rerender } = hook((a) =>
      a.cryptoApi.live.mockImplementationOnce(() => new Promise((done) => (answer = done)))
    );
    await flush();
    api.cryptoApi.live.mockImplementation((symbol, interval) =>
      Promise.resolve(fx.live(2_000, { symbol, interval }))
    );
    rerender({ symbol: 'ETH', interval: '1h', onScreen: true });
    await flush();
    await act(async () => answer(fx.live(60_000)));
    expect(result.current.tick).toMatchObject({ symbol: 'ETH', price: 2_000 });
  });

  it('drops a late failure of the coin before (no wait added to the new one)', async () => {
    let fail: (error: Error) => void = () => undefined;
    const { api, rerender } = hook((a) =>
      a.cryptoApi.live.mockImplementationOnce(() => new Promise((_, no) => (fail = no)))
    );
    await flush();
    api.cryptoApi.live.mockResolvedValue(fx.live(2_000, { symbol: 'ETH' }));
    rerender({ symbol: 'ETH', interval: '1h', onScreen: true });
    await flush();
    await act(async () => fail(new Error('late')));
    await flush(LIVE_REFRESH_MS);
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(3);
  });

  it('ignores an answer for another coin than the one asked', async () => {
    const { result } = hook((a) =>
      a.cryptoApi.live.mockResolvedValue(fx.live(1, { symbol: 'ETH' }))
    );
    await flush();
    expect(result.current).toEqual({ tick: null, state: 'off' });
  });

  it('waits longer after each failure, up to 30 s, and starts again after an answer', async () => {
    const { api, result } = hook((a) => a.cryptoApi.live.mockRejectedValue(new Error('down')));
    await flush();
    const calls = () => api.cryptoApi.live.mock.calls.length;
    expect(calls()).toBe(1);
    await flush(2 * LIVE_REFRESH_MS - 1);
    expect(calls()).toBe(1);
    await flush(1);
    expect(calls()).toBe(2);
    await flush(4 * LIVE_REFRESH_MS);
    expect(calls()).toBe(3);
    for (let i = 0; i < 4; i++) await flush(LIVE_MAX_BACKOFF_MS);
    expect(calls()).toBe(7);
    api.cryptoApi.live.mockResolvedValue(fx.live(120));
    await flush(LIVE_MAX_BACKOFF_MS);
    expect(result.current.state).toBe('live');
    const after = calls();
    await flush(LIVE_REFRESH_MS);
    expect(calls()).toBe(after + 1);
  });

  it('asks nothing off screen, with the page hidden, or after a long while without the person', async () => {
    const { api, result, rerender } = hook((a) => a.cryptoApi.live.mockResolvedValue(fx.live(1)), {
      symbol: 'BTC',
      interval: '1h',
      onScreen: false,
    });
    await flush(10_000);
    expect(api.cryptoApi.live).not.toHaveBeenCalled();
    expect(result.current.state).toBe('off');
    rerender({ symbol: 'BTC', interval: '1h', onScreen: true });
    await flush();
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(1);

    setHidden(true);
    await flush(10_000);
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('off');
    setHidden(false);
    await flush();
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(2);

    await flush(IDLE_MS);
    expect(result.current.state).toBe('paused');
    const asked = api.cryptoApi.live.mock.calls.length;
    await flush(10_000);
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(asked);
    // A key (or a touch, the mouse…) brings it back at once.
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    await flush();
    expect(api.cryptoApi.live).toHaveBeenCalledTimes(asked + 1);
    expect(result.current.state).toBe('live');
  });

  it('starts the clock of the pause again with activity, at most once a second', async () => {
    const { result } = renderHook(() => useIdle(10_000));
    await flush(9_000);
    act(() => {
      fireEvent.pointerMove(window);
    });
    await flush(500);
    // Within the same second: the clock is not started again (it still ends at 10 s).
    act(() => {
      fireEvent.pointerMove(window);
    });
    await flush(9_000);
    expect(result.current).toBe(false);
    await flush(1_000);
    expect(result.current).toBe(true);
  });
});

const series = (chart: FakeChart, kind: string) => chart.series.find((s) => s.kind === kind)!;

describe('the live chart in the console', () => {
  afterEach(() => {
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
  });

  it('moves the candle in progress in place, the price with it, and opens the next one', async () => {
    let tick = fx.live(110);
    const api = createFakeApi();
    api.cryptoApi.live.mockImplementation(() => Promise.resolve(tick));
    jest.useFakeTimers();
    renderWithProviders(<CryptoConsoleView />, { api });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    await screen.findByRole('img', { name: /Gráfica de/ });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(LIVE_REFRESH_MS);
    });
    const chart = charts[charts.length - 1];
    const bars = series(chart, 'Candlestick');
    expect(api.cryptoApi.live).toHaveBeenCalledWith('BTC', '1h');
    expect(nb(document.querySelector('.cc-quote-price')!.textContent)).toBe('110,00 €');
    expect(bars.updates.length).toBeGreaterThan(0);
    const sets = bars.sets;
    expect((bars.data.at(-1) as { close: number }).close).toBe(110);
    const markText = nb(document.querySelector('.cc-live')!.textContent);
    expect(markText).toContain('En vivo');
    expect(markText).toContain(formatClock(tick.market.updatedAt!, 'es'));
    // The «updated» figure follows the tick too.
    expect(
      within(document.querySelector('.cc-stats') as HTMLElement).getByText(/2026/)
    ).toBeTruthy();

    tick = fx.live(112, { next: true, seconds: 4 });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(LIVE_REFRESH_MS);
    });
    expect(bars.data).toHaveLength(6);
    expect(bars.sets).toBe(sets);
    expect(series(chart, 'Histogram').data).toHaveLength(6);
    jest.useRealTimers();
  });

  it('runs only while the chart is on screen (IntersectionObserver)', async () => {
    const watched: { cb: (e: { isIntersecting: boolean }[]) => void; gone: boolean }[] = [];
    Object.assign(window, {
      IntersectionObserver: class {
        entry: (typeof watched)[number];
        constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
          this.entry = { cb, gone: false };
          watched.push(this.entry);
        }
        observe() {}
        disconnect() {
          this.entry.gone = true;
        }
      },
    });
    const api = createFakeApi();
    api.cryptoApi.live.mockResolvedValue(fx.live(110));
    const view = renderWithProviders(<CryptoConsoleView />, { api });
    await screen.findByRole('img', { name: /Gráfica de/ });
    expect(api.cryptoApi.live).not.toHaveBeenCalled();
    act(() => watched.filter((w) => !w.gone).forEach((w) => w.cb([{ isIntersecting: true }])));
    await waitFor(() => expect(api.cryptoApi.live).toHaveBeenCalled());
    view.unmount();
    expect(watched.every((w) => w.gone)).toBe(true);
  });
});

describe('the live mark of the chart', () => {
  const draw = (live?: { state: 'live' | 'paused' | 'off'; at: string | null }) =>
    renderWithI18n(
      <PriceChart
        candles={fx.candleList(5)}
        viewKey="BTC:1h"
        label="Gráfica de Bitcoin"
        interval="1h"
        lines={[]}
        layers={[]}
        onToggleLayer={jest.fn()}
        onVisibleChange={jest.fn()}
        live={live}
      />
    );

  it('keeps its place while off, says when it is paused and why', () => {
    const off = draw({ state: 'off', at: null });
    const mark = () => document.querySelector('.cc-live')!;
    expect(mark()).toHaveAttribute('aria-hidden', 'true');
    expect(mark()).toBeEmptyDOMElement();
    off.unmount();
    draw({ state: 'paused', at: null });
    expect(mark()).toHaveTextContent('En pausa');
    expect(mark()).toHaveAttribute('title', expect.stringContaining('vuelve al mover el ratón'));
    expect(mark()).not.toHaveAttribute('aria-hidden');
  });

  it('reads out the time of the last price, and is absent without a live tick', () => {
    const at = '2026-03-15T12:00:07.000Z';
    const on = draw({ state: 'live', at });
    expect(
      screen.getByText(`Precio en vivo, último dato a las ${formatClock(at, 'es')}`)
    ).toHaveClass('sr-only');
    expect(document.querySelector('.cc-live time')).toHaveAttribute('dateTime', at);
    on.unmount();
    draw();
    expect(document.querySelector('.cc-live')).toBeNull();
  });
});
