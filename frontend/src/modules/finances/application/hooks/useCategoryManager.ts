import { useState } from 'react';
import { ApiError } from '@core/api/http';
import { useAction } from '@shared/hooks/useAction';
import { errorMessage } from '@shared/utils/errors';
import type { Category, CategoryUsage, CreateCategoryDTO } from '@modules/finances/domain/types';
import {
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
} from '@modules/finances/domain/categoryPresets';

interface Options {
  onAdd: (dto: CreateCategoryDTO) => Promise<unknown>;
  onUpdate: (id: string, dto: Partial<CreateCategoryDTO>) => Promise<unknown>;
  /** Rejects with ApiError CATEGORY_IN_USE when the category has data and no `reassignTo`. */
  onDelete: (id: string, reassignTo?: string) => Promise<void>;
}

/** A category in use: its data must move to another one before deleting it. */
export interface PendingDelete {
  category: Category;
  usage: CategoryUsage | null;
}

/** State of the category manager: new category form, rename and delete with reassignment. */
export function useCategoryManager({ onAdd, onUpdate, onDelete }: Options) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const action = useAction();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await action.run(() => onAdd({ name: name.trim(), icon, color }));
    if (created) {
      setName('');
      setIcon(DEFAULT_CATEGORY_ICON);
      setColor(DEFAULT_CATEGORY_COLOR);
    }
  };

  const handleDelete = async (category: Category, target?: string) => {
    setDeletingId(category.id);
    action.setError(null);
    try {
      await onDelete(category.id, target);
      setPendingDelete(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CATEGORY_IN_USE') {
        // Ask where its movements, rules, budgets… should go instead of failing.
        setPendingDelete({ category, usage: (err.details?.usage as CategoryUsage) ?? null });
        setReassignTo('');
      } else {
        action.setError(errorMessage(err, 'Error'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
    action.setError(null);
  };

  const saveEdit = async () => {
    const id = editingId;
    if (!id || !editName.trim()) return;
    if (await action.run(() => onUpdate(id, { name: editName.trim() }))) setEditingId(null);
  };

  return {
    fields: { name, icon, color, search },
    setName,
    setColor,
    setSearch,
    showEmojiPicker,
    toggleEmojiPicker: () => setShowEmojiPicker((v) => !v),
    selectEmoji: (emoji: string) => {
      setIcon(emoji);
      setShowEmojiPicker(false);
      setSearch('');
    },
    saving: action.pending,
    error: action.error,
    canCreate: name.trim().length > 0,
    handleCreate,
    deletingId,
    handleDelete,
    pendingDelete,
    reassignTo,
    setReassignTo,
    cancelDelete: () => setPendingDelete(null),
    /** Deletes the pending category moving its data to `reassignTo`. */
    confirmReassign: (pending: PendingDelete) => handleDelete(pending.category, reassignTo),
    editingId,
    editName,
    setEditName,
    startEdit,
    cancelEdit: () => setEditingId(null),
    saveEdit,
  };
}
