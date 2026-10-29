import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ApiProvider } from '@core/context/ApiContext';
import { SAVE_MS, useDrawings } from '@modules/crypto/application/useDrawings';
import {
  DRAWINGS_MAX,
  anchor,
  keyboardPoints,
  logicalToTime,
  newDrawingId,
  timeToLogical,
  twoPoints,
  type Drawing,
} from '@modules/crypto/domain/drawings';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';

// Every price and note here is made up.
const H = 3_600_000;
const candles = fx.candleList(5);
const T0 = candles[0].time;

const line = (id: string, price = 100): Drawing => ({
  id,
  kind: 'horizontal',
  color: 'cyan',
  points: [{ time: T0, price }],
});

describe('Drawings: anchors in time and price', () => {
  it('turns times into logical indexes and back, between, before and after the candles', () => {
    expect(timeToLogical([], T0)).toBeNull();
    expect(logicalToTime([], 1)).toBeNull();
    expect(timeToLogical(candles, T0)).toBe(0);
    expect(timeToLogical(candles, T0 + 2.5 * H)).toBe(2.5);
    expect(timeToLogical(candles, T0 - 2 * H)).toBe(-2);
    expect(timeToLogical(candles, T0 + 6 * H)).toBe(6);
    for (const logical of [-3, 0, 0.25, 1, 3.5, 4, 7.75]) {
      expect(timeToLogical(candles, logicalToTime(candles, logical)!)).toBeCloseTo(logical);
    }
    // A gap in the candles: the time falls in proportion between its two neighbours.
    const gap = [candles[0], { ...candles[1], time: T0 + 4 * H }];
    expect(timeToLogical(gap, T0 + 2 * H)).toBe(0.5);
    expect(logicalToTime(gap, 0.5)).toBe(T0 + 2 * H);
    // One candle only: a minute per step beyond it.
    expect(timeToLogical([candles[0]], T0 + 120_000)).toBe(2);
  });

  it('keeps a point the server accepts', () => {
    expect(anchor(T0 + 0.4, 50)).toEqual({ time: T0, price: 50 });
    expect(anchor(0, -5)).toEqual({ time: Date.UTC(2009, 0, 1), price: 1e-12 });
    expect(anchor(Date.UTC(2200, 0, 1), 1).time).toBe(Date.UTC(2100, 0, 1));
  });

  it('knows which kinds take two points and makes short ids', () => {
    expect(['trend', 'rect', 'horizontal', 'text'].map((k) => twoPoints(k as never))).toEqual([
      true,
      true,
      false,
      false,
    ]);
    const id = newDrawingId();
    expect(id).toMatch(/^d[a-z0-9]+$/);
    expect(id.length).toBeLessThanOrEqual(40);
    expect(newDrawingId()).not.toBe(id);
  });

  it('places a drawing with the keyboard on the last candles, back in euros', () => {
    const many = fx.candleList(15);
    const last = many[14];
    expect(keyboardPoints('trend', [], 1)).toBeNull();
    expect(keyboardPoints('trend', many, 2)).toEqual([
      { time: many[4].time, price: many[4].close / 2 },
      { time: last.time, price: last.close / 2 },
    ]);
    expect(keyboardPoints('rect', many, 1)).toEqual([
      { time: many[4].time, price: Math.max(...many.slice(4).map((c) => c.high)) },
      { time: last.time, price: Math.min(...many.slice(4).map((c) => c.low)) },
    ]);
    expect(keyboardPoints('horizontal', candles, 1)).toEqual([
      { time: candles[4].time, price: candles[4].close },
    ]);
    expect(keyboardPoints('text', candles, 1)).toHaveLength(1);
  });
});

function hook(change?: (api: FakeApi) => void, symbol = 'BTC') {
  const api = createFakeApi();
  change?.(api);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider value={api}>{children}</ApiProvider>
  );
  const view = renderHook(({ coin }) => useDrawings(coin), {
    wrapper,
    initialProps: { coin: symbol },
  });
  return { ...view, api };
}

