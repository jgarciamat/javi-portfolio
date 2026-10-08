import { useEffect, useRef } from 'react';

/** Calls `onEscape` when Escape is pressed anywhere, while `enabled`. */
export function useEscapeKey(onEscape: () => void, enabled: boolean): void {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
