import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useLoginForm } from '../application/useLoginForm';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleButton } from './GoogleButton';

interface Props {
  onSwitch: () => void;
  onForgot: () => void;
  onSuccess?: () => void;
}

export function LoginPage({ onSwitch, onForgot, onSuccess }: Props) {
  const { t } = useI18n();
  const form = useLoginForm(onSuccess);

  return (
    <form onSubmit={form.handleSubmit} className="auth-card">
      <h1 className="auth-title">{t('app.auth.login.title')}</h1>
      <p className="auth-sub">
        {t('app.auth.login.switch')}{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t('app.auth.login.switchLink')}
        </button>
      </p>

      <GoogleButton
        label={t('app.auth.login.google')}
        onToken={form.handleGoogleToken}
        onError={form.reportGoogleError}
      />

      <div className="auth-divider">
        <span>{t('app.auth.login.orDivider')}</span>
      </div>

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="login-email">
          {t('app.auth.login.emailLabel')}
        </label>
        <input
          id="login-email"
          className="auth-input"
          type="email"
          placeholder={t('app.auth.login.email')}
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div className="auth-field">
        <div className="auth-field-header">
          <span className="auth-field-label">{t('app.auth.login.passwordLabel')}</span>
          <button type="button" className="auth-link auth-forgot-link" onClick={onForgot}>
            {t('app.auth.forgot.link')}
          </button>
        </div>
        <AuthPasswordInput
          value={form.password}
          onChange={form.setPassword}
          placeholder={t('app.auth.login.password')}
          autoComplete="current-password"
        />
      </div>

      <label className="auth-remember">
        <input
          type="checkbox"
          checked={form.remember}
          onChange={(e) => form.setRemember(e.target.checked)}
        />
        <span>{t('app.auth.login.remember')}</span>
      </label>

      {form.error && (
        <p className="auth-error" role="alert">
          {form.error}
        </p>
      )}
      {form.needsVerification &&
        (form.verificationSent ? (
          <p className="auth-sub">{t('app.auth.verify.resentSub')}</p>
        ) : (
          <button type="button" className="auth-link auth-resend" onClick={form.resendVerification}>
            {t('app.auth.verify.resend')}
          </button>
        ))}

      <button type="submit" className="auth-btn" disabled={form.loading}>
        {form.loading ? t('app.auth.login.loading') : t('app.auth.login.submit')}
      </button>

      <p className="auth-footer-links">
        <Link to="/pricing">{t('pricing.link')}</Link>
        {' · '}
        <Link to="/privacy">{t('app.privacy.link')}</Link>
      </p>
    </form>
  );
}
