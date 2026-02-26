import type { Category, CreateCategoryDTO } from '@modules/finances/domain/types';

export interface CategoryManagerProps {
    open: boolean;
    onClose: () => void;
    categories: Category[];
    onAdd: (dto: CreateCategoryDTO) => Promise<unknown>;
    onDelete: (id: string) => Promise<void>;
}

export interface EmojiGroup {
    label: string;
    emojis: string[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
    { label: 'Dinero', emojis: ['💰', '💵', '💴', '💶', '💷', '💸', '🏦', '💳', '🪙', '📈', '📉', '🏧'] },
    { label: 'Casa', emojis: ['🏠', '🏡', '🏢', '🏗️', '🔑', '🛋️', '🛏️', '🚿', '🧹', '💡', '🔌', '🪴'] },
    { label: 'Comida', emojis: ['🍔', '🍕', '🍣', '🥗', '🥘', '🍳', '🥩', '🍺', '☕', '🛒', '🧃', '🍎'] },
    { label: 'Transporte', emojis: ['🚗', '🚌', '✈️', '🚂', '🚢', '🛵', '🚲', '⛽', '🛞', '🅿️', '🗺️', '🧳'] },
    { label: 'Salud', emojis: ['💊', '🏥', '🩺', '💉', '🧬', '🏋️', '🧘', '🛁', '🪥', '😷', '🧠', '❤️'] },
    { label: 'Ocio', emojis: ['🎉', '🎮', '🎬', '🎵', '🎨', '📚', '⚽', '🎯', '🎲', '🎭', '🏖️', '🌴'] },
    { label: 'Trabajo', emojis: ['💼', '🖥️', '⌨️', '🖨️', '📋', '📊', '📞', '✏️', '📌', '🗂️', '🏆', '🤝'] },
    { label: 'Familia', emojis: ['👨‍👩‍👧', '🧒', '👶', '🐣', '🎒', '🧸', '🍼', '🎓', '👴', '👵', '🐶', '🐱'] },
    { label: 'Ahorro', emojis: ['🐷', '🏦', '🪣', '💎', '🥇', '⭐', '🌟', '🔒', '📦', '🎁', '🌱', '🌿'] },
    { label: 'Varios', emojis: ['📦', '🛍️', '👕', '👟', '💄', '💈', '🪑', '🔧', '⚙️', '🧩', '📱', '🖼️'] },
];

export const CATEGORY_COLORS = [
    '#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#3b82f6',
    '#ec4899', '#a78bfa', '#10b981', '#f97316', '#06b6d4',
    '#84cc16', '#8b5cf6', '#eab308', '#f43f5e', '#94a3b8',
] as const;
