import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAction, type Action } from '@shared/hooks/useAction';
import { errorMessage } from '@shared/utils/errors';
import type { OrderRequest, SimFill, SimPortfolio } from '../domain/types';
import { MARKET_REFRESH_MS } from './useCryptoMarket';
import { usePolling } from './usePolling';

export interface Simulator {
  portfolio: SimPortfolio | null;
  loadError: string | null;
  /** Pending orders filled or expired since the last look (to announce them). */
  fills: SimFill[];
  action: Action;
  place: (order: OrderRequest) => Promise<boolean>;
  cancel: (id: string) => Promise<boolean>;
  reset: (initial: number, feeBps: number) => Promise<boolean>;
  setFee: (feeBps: number) => Promise<boolean>;
}

/**
 * The play-money portfolio of the person. Every answer of the API is the whole portfolio, with
 * the pending orders the price reached already resolved, so each action simply replaces it.
 */
export function useSimulator(fallback: string): Simulator {
  const { cryptoApi } = useApi();
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fills, setFills] = useState<SimFill[]>([]);
  const action = useAction(fallback);
  const mounted = useRef(true);

  const apply = useCallback((next: SimPortfolio) => {
    if (!mounted.current) return;
    setPortfolio(next);
    if (next.fills.length) setFills(next.fills);
  }, []);

  const load = useCallback(() => {
    cryptoApi
      .portfolio()
      .then((next) => {
        apply(next);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (mounted.current) setLoadError(errorMessage(e, fallback));
      });
  }, [cryptoApi, apply, fallback]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  usePolling(load, MARKET_REFRESH_MS);

  const run = (call: () => Promise<SimPortfolio>) =>
    action.run(async () => {
      setFills([]);
      apply(await call());
    });

  return {
    portfolio,
    loadError,
    fills,
    action,
    place: (order) => run(() => cryptoApi.placeOrder(order)),
    cancel: (id) => run(() => cryptoApi.cancelOrder(id)),
    reset: (initial, feeBps) => run(() => cryptoApi.reset(initial, feeBps)),
    setFee: (feeBps) => run(() => cryptoApi.setFee(feeBps)),
  };
}
