import { useI18n } from '@core/i18n/I18nContext';
import type { useAvatarSection } from '../application/useProfileSections';

const PRESET_AVATARS = [
    '🧑', '👩', '👨', '🧔', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲',
    '🧑‍💼', '👩‍💼', '🧑‍🎨', '👩‍🎨', '🧑‍🚀', '🦊', '🐼', '🐨',
    '🦁', '🐯', '🐸', '🦄', '🐙', '🤖', '👾', '🎃',
];

type AvatarSectionProps = ReturnType<typeof useAvatarSection>;

export function AvatarSection({ user, fileInputRef, avatarPreview, avatarLoading, avatarMsg, handlePresetSelect, handleFileChange, handleAvatarSave }: AvatarSectionProps) {
    const { t } = useI18n();

    return (
        <div className="profile-section">
            <label className="profile-label">{t('app.profile.avatar.label')}</label>
            <div className="profile-avatar-row">
                <div className="profile-avatar-preview">
                    {avatarPreview
                        ? <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" />
                        : <span className="profile-avatar-placeholder">👤</span>
                    }
                </div>
                <div className="profile-avatar-actions">
                    <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        📁 {t('app.profile.avatar.upload')}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    {avatarPreview && avatarPreview !== user?.avatarUrl && (
                        <button type="button" className="btn-primary" onClick={handleAvatarSave} disabled={avatarLoading}>
                            {avatarLoading ? t('app.profile.avatar.saving') : t('app.profile.avatar.save')}
                        </button>
                    )}
                </div>
            </div>
            <div className="avatar-presets">
                {PRESET_AVATARS.map((emoji) => {
                    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" x="8" font-size="48">${emoji}</text></svg>`;
                    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                    return (
                        <button
                            key={emoji}
                            type="button"
                            className={`avatar-preset-btn${avatarPreview === dataUrl ? ' selected' : ''}`}
                            onClick={() => handlePresetSelect(emoji)}
                            title={emoji}
                            aria-label={`Usar avatar ${emoji}`}
                        >
                            {emoji}
                        </button>
                    );
                })}
            </div>
            <p className="avatar-presets-hint">{t('app.profile.avatar.hint')}</p>
            {avatarMsg && <p className={avatarMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{avatarMsg.text}</p>}
        </div>
    );
}
