import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MonthOverview } from '@modules/finances/domain/types';
import { errorMessage } from '@shared/utils/errors';

interface MonthApi {
  get: (year: number, month: number) => Promise<MonthOverview>;
}

const keyOf = (year: number, month: number) => `${year}-${month}`;

/**
 * Loads the month overview (one request) with an in-memory cache per month:
 * a month seen before is shown at once and refreshed in the background.
 * Responses for a month the user already left are ignored.
 */
export function useMonthData(monthApi: MonthApi, year: number, month: number, enabled: boolean) {
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, MonthOverview>());
  const latest = useRef(0);

  const fetchMonth = useCallback(
    async (opts?: { invalidate?: boolean }) => {
      if (!enabled) return;
      if (opts?.invalidate) cache.current.clear();
      const key = keyOf(year, month);
      const cached = cache.current.get(key);
      if (cached) setOverview(cached);
      else setLoading(true);
      setError(null);
      const id = ++latest.current;
      try {
        const fresh = await monthApi.get(year, month);
        cache.current.set(key, fresh);
        if (id === latest.current) setOverview(fresh);
      } catch (e) {
        if (id === latest.current) setError(errorMessage(e, 'Error al cargar datos'));
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [year, month, enabled, monthApi]
  );

  useEffect(() => {
    void fetchMonth();
  }, [fetchMonth]);

  /** Drops one month from the cache (after a change that only affects it). */
  const forget = useCallback((y: number, m: number) => {
    cache.current.delete(keyOf(y, m));
  }, []);

  return useMemo(
    () => ({ overview, setOverview, loading, error, fetchMonth, forget }),
    [overview, loading, error, fetchMonth, forget]
  );
}
