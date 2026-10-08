import { useRef } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { PRESET_AVATARS, emojiAvatar } from '../domain/avatar';
import { useAvatarSection } from '../application/useProfileSections';
import { StatusMessage } from './StatusMessage';

export function AvatarSection() {
  const { t } = useI18n();
  const s = useAvatarSection();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="profile-section">
      <span className="profile-label">{t('app.profile.avatar.label')}</span>
      <div className="profile-avatar-row">
        <div className="profile-avatar-preview">
          {s.preview ? (
            <img src={s.preview} alt="" className="profile-avatar-img" />
          ) : (
            <span className="profile-avatar-placeholder" aria-hidden="true">
              👤
            </span>
          )}
        </div>
        <div className="profile-avatar-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInput.current?.click()}
          >
            📁 {t('app.profile.avatar.upload')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            aria-label={t('app.profile.avatar.upload')}
            onChange={(e) => s.pickFile(e.target.files?.[0])}
          />
          {s.dirty && (
            <button type="button" className="btn-primary" onClick={s.save} disabled={s.loading}>
              {s.loading ? t('app.profile.avatar.saving') : t('app.profile.avatar.save')}
            </button>
          )}
        </div>
      </div>
      <div className="avatar-presets">
        {PRESET_AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`avatar-preset-btn${s.preview === emojiAvatar(emoji) ? ' selected' : ''}`}
            onClick={() => s.pickPreset(emoji)}
            aria-label={t('app.profile.avatar.preset', { emoji })}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="avatar-presets-hint">{t('app.profile.avatar.hint')}</p>
      <StatusMessage message={s.message} />
    </div>
  );
}
