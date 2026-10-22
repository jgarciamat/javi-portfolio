import { useEffect, useRef } from 'react';

/**
 * Calls `tick` every `ms` while the page is visible, and once more when it comes back to view.
 * A hidden tab (or a phone in the pocket) asks nothing.
 */
export function usePolling(tick: () => void, ms: number): void {
  const latest = useRef(tick);
  latest.current = tick;
  useEffect(() => {
    const run = () => {
      if (document.visibilityState !== 'hidden') latest.current();
    };
    const timer = window.setInterval(run, ms);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
    };
  }, [ms]);
}
