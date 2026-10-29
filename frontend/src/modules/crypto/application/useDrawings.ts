import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { DRAWINGS_MAX, type Drawing } from '../domain/drawings';

/** A moment after the last change the list of the coin is saved (undo included). */
export const SAVE_MS = 600;
/** Steps «Undo» can go back, per coin, while the console is open. */
const UNDO_MAX = 30;

export interface Drawings {
  /** Drawings of the coin on screen (empty until they arrive). */
  items: Drawing[];
  /** They arrived: the tools can be used (never before, so nothing saved is overwritten). */
  ready: boolean;
  /** They could not be loaded: the tools stay off until «Retry» works. */
  failed: boolean;
  /** The last save failed: it is tried again with the next change, or when leaving. */
  unsaved: boolean;
  max: number;
  canUndo: boolean;
  add: (drawing: Drawing) => void;
  remove: (id: string) => void;
  clear: () => void;
  undo: () => void;
  retry: () => void;
}

interface Entry {
  items: Drawing[];
  history: Drawing[][];
}

/**
 * The person's drawings on the chart of each coin, kept on the server so they follow the
 * account to any device. Each coin is asked for the first time it is shown and kept in memory
 * while the console is open; every change is saved as the whole list of that coin, a moment
 * later, and once more when the page is left. The last save wins, from whichever device.
 */
export function useDrawings(symbol: string): Drawings {
  const { cryptoApi } = useApi();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [unsaved, setUnsaved] = useState(false);
  const latest = useRef(entries);
  latest.current = entries;
  const pending = useRef(new Map<string, Drawing[]>());
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    if (latest.current[symbol]) return;
    let live = true;
    cryptoApi
      .drawings(symbol)
      .then(({ drawings }) => {
        if (!live) return;
        setFailed(null);
        setEntries((all) => ({ ...all, [symbol]: { items: drawings, history: [] } }));
      })
      .catch(() => {
        if (live) setFailed(symbol);
      });
    return () => {
      live = false;
    };
  }, [cryptoApi, symbol, attempt]);

  const flush = useCallback(
    (coin: string) => {
      window.clearTimeout(timers.current.get(coin));
      timers.current.delete(coin);
      // Only called for a coin with a list waiting (its timer, or the way out).
      const list = pending.current.get(coin)!;
      pending.current.delete(coin);
      cryptoApi
        .saveDrawings(coin, list)
        .then(() => setUnsaved(false))
        .catch(() => {
          // Kept for the next change (or the way out), unless a newer list is waiting already.
          if (!pending.current.has(coin)) pending.current.set(coin, list);
          setUnsaved(true);
        });
    },
    [cryptoApi]
  );

  // Leaving the console or the page: what is waiting goes out at once.
  useEffect(() => {
    const flushAll = () => [...pending.current.keys()].forEach(flush);
    window.addEventListener('pagehide', flushAll);
    return () => {
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, [flush]);

  const entry = entries[symbol];
  /** A new list from the current one, or (null) one step back. */
  const change = (next: ((current: Drawing[]) => Drawing[]) | null) => {
    const current = latest.current[symbol];
    // Nothing to change before the saved drawings are there (the tools are off until then).
    if (!current) return;
    const value: Entry = !next
      ? {
          items: current.history[current.history.length - 1],
          history: current.history.slice(0, -1),
        }
      : {
          items: next(current.items),
          history: [...current.history, current.items].slice(-UNDO_MAX),
        };
    latest.current = { ...latest.current, [symbol]: value };
    setEntries(latest.current);
    pending.current.set(symbol, value.items);
    window.clearTimeout(timers.current.get(symbol));
    timers.current.set(
      symbol,
      window.setTimeout(() => flush(symbol), SAVE_MS)
    );
  };

  return {
    items: entry?.items ?? [],
    ready: !!entry,
    failed: !entry && failed === symbol,
    unsaved,
    max: DRAWINGS_MAX,
    canUndo: !!entry?.history.length,
    add: (drawing) => change((items) => [...items, drawing].slice(0, DRAWINGS_MAX)),
    remove: (id) => change((items) => items.filter((d) => d.id !== id)),
    clear: () => change(() => []),
    undo: () => {
      if (latest.current[symbol]?.history.length) change(null);
    },
    retry: () => {
      setFailed(null);
      setAttempt((n) => n + 1);
    },
  };
}
