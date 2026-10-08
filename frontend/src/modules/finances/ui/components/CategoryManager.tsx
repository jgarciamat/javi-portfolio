import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import type { Category, CreateCategoryDTO } from '@modules/finances/domain/types';
import { CATEGORY_COLORS, EMOJI_GROUPS } from '@modules/finances/domain/categoryPresets';
import { useCategoryManager, type PendingDelete } from '../../application/hooks/useCategoryManager';
import '../css/CategoryManager.css';

export interface CategoryManagerProps {
  onClose: () => void;
  categories: Category[];
  onAdd: (dto: CreateCategoryDTO) => Promise<unknown>;
  onUpdate: (id: string, dto: Partial<CreateCategoryDTO>) => Promise<unknown>;
  onDelete: (id: string, reassignTo?: string) => Promise<void>;
}

type ManagerState = ReturnType<typeof useCategoryManager>;

function EmojiPicker({ cm }: { cm: ManagerState }) {
  const { t } = useI18n();
  const query = cm.fields.search.trim();
  const groups = query
    ? [
        {
          label: t('app.category.manager.emoji.results'),
          emojis: EMOJI_GROUPS.flatMap((g) => g.emojis).filter((e) => e.includes(query)),
        },
      ]
    : EMOJI_GROUPS;
  return (
    <div className="cat-emoji-panel">
      <input
        className="cat-emoji-search"
        placeholder={t('app.category.manager.emoji.search')}
        aria-label={t('app.category.manager.emoji.search')}
        value={cm.fields.search}
        onChange={(e) => cm.setSearch(e.target.value)}
        autoFocus
      />
      <div className="cat-emoji-scroll">
        {groups
          .filter((g) => g.emojis.length > 0)
          .map((group) => (
            <div key={group.label}>
              <div className="cat-emoji-group-label">{group.label}</div>
              <div className="cat-emoji-grid">
                {group.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`cat-emoji-item${cm.fields.icon === e ? ' selected' : ''}`}
                    onClick={() => cm.selectEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function CreateCard({ cm }: { cm: ManagerState }) {
  const { t } = useI18n();
  return (
    <form
      className="cat-create-card"
      onSubmit={(e) => {
        e.preventDefault();
        void cm.handleCreate();
      }}
    >
      <h3 className="cat-section-title">➕ {t('app.category.manager.new')}</h3>
      <div className="cat-form">
        <div className="cat-emoji-row">
          <button
            type="button"
            className="cat-emoji-btn"
            onClick={cm.toggleEmojiPicker}
            aria-label={t('app.category.manager.emoji.choose')}
            aria-expanded={cm.showEmojiPicker}
          >
            {cm.fields.icon}
          </button>
          <input
            className="cat-input"
            placeholder={t('app.category.manager.name.placeholder')}
            aria-label={t('app.category.manager.name.placeholder')}
            value={cm.fields.name}
            onChange={(e) => cm.setName(e.target.value)}
            maxLength={30}
          />
        </div>
        <div
          className="cat-color-row"
          role="radiogroup"
          aria-label={t('app.category.manager.color')}
        >
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cm.fields.color === c}
              className={`cat-color-dot${cm.fields.color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => cm.setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
        {cm.showEmojiPicker && <EmojiPicker cm={cm} />}
      </div>
    </form>
  );
}

function ReassignPanel({
  categories,
  pending,
  busy,
  cm,
}: {
  categories: Category[];
  pending: PendingDelete;
  busy: boolean;
  cm: ManagerState;
}) {
  const { t, tCategory } = useI18n();
  return (
    <div className="cat-create-card" role="alert">
      <h3 className="cat-section-title">⚠️ {t('app.category.manager.inUse.title')}</h3>
      <p className="cat-empty">
        {t('app.category.manager.inUse.body', {
          name: tCategory(pending.category.name),
          count: pending.usage?.transactions ?? 0,
        })}
      </p>
      <select
        className="cat-input"
        value={cm.reassignTo}
        onChange={(e) => cm.setReassignTo(e.target.value)}
        aria-label={t('app.category.manager.inUse.target')}
      >
        <option value="">{t('app.category.manager.inUse.target')}</option>
        {categories
          .filter((c) => c.id !== pending.category.id)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {tCategory(c.name)}
            </option>
          ))}
      </select>
      <div className="cat-modal-footer">
        <button className="btn-secondary" onClick={cm.cancelDelete}>
          {t('app.common.cancel')}
        </button>
        <button
          className="btn-primary"
          disabled={!cm.reassignTo || busy}
          onClick={() => cm.confirmReassign(pending)}
        >
          {t('app.category.manager.inUse.confirm')}
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ category, cm }: { category: Category; cm: ManagerState }) {
  const { t, tCategory } = useI18n();
  const label = tCategory(category.name);
  const editing = cm.editingId === category.id;
  const deleting = cm.deletingId === category.id;
  return (
    <div className="cat-item">
      <span
        className="cat-item-icon"
        style={{ background: `${category.color}22`, borderColor: category.color }}
      >
        {category.icon}
      </span>
      {editing ? (
        <input
          className="cat-input cat-item-edit"
          value={cm.editName}
          onChange={(e) => cm.setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void cm.saveEdit();
            if (e.key === 'Escape') {
              e.stopPropagation();
              cm.cancelEdit();
            }
          }}
          maxLength={50}
          autoFocus
          aria-label={t('app.category.manager.rename')}
        />
      ) : (
        <span className="cat-item-name">{label}</span>
      )}
      <button
        className="cat-del-btn"
        onClick={editing ? cm.saveEdit : () => cm.startEdit(category.id, category.name)}
        aria-label={editing ? t('app.common.save') : `${t('app.category.manager.rename')} ${label}`}
      >
        {editing ? '✅' : '✏️'}
      </button>
      <button
        className="cat-del-btn"
        onClick={() => cm.handleDelete(category)}
        disabled={deleting}
        aria-label={`${t('app.category.manager.delete.title')} ${label}`}
      >
        {deleting ? '⏳' : '🗑️'}
      </button>
    </div>
  );
}

/** Create, rename and delete categories (with reassignment when they are in use). */
export function CategoryManager({
  onClose,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const { t } = useI18n();
  const cm = useCategoryManager({ onAdd, onUpdate, onDelete });

  return (
    <Modal
      label={t('app.category.manager.title')}
      onClose={onClose}
      dismissible={cm.editingId === null}
      overlayClassName="cat-modal-overlay"
      className="cat-modal"
    >
      <div className="cat-modal-header">
        <span className="cat-modal-title">🗂️ {t('app.category.manager.title')}</span>
        <button
          className="cat-modal-close"
          onClick={onClose}
          aria-label={t('app.category.manager.close')}
        >
          ✕
        </button>
      </div>

      <div className="cat-modal-body">
        <div className="cat-manager">
          <CreateCard cm={cm} />
          {cm.error && <p className="cat-error">{cm.error}</p>}
          {cm.pendingDelete && (
            <ReassignPanel
              categories={categories}
              pending={cm.pendingDelete}
              busy={cm.deletingId === cm.pendingDelete.category.id}
              cm={cm}
            />
          )}
          <div className="cat-list-section">
            <h3 className="cat-section-title">
              {t('app.category.manager.list.title')} ({categories.length})
            </h3>
            {categories.length === 0 ? (
              <p className="cat-empty">{t('app.category.manager.list.empty')}</p>
            ) : (
              <div className="cat-list">
                {categories.map((cat) => (
                  <CategoryRow key={cat.id} category={cat} cm={cm} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="cat-modal-footer">
        <button className="btn-secondary" onClick={onClose}>
          {t('app.category.manager.close')}
        </button>
        <button
          className="btn-primary"
          disabled={!cm.canCreate || cm.saving}
          onClick={cm.handleCreate}
        >
          {cm.saving ? t('app.category.manager.creating') : t('app.category.manager.create')}
        </button>
      </div>
    </Modal>
  );
}
