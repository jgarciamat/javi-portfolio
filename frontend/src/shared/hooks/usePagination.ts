import { useCallback, useState } from 'react';

export interface Pagination {
  /** Current page, from 1; always one that exists. */
  page: number;
  pages: number;
  /** First and last item (from 1) on the page; 0-0 when there are none. */
  from: number;
  to: number;
  go: (page: number) => void;
}

/** Number of pages for `count` items (at least one). */
export const pagesFor = (count: number, size: number): number =>
  Math.max(1, Math.ceil(count / size));

/**
 * Paging of a list. `resetKey` (a filter, the month…) sends it back to page 1 when it
 * changes; if the items shrink (a deletion) the page falls back to the last one.
 */
export function usePagination(count: number, size: number, resetKey: string): Pagination {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const pages = pagesFor(count, size);
  const page = Math.min(state.key === resetKey ? state.page : 1, pages);
  const go = useCallback(
    (next: number) => setState({ key: resetKey, page: Math.min(Math.max(1, next), pages) }),
    [resetKey, pages]
  );
  return {
    page,
    pages,
    from: count === 0 ? 0 : (page - 1) * size + 1,
    to: Math.min(page * size, count),
    go,
  };
}
