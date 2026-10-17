import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useRegisterForm } from '../application/useRegisterForm';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleSignIn } from './GoogleButton';
import { PasswordHints } from './PasswordHints';
import { Icon } from '@shared/components/Icon';
import { SocialLinks } from '@shared/components/SocialLinks';

interface Props {
  onSwitch: () => void;
}

/** First layer of the privacy notice: `{terms}` and `{privacy}` in the text become links. */
function LegalNotice({ textKey }: { textKey: string }) {
  const { t } = useI18n();
  return (
    <p className="auth-footer-links">
      {t(textKey)
        .split(/(\{terms\}|\{privacy\})/)
        .map((part, i) =>
          part === '{terms}' ? (
            <Link key={i} to="/terms">
              {t('app.auth.register.legal.terms')}
            </Link>
          ) : part === '{privacy}' ? (
            <Link key={i} to="/privacy">
              {t('app.auth.register.legal.privacy')}
            </Link>
          ) : (
            part
          )
        )}
    </p>
  );
}

export function RegisterPage({ onSwitch }: Props) {
  const { t } = useI18n();
  const form = useRegisterForm();
  // Spain sets 14 as the age to consent to data processing (LOPDGDD art. 7).
  const [oldEnough, setOldEnough] = useState(false);
  const mismatch = form.confirmTouched && !form.passwordsMatch;

  if (form.registered) {
    return (
      <div className="auth-card">
        <div className="auth-logo">
          <Icon name="mail" />
        </div>
        <h1 className="auth-title">{t('app.auth.register.verify.title')}</h1>
        <p className="auth-sub auth-sub--center">
          {t('app.auth.register.verify.sub')}
          <br />
          <strong>{form.email}</strong>
        </p>
        <p className="auth-note">{t('app.auth.register.verify.instructions')}</p>
        <button className="auth-btn" onClick={onSwitch}>
          {t('app.auth.register.verify.goLogin')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => (oldEnough ? form.handleSubmit(e) : e.preventDefault())}
      className="auth-card"
    >
      <h1 className="auth-title">{t('app.auth.register.title')}</h1>
      <p className="auth-sub">
        {t('app.auth.register.subtitle')}{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t('app.auth.register.subtitleLink')}
        </button>
      </p>

      <GoogleSignIn
        label={t('app.auth.register.google')}
        onToken={form.handleGoogleToken}
        onError={form.reportGoogleError}
      />
      <LegalNotice textKey="app.auth.register.legal.google" />

      <input
        className="auth-input"
        type="text"
        placeholder={t('app.auth.register.name')}
        aria-label={t('app.auth.register.name')}
        value={form.name}
        onChange={(e) => form.setName(e.target.value)}
        required
        autoFocus
        autoComplete="name"
      />
      <input
        className="auth-input"
        type="email"
        placeholder={t('app.auth.register.email')}
        aria-label={t('app.auth.register.email')}
        value={form.email}
        onChange={(e) => form.setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <AuthPasswordInput
        value={form.password}
        onChange={form.setPassword}
        placeholder={t('app.auth.register.password')}
      />
      <PasswordHints password={form.password} okText={t('app.auth.register.passwordOk')} />
      <AuthPasswordInput
        value={form.confirmPassword}
        onChange={form.setConfirmPassword}
        placeholder={t('app.auth.register.confirmPassword')}
        invalid={mismatch}
      />
      {mismatch && <p className="auth-hint-error">✗ {t('app.auth.register.mismatch')}</p>}

      {form.error && (
        <p className="auth-error" role="alert">
          {form.error}
        </p>
      )}
      <label className="auth-remember">
        <input
          type="checkbox"
          checked={oldEnough}
          onChange={(e) => setOldEnough(e.target.checked)}
          required
        />
        <span>{t('app.auth.register.age')}</span>
      </label>
      <button type="submit" className="auth-btn" disabled={form.loading || !oldEnough}>
        {form.loading ? t('app.auth.register.loading') : t('app.auth.register.submit')}
      </button>
      <LegalNotice textKey="app.auth.register.legal.email" />
      <SocialLinks />
    </form>
  );
}
