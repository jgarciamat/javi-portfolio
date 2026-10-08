import { useEffect, useRef, type RefObject } from 'react';

/** Calls `onOutside` on a mouse down outside `ref`, while `enabled`. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean
): void {
  const handler = useRef(onOutside);
  handler.current = onOutside;

  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handler.current();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, enabled]);
}
