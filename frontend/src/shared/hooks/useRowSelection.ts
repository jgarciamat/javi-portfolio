import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type HeaderState = 'none' | 'some' | 'all';

/** How a row was clicked: Shift extends a range from the last row, Ctrl/Cmd adds one. */
export interface SelectGesture {
  shiftKey?: boolean;
}

export interface RowSelection {
  /** Selected ids that are still on screen, in screen order. */
  ids: string[];
  count: number;
  /** Rows on screen. */
  total: number;
  isSelected: (id: string) => boolean;
  /** Toggles a row; with Shift, every row between the last one touched and this one. */
  toggle: (id: string, gesture: SelectGesture) => void;
  /** Selects (or unselects) several rows at once, e.g. a whole day. */
  setMany: (ids: string[], on: boolean) => void;
  /** All rows on screen, or none when every one is already selected. */
  toggleAll: () => void;
  stateOf: (ids: string[]) => HeaderState;
  header: HeaderState;
  clear: () => void;
}

/**
 * Multiple selection for a list of rows, file-manager style. `rowIds` are the rows on
 * screen in their order; ids that leave the list (deleted, another month, another filter)
 * stop counting as selected.
 */
export function useRowSelection(rowIds: string[]): RowSelection {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set());
  // Last row touched, where a Shift range starts ('' when none).
  const anchor = useRef('');

  const ids = useMemo(() => rowIds.filter((id) => chosen.has(id)), [rowIds, chosen]);
  const visible = useMemo(() => new Set(ids), [ids]);

  const setMany = useCallback((list: string[], on: boolean) => {
    setChosen((prev) => {
      const next = new Set(prev);
      for (const id of list) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  // The latest rows and selection, so `toggle` keeps one identity and memoized rows
  // that receive it are not drawn again on every click.
  const latest = useRef({ rowIds, visible });
  useEffect(() => {
    latest.current = { rowIds, visible };
  });

  const toggle = useCallback(
    (id: string, gesture: SelectGesture) => {
      const { rowIds, visible } = latest.current;
      const on = !visible.has(id);
      const from = rowIds.indexOf(anchor.current);
      const to = rowIds.indexOf(id);
      anchor.current = id;
      if (gesture.shiftKey && from !== -1) {
        const [a, b] = from < to ? [from, to] : [to, from];
        setMany(rowIds.slice(a, b + 1), true);
        return;
      }
      setMany([id], on);
    },
    [setMany]
  );

  const stateOf = useCallback(
    (list: string[]): HeaderState => {
      const n = list.filter((id) => visible.has(id)).length;
      if (n === 0) return 'none';
      return n === list.length ? 'all' : 'some';
    },
    [visible]
  );

  const header = stateOf(rowIds);
  const clear = useCallback(() => {
    anchor.current = '';
    setChosen(new Set());
  }, []);

  return {
    ids,
    count: ids.length,
    total: rowIds.length,
    isSelected: (id) => visible.has(id),
    toggle,
    setMany,
    toggleAll: () => setMany(rowIds, header !== 'all'),
    stateOf,
    header,
    clear,
  };
}
