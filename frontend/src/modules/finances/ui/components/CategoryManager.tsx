import type { CategoryManagerProps } from '../types';
import { EMOJI_GROUPS, CATEGORY_COLORS } from '../types';
import { useCategoryManager } from '../../application/hooks/useCategoryManager';

export function CategoryManager({ open, onClose, categories, onAdd, onDelete }: CategoryManagerProps) {
    const {
        fields,
        setName,
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
    } = useCategoryManager({ open, onClose, onAdd, onDelete });

    // Filter all emojis by search
    const filteredGroups = fields.search.trim()
        ? [{ label: 'Resultados', emojis: EMOJI_GROUPS.flatMap(g => g.emojis).filter(e => e.includes(fields.search)) }]
        : EMOJI_GROUPS;

    if (!open) return null;

    return (
        <div className="cat-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cat-modal" role="dialog" aria-modal="true" aria-label="Gestionar categorías">
                {/* Header */}
                <div className="cat-modal-header">
                    <span className="cat-modal-title">🗂️ Gestionar categorías</span>
                    <button className="cat-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
                </div>

                {/* Body */}
                <div className="cat-modal-body">
                    <div className="cat-manager">
                        {/* Create form */}
                        <div className="cat-create-card">
                            <h3 className="cat-section-title">➕ Nueva categoría</h3>
                            <div className="cat-form">
                                {/* Emoji + Name row */}
                                <div className="cat-emoji-row">
                                    <button
                                        type="button"
                                        className="cat-emoji-btn"
                                        onClick={() => setShowEmojiPicker((v) => !v)}
                                        title="Elegir emoji"
                                    >
                                        {fields.icon}
                                    </button>
                                    <input
                                        className="cat-input"
                                        placeholder="Nombre de la categoría"
                                        value={fields.name}
                                        onChange={(e) => setName(e.target.value)}
                                        maxLength={30}
                                    />
                                </div>

                                {/* Color picker */}
                                <div className="cat-color-row">
                                    {CATEGORY_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`cat-color-dot${fields.color === c ? ' selected' : ''}`}
                                            style={{ background: c }}
                                            onClick={() => setColor(c)}
                                            title={c}
                                        />
                                    ))}
                                </div>

                                {/* Emoji picker panel */}
                                {showEmojiPicker && (
                                    <div className="cat-emoji-panel">
                                        <input
                                            className="cat-emoji-search"
                                            placeholder="Buscar emoji..."
                                            value={fields.search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="cat-emoji-scroll">
                                            {filteredGroups.map((group) => (
                                                group.emojis.length > 0 && (
                                                    <div key={group.label}>
                                                        <div className="cat-emoji-group-label">{group.label}</div>
                                                        <div className="cat-emoji-grid">
                                                            {group.emojis.map((e) => (
                                                                <button
                                                                    key={e}
                                                                    type="button"
                                                                    className={`cat-emoji-item${fields.icon === e ? ' selected' : ''}`}
                                                                    onClick={() => selectEmoji(e)}
                                                                >
                                                                    {e}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && <p className="cat-error">{error}</p>}
                            </div>
                        </div>

                        {/* Category list */}
                        <div className="cat-list-section">
                            <h3 className="cat-section-title">Tus categorías ({categories.length})</h3>
                            {categories.length === 0 ? (
                                <p className="cat-empty">Sin categorías aún.</p>
                            ) : (
                                <div className="cat-list">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="cat-item">
                                            <span
                                                className="cat-item-icon"
                                                style={{ background: cat.color + '22', borderColor: cat.color }}
                                            >
                                                {cat.icon}
                                            </span>
                                            <span className="cat-item-name">{cat.name}</span>
                                            <button
                                                className="cat-del-btn"
                                                onClick={() => handleDelete(cat.id)}
                                                disabled={deletingId === cat.id}
                                                title="Eliminar categoría"
                                                aria-label={`Eliminar ${cat.name}`}
                                            >
                                                {deletingId === cat.id ? '⏳' : '🗑️'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="cat-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                    <button
                        className="btn-primary"
                        disabled={!canCreate || saving}
                        onClick={handleCreate}
                    >
                        {saving ? 'Creando...' : '✓ Crear categoría'}
                    </button>
                </div>
            </div>
        </div>
    );
}
