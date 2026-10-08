import { useCallback, useRef, useState } from 'react';
import { errorMessage } from '@shared/utils/errors';

export interface Action {
  /** Runs the action; resolves to false (and sets `error`) when it throws. */
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  setError: (message: string | null) => void;
}

/** Pending/error state for user actions (save, delete…). */
export function useAction(fallbackError = 'Error'): Action {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(0);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      running.current += 1;
      setPending(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (e) {
        setError(errorMessage(e, fallbackError));
        return false;
      } finally {
        running.current -= 1;
        if (running.current === 0) setPending(false);
      }
    },
    [fallbackError]
  );

  return { run, pending, error, setError };
}
