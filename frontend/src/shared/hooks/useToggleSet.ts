import { useCallback, useState } from 'react';

/** A set of keys that can be toggled one by one (expanded rows, collapsed groups…). */
export function useToggleSet(initial: Iterable<string> = []) {
  const [items, setItems] = useState<ReadonlySet<string>>(() => new Set(initial));

  const toggle = useCallback((key: string) => {
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const add = useCallback((key: string) => {
    setItems((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  return { items, has: (key: string) => items.has(key), toggle, add };
}
