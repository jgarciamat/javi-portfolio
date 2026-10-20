import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { useAuth } from '@shared/hooks/useAuth';
import { usePasswordSection } from '../application/useProfileSections';
import { AuthPasswordInput } from './AuthPasswordInput';
import { PasswordHints } from './PasswordHints';
import { StatusMessage } from './StatusMessage';

export function PasswordSection() {
  const { t } = useI18n();
  const s = usePasswordSection();
  return (
    <form className="profile-section profile-password-form" onSubmit={s.handlePasswordSubmit}>
      {/* Google-only accounts have no current password: they set one directly. */}
      {s.hasPassword ? (
        <>
          <AuthPasswordInput
            value={s.currentPassword}
            onChange={s.setCurrentPassword}
            placeholder={t('app.profile.password.current')}
            autoComplete="current-password"
            invalid={s.wrongCurrent}
            describedBy={s.wrongCurrent ? 'profile-current-password-error' : undefined}
          />
          {s.wrongCurrent && (
            <p id="profile-current-password-error" className="auth-hint-error" role="alert">
              {t('app.profile.password.wrongCurrent')}
            </p>
          )}
        </>
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
      <button type="submit" className="profile-btn-primary" disabled={s.loading}>
        {s.loading ? t('app.profile.password.saving') : t('app.profile.password.save')}
      </button>
    </form>
  );
}

/** The password row of the account card; the form folds out under it. */
export function PasswordRow() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const hasPassword = user?.hasPassword !== false;
  return (
    <div className="profile-row profile-row--fold">
      <div className="profile-row-main">
        <span className="profile-row-icon" aria-hidden="true">
          <Icon name="lock" />
        </span>
        <div className="profile-row-text">
          <span className="profile-row-label">{t('app.profile.password.label')}</span>
          <span className="profile-row-value">
            {hasPassword ? '••••••••' : t('app.profile.password.none')}
          </span>
        </div>
        <button
          type="button"
          className={`profile-btn-ghost profile-fold-btn${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-controls="profile-password-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {hasPassword ? t('app.profile.password.change') : t('app.profile.password.create')}
          <span className="profile-fold-chevron" aria-hidden="true" />
        </button>
      </div>
      <div id="profile-password-panel" className="profile-row-panel" hidden={!open}>
        {/* Folded, the form is not mounted: it starts clean when opened again. */}
        {open && <PasswordSection />}
      </div>
    </div>
  );
}
