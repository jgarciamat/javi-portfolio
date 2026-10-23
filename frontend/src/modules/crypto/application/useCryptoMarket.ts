import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorMessage } from '@shared/utils/errors';
import type { CryptoCandles, CryptoCoins, CryptoInterval } from '../domain/types';
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
}

/**
 * The coin list with prices and the candles of the chosen coin and size. Only the newest answer
 * may land, so switching coins quickly never shows the candles of the previous one.
 */
export function useCryptoMarket(
  symbol: string,
  interval: CryptoInterval,
  fallback: string
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

  const current = candles && candles.symbol === symbol && candles.interval === interval;
  return {
    coins,
    candles: current ? candles : null,
    coinsDone: coins !== null || coinsFailed,
    error,
    refresh,
  };
}
