import { useI18n } from '@core/i18n/I18nContext';
import { usePasswordSection } from '../application/useProfileSections';
import { AuthPasswordInput } from './AuthPasswordInput';
import { PasswordHints } from './PasswordHints';
import { StatusMessage } from './StatusMessage';

export function PasswordSection() {
  const { t } = useI18n();
  const s = usePasswordSection();
  return (
    <form className="profile-section profile-password-form" onSubmit={s.handlePasswordSubmit}>
      <span className="profile-label">{t('app.profile.password.label')}</span>
      {/* Google-only accounts have no current password: they set one directly. */}
      {s.hasPassword ? (
        <AuthPasswordInput
          value={s.currentPassword}
          onChange={s.setCurrentPassword}
          placeholder={t('app.profile.password.current')}
          autoComplete="current-password"
        />
      ) : (
        <p className="profile-hint">{t('app.profile.password.setFirst')}</p>
      )}
      <AuthPasswordInput
        value={s.newPassword}
        onChange={s.setNewPassword}
        placeholder={t('app.profile.password.new')}
      />
      <PasswordHints password={s.newPassword} />
      <AuthPasswordInput
        value={s.confirmNewPassword}
        onChange={s.setConfirmNewPassword}
        placeholder={t('app.profile.password.confirm')}
        invalid={s.mismatch}
      />
      {s.mismatch && <p className="auth-hint-error">{t('app.profile.password.noMatch')}</p>}
      <StatusMessage message={s.message} />
      <button type="submit" className="btn-primary" disabled={s.loading}>
        {s.loading ? t('app.profile.password.saving') : t('app.profile.password.save')}
      </button>
    </form>
  );
}
