export interface EmojiGroup {
  label: string;
  emojis: string[];
}

/** Icons offered when creating a category. */
export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: 'Dinero',
    emojis: ['💰', '💵', '💴', '💶', '💷', '💸', '🏦', '💳', '🪙', '📈', '📉', '🏧'],
  },
  {
    label: 'Casa',
    emojis: ['🏠', '🏡', '🏢', '🏗️', '🔑', '🛋️', '🛏️', '🚿', '🧹', '💡', '🔌', '🪴'],
  },
  {
    label: 'Comida',
    emojis: ['🍔', '🍕', '🍣', '🥗', '🥘', '🍳', '🥩', '🍺', '☕', '🛒', '🧃', '🍎'],
  },
  {
    label: 'Transporte',
    emojis: ['🚗', '🚌', '✈️', '🚂', '🚢', '🛵', '🚲', '⛽', '🛞', '🅿️', '🗺️', '🧳'],
  },
  {
    label: 'Salud',
    emojis: ['💊', '🏥', '🩺', '💉', '🧬', '🏋️', '🧘', '🛁', '🪥', '😷', '🧠', '❤️'],
  },
  {
    label: 'Ocio',
    emojis: ['🎉', '🎮', '🎬', '🎵', '🎨', '📚', '⚽', '🎯', '🎲', '🎭', '🏖️', '🌴'],
  },
  {
    label: 'Trabajo',
    emojis: ['💼', '🖥️', '⌨️', '🖨️', '📋', '📊', '📞', '✏️', '📌', '🗂️', '🏆', '🤝'],
  },
  {
    label: 'Familia',
    emojis: ['👨‍👩‍👧', '🧒', '👶', '🐣', '🎒', '🧸', '🍼', '🎓', '👴', '👵', '🐶', '🐱'],
  },
  {
    label: 'Ahorro',
    emojis: ['🐷', '🪣', '💎', '🥇', '⭐', '🌟', '🔒', '🎁', '🌱', '🌿', '🏺', '🪺'],
  },
  {
    label: 'Varios',
    emojis: ['📦', '🛍️', '👕', '👟', '💄', '💈', '🪑', '🔧', '⚙️', '🧩', '📱', '🖼️'],
  },
];

export const CATEGORY_COLORS = [
  '#6366f1',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#a78bfa',
  '#10b981',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#8b5cf6',
  '#eab308',
  '#f43f5e',
  '#94a3b8',
];

export const DEFAULT_CATEGORY_ICON = '💰';
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0];
