import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction } from '@shared/hooks/useAction';
import type { BulkResult, BulkTransactionChanges } from '@modules/finances/domain/types';
import { useFinances } from '../FinancesContext';

/** Seconds a bulk delete waits (rows hidden) so it can still be undone. */
export const UNDO_SECONDS = 6;

export interface BulkOutcome {
  kind: 'delete' | 'update';
  applied: number;
  /** Reasons of the skipped movements, with how many each. */
  skipped: { code: string; reason: string; count: number }[];
}

function outcomeOf(kind: BulkOutcome['kind'], result: BulkResult): BulkOutcome {
  const byCode = new Map<string, BulkOutcome['skipped'][number]>();
  for (const s of result.skipped) {
    const entry = byCode.get(s.code) ?? { code: s.code, reason: s.reason, count: 0 };
    entry.count += 1;
    byCode.set(s.code, entry);
  }
  return { kind, applied: result.applied.length, skipped: [...byCode.values()] };
}

/**
 * Joint actions on selected movements. A delete first hides the rows for a few seconds
 * with an "Undo" (leaving the screen sends it at once); changes are sent straight away.
 * `onDone` lets a list that is not the month (search) reload its own rows.
 */
export function useTransactionBulk(onDone?: () => void) {
  const f = useFinances();
  const action = useAction();
  const [hidden, setHidden] = useState<string[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);
  const pending = useRef<{ ids: string[]; timer: ReturnType<typeof setTimeout> } | null>(null);
  const latest = useRef({ f, onDone, action });
  latest.current = { f, onDone, action };

  const commit = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    setUndoCount(0);
    const { f: fin, onDone: done, action: act } = latest.current;
    void act.run(async () => {
      try {
        const result = await fin.bulkDeleteTransactions(current.ids);
        setOutcome(outcomeOf('delete', result));
      } finally {
        setHidden((prev) => prev.filter((id) => !current.ids.includes(id)));
        done?.();
      }
    });
  }, []);

  // Leaving the screen does not lose a delete that is waiting for its undo.
  useEffect(() => commit, [commit]);

  const remove = (ids: string[]) => {
    commit();
    setOutcome(null);
    setHidden((prev) => [...prev, ...ids]);
    setUndoCount(ids.length);
    pending.current = { ids, timer: setTimeout(commit, UNDO_SECONDS * 1000) };
  };

  const undo = () => {
    const { ids, timer } = pending.current!;
    clearTimeout(timer);
    pending.current = null;
    setUndoCount(0);
    setHidden((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const update = (ids: string[], changes: BulkTransactionChanges) => {
    setOutcome(null);
    return action.run(async () => {
      try {
        setOutcome(outcomeOf('update', await f.bulkUpdateTransactions(ids, changes)));
      } finally {
        onDone?.();
      }
    });
  };

  return {
    /** Rows waiting for the undo: hide them from the list. */
    hidden,
    /** Movements of the delete that can still be undone (0: nothing to undo). */
    undoCount,
    remove,
    undo,
    /** Sends the waiting delete now. */
    commit,
    update,
    outcome,
    dismissOutcome: () => setOutcome(null),
    pending: action.pending,
    error: action.error,
  };
}

export type TransactionBulk = ReturnType<typeof useTransactionBulk>;
