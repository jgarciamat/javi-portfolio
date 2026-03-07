import { useI18n } from '@core/i18n/I18nContext';
import type { useNameSection } from '../application/useProfileSections';

type NameSectionProps = ReturnType<typeof useNameSection>;

export function NameSection({ user, name, setName, nameLoading, nameMsg, handleNameSubmit }: NameSectionProps) {
    const { t } = useI18n();

    return (
        <form className="profile-section" onSubmit={handleNameSubmit}>
            <label className="profile-label">{t('app.profile.name.label')}</label>
            <input
                className="auth-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
            />
            {nameMsg && (
                <p className={nameMsg.ok ? 'profile-msg-ok' : 'auth-error'}>{nameMsg.text}</p>
            )}
            <button type="submit" className="btn-primary" disabled={nameLoading || name === user?.name}>
                {nameLoading ? t('app.profile.name.saving') : t('app.profile.name.save')}
            </button>
        </form>
    );
}
