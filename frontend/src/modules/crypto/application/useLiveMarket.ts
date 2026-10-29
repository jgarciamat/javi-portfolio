import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { IDLE_MS, LIVE_MAX_BACKOFF_MS, LIVE_REFRESH_MS } from '../domain/live';
import type { CryptoInterval, CryptoLive } from '../domain/types';

/** `live`: ticking; `paused`: the person has not moved for a while; `off`: nothing to show. */
export type LiveState = 'live' | 'paused' | 'off';

export interface LiveMarket {
  /** The last tick that arrived (of any coin: whoever uses it checks it is the one on screen). */
  tick: CryptoLive | null;
  state: LiveState;
}

const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

/** True after `ms` without a touch, a click, a key, the wheel or the mouse moving. */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let last = Date.now();
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      // The mouse moves many times a second: the clock starts again at most once a second.
      if (Date.now() - last < 1000) return;
      last = Date.now();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    ACTIVITY.forEach((name) =>
      window.addEventListener(name, wake, { passive: true, capture: true })
    );
    return () => {
      window.clearTimeout(timer);
      ACTIVITY.forEach((name) => window.removeEventListener(name, wake, { capture: true }));
    };
  }, [ms]);
  return idle;
}

/** Whether the page is in view (not a tab behind another, not a phone in the pocket). */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

/**
 * The live tick of the chart: the price and the candle in progress every LIVE_REFRESH_MS, only
 * while the chart is on screen, the page in view and the person around. One request at a time
 * (the next one is asked once the last one answered, so a slow network never piles them up);
 * after failures it waits longer each time, up to LIVE_MAX_BACKOFF_MS, and the chart goes on with
 * the last tick and the full refresh every 30 s.
 */
export function useLiveMarket(
  symbol: string,
  interval: CryptoInterval,
  onScreen: boolean
): LiveMarket {
  const { cryptoApi } = useApi();
  const [tick, setTick] = useState<CryptoLive | null>(null);
  const idle = useIdle(IDLE_MS);
  const visible = usePageVisible();
  const active = onScreen && visible && !idle;

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer = 0;
    let failures = 0;
    const run = async () => {
      const started = Date.now();
      try {
        const next = await cryptoApi.live(symbol, interval);
        if (stopped) return;
        // Answers of another coin or size (a change on the way) never land.
        if (next.symbol === symbol && next.interval === interval) setTick(next);
        failures = 0;
      } catch {
        if (stopped) return;
        failures += 1;
      }
      const wait = failures
        ? Math.min(LIVE_MAX_BACKOFF_MS, LIVE_REFRESH_MS * 2 ** failures)
        : Math.max(0, LIVE_REFRESH_MS - (Date.now() - started));
      timer = window.setTimeout(() => void run(), wait);
    };
    void run();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [active, cryptoApi, symbol, interval]);

  const mine = tick && tick.symbol === symbol && tick.interval === interval ? tick : null;
  const state: LiveState = onScreen && idle ? 'paused' : active && mine ? 'live' : 'off';
  return { tick: mine, state };
}
