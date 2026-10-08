import { useMemo, useRef, useState } from 'react';
import { useAction } from '@shared/hooks/useAction';
import { useToggleSet } from '@shared/hooks/useToggleSet';
import { groupByDay } from '@modules/finances/domain/transactionGrouping';
import type { Transaction } from '@modules/finances/domain/types';

interface Options {
  transactions: Transaction[];
  locale: string;
  onPatch: (id: string, changes: { notes: string | null }) => Promise<unknown> | void;
  onDelete: (id: string) => Promise<unknown> | void;
}

/** Day groups, collapsed days, inline notes editing and delete confirmation. */
export function useTransactionTable({ transactions, locale, onPatch, onDelete }: Options) {
  const groups = useMemo(() => groupByDay(transactions, locale), [transactions, locale]);
  const collapsed = useToggleSet();
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const action = useAction();
  // Blur fires after Enter / Escape already closed the editor: only the open editor may save.
  const editing = useRef<{ id: string; original: string | null } | null>(null);

  const startEditNotes = (tx: Transaction) => {
    editing.current = { id: tx.id, original: tx.notes };
    setEditingNotesId(tx.id);
    setNotesValue(tx.notes ?? '');
  };

  const cancelEditNotes = () => {
    editing.current = null;
    setEditingNotesId(null);
  };

  const commitNotes = () => {
    const current = editing.current;
    if (!current) return;
    cancelEditNotes();
    const notes = notesValue.trim() || null;
    if (notes !== current.original) void action.run(async () => onPatch(current.id, { notes }));
  };

  const confirmDelete = () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id) void action.run(async () => onDelete(id));
  };

  return {
    groups,
    isCollapsed: collapsed.has,
    toggleDay: collapsed.toggle,
    editingNotesId,
    notesValue,
    setNotesValue,
    startEditNotes,
    commitNotes,
    cancelEditNotes,
    pendingDeleteId,
    askDelete: setPendingDeleteId,
    confirmDelete,
    cancelDelete: () => setPendingDeleteId(null),
    error: action.error,
  };
}