describe('useDrawings', () => {
  afterEach(() => jest.useRealTimers());

  it('asks for each coin once, keeps them apart and saves a moment after each change', async () => {
    jest.useFakeTimers();
    const { result, rerender, api } = hook((a) =>
      a.cryptoApi.drawings.mockImplementation((symbol) =>
        Promise.resolve(fx.drawings(symbol, symbol === 'BTC' ? [line('b1')] : []))
      )
    );
    expect(result.current.ready).toBe(false);
    // Nothing changes before the saved drawings are there.
    act(() => result.current.add(line('early')));
    await act(async () => undefined);
    expect(result.current).toMatchObject({ ready: true, failed: false, max: DRAWINGS_MAX });
    expect(result.current.items.map((d) => d.id)).toEqual(['b1']);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.add(line('b2')));
    act(() => result.current.add(line('b3')));
    expect(result.current.items).toHaveLength(3);
    expect(api.cryptoApi.saveDrawings).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(SAVE_MS));
    expect(api.cryptoApi.saveDrawings).toHaveBeenCalledTimes(1);
    expect(api.cryptoApi.saveDrawings).toHaveBeenLastCalledWith('BTC', result.current.items);

    rerender({ coin: 'ETH' });
    expect(result.current.ready).toBe(false);
    await act(async () => undefined);
    expect(result.current.items).toEqual([]);
    act(() => result.current.add(line('e1')));
    rerender({ coin: 'BTC' });
    // Back to Bitcoin: from memory, not asked again.
    expect(result.current.items.map((d) => d.id)).toEqual(['b1', 'b2', 'b3']);
    expect(api.cryptoApi.drawings).toHaveBeenCalledTimes(2);
    act(() => jest.advanceTimersByTime(SAVE_MS));
    expect(api.cryptoApi.saveDrawings).toHaveBeenLastCalledWith('ETH', [line('e1')]);
  });

  it('removes one, clears them and undoes step by step', async () => {
    jest.useFakeTimers();
    const { result, api } = hook((a) =>
      a.cryptoApi.drawings.mockResolvedValue(fx.drawings('BTC', [line('a'), line('b')]))
    );
    await act(async () => undefined);
    act(() => result.current.undo());
    expect(result.current.items).toHaveLength(2);
    act(() => result.current.remove('a'));
    expect(result.current.items.map((d) => d.id)).toEqual(['b']);
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.items.map((d) => d.id)).toEqual(['b']);
    act(() => result.current.undo());
    expect(result.current.items.map((d) => d.id)).toEqual(['a', 'b']);
    expect(result.current.canUndo).toBe(false);
    act(() => jest.advanceTimersByTime(SAVE_MS));
    expect(api.cryptoApi.saveDrawings).toHaveBeenCalledTimes(1);
    expect(api.cryptoApi.saveDrawings).toHaveBeenLastCalledWith('BTC', [line('a'), line('b')]);
  });

  it('never goes over the limit of a coin', async () => {
    const full = Array.from({ length: DRAWINGS_MAX }, (_, i) => line(`d${i}`));
    const { result } = hook((a) =>
      a.cryptoApi.drawings.mockResolvedValue(fx.drawings('BTC', full))
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.add(line('extra')));
    expect(result.current.items).toHaveLength(DRAWINGS_MAX);
  });

  it('keeps the tools off when the drawings cannot be loaded, until a retry works', async () => {
    const { result, api } = hook((a) =>
      a.cryptoApi.drawings.mockRejectedValueOnce(new Error('down'))
    );
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
    act(() => result.current.retry());
    expect(result.current.failed).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(api.cryptoApi.drawings).toHaveBeenCalledTimes(2);
  });

  it('ignores an answer for a coin that is no longer on screen', async () => {
    let answer: (value: ReturnType<typeof fx.drawings>) => void = () => undefined;
    let refuse: (error: Error) => void = () => undefined;
    const { result, rerender, api } = hook((a) =>
      a.cryptoApi.drawings
        .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
        .mockReturnValueOnce(new Promise((_, reject) => (refuse = reject)))
    );
    rerender({ coin: 'ETH' });
    rerender({ coin: 'SOL' });
    await act(async () => {
      answer(fx.drawings('BTC', [line('late')]));
      refuse(new Error('late'));
    });
    expect(result.current.failed).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender({ coin: 'BTC' });
    // Bitcoin's late answer was dropped: it is asked again.
    await waitFor(() => expect(api.cryptoApi.drawings).toHaveBeenCalledTimes(4));
  });

  it('says when a save fails and tries again with the next change', async () => {
    jest.useFakeTimers();
    const { result, api } = hook((a) =>
      a.cryptoApi.saveDrawings.mockRejectedValueOnce(new Error('offline'))
    );
    await act(async () => undefined);
    act(() => result.current.add(line('a')));
    await act(async () => jest.advanceTimersByTime(SAVE_MS));
    expect(result.current.unsaved).toBe(true);
    act(() => result.current.add(line('b')));
    await act(async () => jest.advanceTimersByTime(SAVE_MS));
    expect(result.current.unsaved).toBe(false);
    expect(api.cryptoApi.saveDrawings).toHaveBeenLastCalledWith('BTC', [line('a'), line('b')]);
  });

  it('keeps a failed list for later unless a newer one is waiting', async () => {
    jest.useFakeTimers();
    let refuse: (error: Error) => void = () => undefined;
    const { result, api, unmount } = hook((a) =>
      a.cryptoApi.saveDrawings.mockReturnValueOnce(new Promise((_, reject) => (refuse = reject)))
    );
    await act(async () => undefined);
    act(() => result.current.add(line('a')));
    act(() => jest.advanceTimersByTime(SAVE_MS));
    act(() => result.current.add(line('b')));
    await act(async () => refuse(new Error('offline')));
    // Leaving sends what is waiting at once: the newest list, not the failed one.
    unmount();
    expect(api.cryptoApi.saveDrawings).toHaveBeenCalledTimes(2);
    expect(api.cryptoApi.saveDrawings).toHaveBeenLastCalledWith('BTC', [line('a'), line('b')]);
  });

  it('saves what is waiting when the page is left', async () => {
    const { result, api } = hook();
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.add(line('a')));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(api.cryptoApi.saveDrawings).toHaveBeenCalledWith('BTC', [line('a')]);
    // Nothing waits any more.
    window.dispatchEvent(new Event('pagehide'));
    expect(api.cryptoApi.saveDrawings).toHaveBeenCalledTimes(1);
  });
});
