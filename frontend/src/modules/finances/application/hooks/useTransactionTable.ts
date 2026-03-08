import { useState } from 'react';
import { groupByDay } from '../../ui/types/TransactionTable.types';
import type { DayGroup } from '../../ui/types/TransactionTable.types';
import type { TransactionType } from '@modules/finances/domain/types';

interface UseTransactionTableOptions {
    transactions: Parameters<typeof groupByDay>[0];
    locale: string;
    t: (key: string) => string;
    onPatch: (id: string, changes: { notes?: string | null }) => void;
    onDelete: (id: string) => void;
}

export interface UseTransactionTableReturn {
    groups: DayGroup[];
    editingNotesId: string | null;
    notesValue: string;
    pendingDeleteId: string | null;
    txLabel: (type: TransactionType) => string;
    startEditNotes: (id: string, current: string | null) => void;
    commitNotes: (id: string) => void;
    cancelEditNotes: () => void;
    setNotesValue: (value: string) => void;
    setPendingDeleteId: (id: string | null) => void;
    confirmDelete: () => void;
    cancelDelete: () => void;
}

export function useTransactionTable({
    transactions,
    locale,
    t,
    onPatch,
    onDelete,
}: UseTransactionTableOptions): UseTransactionTableReturn {
    const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const groups = groupByDay(transactions, locale);

    const txLabel = (type: TransactionType): string => {
        if (type === 'INCOME') return t('app.transaction.form.type.income');
        if (type === 'SAVING') return t('app.transaction.form.type.saving');
        return t('app.transaction.form.type.expense');
    };

    const startEditNotes = (id: string, current: string | null) => {
        setEditingNotesId(id);
        setNotesValue(current ?? '');
    };

    const commitNotes = (id: string) => {
        onPatch(id, { notes: notesValue.trim() || null });
        setEditingNotesId(null);
    };

    const cancelEditNotes = () => setEditingNotesId(null);

    const confirmDelete = () => {
        if (pendingDeleteId !== null) {
            onDelete(pendingDeleteId);
            setPendingDeleteId(null);
        }
    };

    const cancelDelete = () => setPendingDeleteId(null);

    return {
        groups,
        editingNotesId,
        notesValue,
        pendingDeleteId,
        txLabel,
        startEditNotes,
        commitNotes,
        cancelEditNotes,
        setNotesValue,
        setPendingDeleteId,
        confirmDelete,
        cancelDelete,
    };
}
