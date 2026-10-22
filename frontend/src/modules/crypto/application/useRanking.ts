import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAction, type Action } from '@shared/hooks/useAction';
import { errorMessage } from '@shared/utils/errors';
import type { CryptoRanking, PriceAlerts } from '../domain/types';

/** Loads once enabled; answers after leaving the console are ignored. */
function useLoad<T>(load: () => Promise<T>, fallback: string, enabled: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const set = useCallback((next: T) => {
    if (mounted.current) setData(next);
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (enabled) {
      load()
        .then(set)
        .catch((e: unknown) => {
          if (mounted.current) setError(errorMessage(e, fallback));
        });
    }
    return () => {
      mounted.current = false;
    };
  }, [load, set, fallback, enabled]);
  return { data, error, set };
}

export interface Ranking {
  ranking: CryptoRanking | null;
  error: string | null;
  action: Action;
  save: (settings: { alias: string }) => Promise<boolean>;
}

/**
 * The monthly ranking: the top 5, the person's own place and their alias. Loaded once `enabled`
 * (when the portfolio of the month is there).
 */
export function useRanking(fallback: string, enabled: boolean): Ranking {
  const { cryptoApi } = useApi();
  const load = useCallback(() => cryptoApi.ranking(), [cryptoApi]);
  const { data, error, set } = useLoad(load, fallback, enabled);
  const action = useAction(fallback);
  return {
    ranking: data,
    error,
    action,
    save: (settings) => action.run(async () => set(await cryptoApi.setRanking(settings))),
  };
}

export interface Alerts {
  alerts: PriceAlerts | null;
  error: string | null;
  action: Action;
  create: (alert: {
    symbol: string;
    condition: 'above' | 'below';
    price: number;
  }) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

/** Price alerts (Premium): only loaded for people who have it. */
export function useAlerts(fallback: string, premium: boolean): Alerts {
  const { cryptoApi } = useApi();
  const load = useCallback(() => cryptoApi.alerts(), [cryptoApi]);
  const { data, error, set } = useLoad(load, fallback, premium);
  const action = useAction(fallback);
  return {
    alerts: data,
    error,
    action,
    create: (alert) => action.run(async () => set(await cryptoApi.createAlert(alert))),
    remove: (id) => action.run(async () => set(await cryptoApi.deleteAlert(id))),
  };
}
