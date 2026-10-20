import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction } from '@shared/hooks/useAction';
import { useToggleSet } from '@shared/hooks/useToggleSet';
import { usePagination } from '@shared/hooks/usePagination';
import {
  groupByDay,
  pageOfGroups,
  TX_PAGE_SIZE,
} from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';

interface Options {
  transactions: Transaction[];
  locale: string;
  onPatch: (id: string, changes: { notes: string | null }) => Promise<unknown> | void;
  onDelete: (id: string) => Promise<unknown> | void;
  /** Changes with the filter or the month: the table goes back to its first page. */
  pageKey: string;
}

/**
 * Day groups (one page of them), collapsed days, inline notes editing and delete
 * confirmation. The handlers keep one identity, so memoized rows are not drawn again
 * when something else changes.
 */
export function useTransactionTable({ transactions, locale, onPatch, onDelete, pageKey }: Options) {
  const groups = useMemo(() => groupByDay(transactions, locale), [transactions, locale]);
  const paging = usePagination(transactions.length, TX_PAGE_SIZE, pageKey);
  const pageGroups = useMemo(
    () => pageOfGroups(groups, paging.page, TX_PAGE_SIZE),
    [groups, paging.page]
  );
  const collapsed = useToggleSet();
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValueState] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const action = useAction();
  const { run } = action;
  // Blur fires after Enter / Escape already closed the editor: only the open editor may save.
  const editing = useRef<{ id: string; original: string | null } | null>(null);
  // Latest values for the stable handlers below.
  const live = useRef({ notesValue, pendingDeleteId, onPatch, onDelete });
  useEffect(() => {
    live.current = { notesValue, pendingDeleteId, onPatch, onDelete };
  });

  const startEditNotes = useCallback((tx: Transaction) => {
    editing.current = { id: tx.id, original: tx.notes };
    setEditingNotesId(tx.id);
    setNotesValueState(tx.notes ?? '');
  }, []);

  const setNotesValue = useCallback((value: string) => {
    live.current.notesValue = value;
    setNotesValueState(value);
  }, []);

  const cancelEditNotes = useCallback(() => {
    editing.current = null;
    setEditingNotesId(null);
  }, []);

  const commitNotes = useCallback(() => {
    const current = editing.current;
    if (!current) return;
    cancelEditNotes();
    const notes = live.current.notesValue.trim() || null;
    if (notes !== current.original) {
      void run(async () => live.current.onPatch(current.id, { notes }));
    }
  }, [cancelEditNotes, run]);

  const confirmDelete = useCallback(() => {
    const id = live.current.pendingDeleteId;
    setPendingDeleteId(null);
    if (id) void run(async () => live.current.onDelete(id));
  }, [run]);

  const cancelDelete = useCallback(() => setPendingDeleteId(null), []);

  const handlers = useMemo(
    () => ({
      startEditNotes,
      setNotesValue,
      commitNotes,
      cancelEditNotes,
      askDelete: setPendingDeleteId,
    }),
    [startEditNotes, setNotesValue, commitNotes, cancelEditNotes]
  );

  return {
    groups: pageGroups,
    paging,
    isCollapsed: collapsed.has,
    toggleDay: collapsed.toggle,
    editingNotesId,
    notesValue,
    handlers,
    pendingDeleteId,
    confirmDelete,
    cancelDelete,
    error: action.error,
  };
}
