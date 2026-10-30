import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useAction, type Action } from '@shared/hooks/useAction';
import { errorMessage } from '@shared/utils/errors';
import { storage } from '@shared/utils/storage';
import type {
  ExitsRequest,
  OrderRequest,
  RecordRequest,
  SimFill,
  SimPortfolio,
} from '../domain/types';
import { MARKET_REFRESH_MS } from './useCryptoMarket';
import { usePolling } from './usePolling';

/** The portfolio last looked at on this device (the server falls back to the official one). */
export const PORTFOLIO_KEY = 'mm_crypto_portfolio';

export interface Simulator {
  portfolio: SimPortfolio | null;
  loadError: string | null;
  /** Pending orders filled or expired since the last look (to announce them). */
  fills: SimFill[];
  action: Action;
  /** Another portfolio is on its way (the console waits for it whole, as on the first visit). */
  switching: boolean;
  place: (order: OrderRequest) => Promise<boolean>;
  /**
   * «Register a trade I already opened» in the practice portfolio on screen: the fills of the
   * answer (its take profit or stop loss reached since the entry), or null when it was refused.
   */
  record: (trade: RecordRequest) => Promise<SimFill[] | null>;
  cancel: (id: string) => Promise<boolean>;
  /** Take profit and stop loss of an open position (null removes it). */
  setExits: (positionId: string, exits: ExitsRequest) => Promise<boolean>;
  /** Shows another portfolio (the official season or a practice one). */
  select: (portfolioId: string) => Promise<boolean>;
  /**
   * Adds the result of a closed practice operation to an account (once) and shows the portfolio
   * again; throws when the API refuses it (the caller shows why, beside its own buttons).
   */
  addToAccount: (positionId: string, accountId: string) => Promise<void>;
  createPractice: () => Promise<boolean>;
  resetPractice: () => Promise<boolean>;
  deletePractice: () => Promise<boolean>;
}

/**
 * The play-money portfolios of the person. Every answer of the API is a whole portfolio, with
 * the pending orders the price reached already resolved, so each action simply replaces it.
 */
export function useSimulator(fallback: string): Simulator {
  const { cryptoApi } = useApi();
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fills, setFills] = useState<SimFill[]>([]);
  const [switching, setSwitching] = useState(false);
  const action = useAction(fallback);
  const mounted = useRef(true);
  const selected = useRef<string | undefined>(storage.get(PORTFOLIO_KEY) ?? undefined);

  const apply = useCallback((next: SimPortfolio) => {
    if (!mounted.current) return;
    selected.current = next.portfolio.id;
    storage.set(PORTFOLIO_KEY, next.portfolio.id);
    setPortfolio(next);
    if (next.fills.length) setFills(next.fills);
  }, []);

  const load = useCallback(() => {
    cryptoApi
      .portfolio(selected.current)
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
  const swap = (call: () => Promise<SimPortfolio>) => {
    setSwitching(true);
    return run(call).finally(() => setSwitching(false));
  };
  const current = () => portfolio!.portfolio.id;

  return {
    portfolio,
    loadError,
    fills,
    action,
    switching,
    place: (order) =>
      run(() =>
        cryptoApi.placeOrder(
          portfolio?.portfolio.kind === 'practice' ? { ...order, portfolioId: current() } : order
        )
      ),
    record: async (trade) => {
      let fills: SimFill[] = [];
      const done = await run(async () => {
        const next = await cryptoApi.recordTrade(current(), trade);
        fills = next.fills;
        return next;
      });
      return done ? fills : null;
    },
    cancel: (id) => run(() => cryptoApi.cancelOrder(id)),
    setExits: (id, exits) => run(() => cryptoApi.setExits(id, exits)),
    select: (id) => swap(() => cryptoApi.portfolio(id)),
    addToAccount: async (positionId, accountId) =>
      apply(await cryptoApi.addToAccount(positionId, accountId)),
    createPractice: () => swap(() => cryptoApi.createPractice()),
    resetPractice: () => run(() => cryptoApi.resetPractice(current())),
    deletePractice: () => swap(() => cryptoApi.deletePractice(current())),
  };
}
