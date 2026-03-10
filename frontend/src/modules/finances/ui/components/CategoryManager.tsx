import type { CategoryManagerProps } from '../types';
import '../css/CategoryManager.css';
import { EMOJI_GROUPS, CATEGORY_COLORS } from '../types';
import { useCategoryManager } from '../../application/hooks/useCategoryManager';
import { useI18n } from '@core/i18n/I18nContext';

export function CategoryManager({ open, onClose, categories, onAdd, onDelete }: CategoryManagerProps) {
    const { t, tCategory } = useI18n();
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
            <div className="cat-modal" role="dialog" aria-modal="true" aria-label={t('app.category.manager.title')}>
                {/* Header */}
                <div className="cat-modal-header">
                    <span className="cat-modal-title">🗂️ {t('app.category.manager.title')}</span>
                    <button className="cat-modal-close" onClick={onClose} aria-label={t('app.category.manager.close')}>✕</button>
                </div>

                {/* Body */}
                <div className="cat-modal-body">
                    <div className="cat-manager">
                        {/* Create form */}
                        <div className="cat-create-card">
                            <h3 className="cat-section-title">➕ {t('app.category.manager.new')}</h3>
                            <div className="cat-form">
                                {/* Emoji + Name row */}
                                <div className="cat-emoji-row">
                                    <button
                                        type="button"
                                        className="cat-emoji-btn"
                                        onClick={() => setShowEmojiPicker((v) => !v)}
                                        title={t('app.category.manager.emoji.choose')}
                                        aria-label={t('app.category.manager.emoji.choose')}
                                    >
                                        {fields.icon}
                                    </button>
                                    <input
                                        className="cat-input"
                                        placeholder={t('app.category.manager.name.placeholder')}
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
                                            aria-label={c}
                                        />
                                    ))}
                                </div>

                                {/* Emoji picker panel */}
                                {showEmojiPicker && (
                                    <div className="cat-emoji-panel">
                                        <input
                                            className="cat-emoji-search"
                                            placeholder={t('app.category.manager.emoji.search')}
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
                            <h3 className="cat-section-title">{t('app.category.manager.list.title')} ({categories.length})</h3>
                            {categories.length === 0 ? (
                                <p className="cat-empty">{t('app.category.manager.list.empty')}</p>
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
                                            <span className="cat-item-name">{tCategory(cat.name)}</span>
                                            <button
                                                className="cat-del-btn"
                                                onClick={() => handleDelete(cat.id)}
                                                disabled={deletingId === cat.id}
                                                title={t('app.category.manager.delete.title')}
                                                aria-label={`${t('app.category.manager.delete.title')} ${tCategory(cat.name)}`}
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
                    <button className="btn-secondary" onClick={onClose}>{t('app.category.manager.close')}</button>
                    <button
                        className="btn-primary"
                        disabled={!canCreate || saving}
                        onClick={handleCreate}
                    >
                        {saving ? t('app.category.manager.creating') : t('app.category.manager.create')}
                    </button>
                </div>
            </div>
        </div>
    );
}
