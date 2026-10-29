import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorMessage } from '@shared/utils/errors';
import { fits, mergeLive, withLive } from '../domain/live';
import type { CryptoCandles, CryptoCoins, CryptoInterval } from '../domain/types';
import { useLiveMarket, type LiveState } from './useLiveMarket';
import { usePolling } from './usePolling';

/** Prices and candles are refreshed this often while the console is on screen. */
export const MARKET_REFRESH_MS = 30_000;

export interface CryptoMarket {
  coins: CryptoCoins | null;
  candles: CryptoCandles | null;
  /** The coin list answered or failed (without it the console goes on with no list). */
  coinsDone: boolean;
  error: string | null;
  refresh: () => void;
  /** The live tick: whether it is on and when its last price arrived (ISO). */
  live: { state: LiveState; at: string | null };
}

/**
 * The coin list with prices and the candles of the chosen coin and size, every 30 s, and while
 * the chart is on screen (`onScreen`) the live tick every 2 s on top: the candle in progress and
 * the coin's price, merged in. Only the newest answer may land, so switching coins quickly never
 * shows the candles of the previous one.
 */
export function useCryptoMarket(
  symbol: string,
  interval: CryptoInterval,
  fallback: string,
  onScreen: boolean
): CryptoMarket {
  const { cryptoApi } = useApi();
  const [coins, setCoins] = useState<CryptoCoins | null>(null);
  const [coinsFailed, setCoinsFailed] = useState(false);
  const [candles, setCandles] = useState<CryptoCandles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const refresh = useCallback(() => {
    const id = ++request.current;
    cryptoApi
      .coins()
      .then((value) => {
        if (id === request.current) setCoins(value);
      })
      .catch(() => {
        if (id === request.current) setCoinsFailed(true);
      });
    cryptoApi
      .candles(symbol, interval)
      .then((value) => {
        if (id !== request.current) return;
        setCandles(value);
        setError(null);
      })
      .catch((e: unknown) => {
        if (id === request.current) setError(errorMessage(e, fallback));
      });
  }, [cryptoApi, symbol, interval, fallback]);

  useEffect(() => {
    setError(null);
    refresh();
  }, [refresh]);
  usePolling(refresh, MARKET_REFRESH_MS);
  const { tick, state } = useLiveMarket(symbol, interval, onScreen);

  const current = candles && candles.symbol === symbol && candles.interval === interval;
  const shownCandles = useMemo(() => {
    if (!current || !fits(tick, candles)) return current ? candles : null;
    const merged = mergeLive(candles.candles, tick.candles);
    return {
      ...candles,
      candles: merged,
      market: { ...candles.market, updatedAt: tick.market.updatedAt },
    };
  }, [current, candles, tick]);
  const shownCoins = useMemo(() => (coins && tick ? withLive(coins, tick) : coins), [coins, tick]);
  return {
    coins: shownCoins,
    candles: shownCandles,
    coinsDone: coins !== null || coinsFailed,
    error,
    refresh,
    live: { state, at: state === 'live' ? tick!.market.updatedAt : null },
  };
}
