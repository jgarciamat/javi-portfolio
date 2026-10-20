import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAuth } from '@shared/hooks/useAuth';
import { useNameSection } from '../application/useProfileSections';
import { StatusMessage } from './StatusMessage';

/** The name row of the account card, edited in place behind the pencil. */
export function NameSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const s = useNameSection(() => setEditing(false));
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Leaving the form puts the focus back on the pencil.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const startEditing = () => {
    s.reset();
    setEditing(true);
  };

  return (
    <div className="profile-row">
      <span className="profile-row-icon" aria-hidden="true">
        <Icon name="user" />
      </span>
      {editing ? (
        <form className="profile-row-form" onSubmit={s.handleNameSubmit}>
          <label className="profile-row-label" htmlFor="profile-name">
            {t('app.profile.name.label')}
          </label>
          <input
            id="profile-name"
            className="auth-input"
            type="text"
            value={s.name}
            onChange={(e) => s.setName(e.target.value)}
            maxLength={80}
            required
            autoComplete="name"
            autoFocus
          />
          <StatusMessage message={s.message} />
          <div className="profile-row-buttons">
            <button type="button" className="profile-btn-ghost" onClick={() => setEditing(false)}>
              {t('app.common.cancel')}
            </button>
            <button
              type="submit"
              className="profile-btn-primary"
              disabled={s.loading || s.unchanged}
            >
              {s.loading ? t('app.profile.name.saving') : t('app.profile.name.save')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="profile-row-text">
            <span className="profile-row-label">{t('app.profile.name.label')}</span>
            <span className="profile-row-value">{user?.name}</span>
            <StatusMessage message={s.message} />
          </div>
          <button
            ref={editButton}
            type="button"
            className="profile-icon-btn"
            onClick={startEditing}
            aria-label={t('app.profile.name.edit')}
          >
            <Icon name="edit" size={16} />
          </button>
        </>
      )}
    </div>
  );
}
