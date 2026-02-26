import { useState, useEffect } from 'react';
import type { CreateCategoryDTO } from '@modules/finances/domain/types';

interface UseCategoryManagerOptions {
    open: boolean;
    onClose: () => void;
    onAdd: (dto: CreateCategoryDTO) => Promise<unknown>;
    onDelete: (id: string) => Promise<void>;
}

export function useCategoryManager({ open, onClose, onAdd, onDelete }: UseCategoryManagerOptions) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('💰');
    const [color, setColor] = useState('#6366f1');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setName('');
            setIcon('💰');
            setColor('#6366f1');
            setShowEmojiPicker(false);
            setSearch('');
            setError(null);
        }
    }, [open]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('El nombre es obligatorio'); return; }
        setSaving(true);
        setError(null);
        try {
            await onAdd({ name: name.trim(), icon, color });
            setName('');
            setIcon('💰');
            setColor('#6366f1');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try { await onDelete(id); }
        catch { /* silent */ }
        finally { setDeletingId(null); }
    };

    const selectEmoji = (emoji: string) => {
        setIcon(emoji);
        setShowEmojiPicker(false);
        setSearch('');
    };

    const canCreate = name.trim().length > 0;

    return {
        fields: { name, icon, color, search },
        setName,
        setIcon,
        setColor,
        setSearch,
        showEmojiPicker,
        setShowEmojiPicker,
        selectEmoji,
        saving,
        error,
        deletingId,
        canCreate,
        handleCreate,
        handleDelete,
    };
}
