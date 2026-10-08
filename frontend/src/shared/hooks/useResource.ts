import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { errorMessage } from '@shared/utils/errors';

export interface Resource<D> {
  data: D;
  setData: Dispatch<SetStateAction<D>>;
  loading: boolean;
  error: string | null;
  /** Loads again; resolves when the newest request finishes. */
  reload: () => Promise<void>;
}

interface Options {
  /** When false nothing is requested (e.g. signed out). Defaults to true. */
  enabled?: boolean;
  /** Message used when the error has none. */
  fallbackError?: string;
}

/**
 * Data loaded from the API for a set of dependencies. Only the newest request
 * may update the state, so a slow response for old filters (or a component that
 * already unmounted) can never overwrite newer data. With `initial` the data is
 * never undefined (e.g. an empty list until the first response).
 */
export function useResource<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  options: Options & { initial: T }
): Resource<T>;
export function useResource<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  options?: Options
): Resource<T | undefined>;
export function useResource<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  { enabled = true, fallbackError = 'Error', initial }: Options & { initial?: T } = {}
): Resource<T | undefined> {
  const [data, setData] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const reload = useCallback(async () => {
    if (!enabled) return;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const value = await loader.current();
      if (id === latest.current) setData(value);
    } catch (e) {
      if (id === latest.current) setError(errorMessage(e, fallbackError));
    } finally {
      if (id === latest.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fallbackError, ...deps]);

  useEffect(() => {
    void reload();
    // Unmount or new deps: whatever is in flight is now stale.
    return () => {
      latest.current += 1;
    };
  }, [reload]);

  return { data, setData, loading, error, reload };
}
