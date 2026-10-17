import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useLoginForm } from '../application/useLoginForm';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleSignIn } from './GoogleButton';
import { isNativeApp } from '@shared/utils/platform';
import { SocialLinks } from '@shared/components/SocialLinks';

interface Props {
  onSwitch: () => void;
  onForgot: () => void;
  onSuccess?: () => void;
}

export function LoginPage({ onSwitch, onForgot, onSuccess }: Props) {
  const { t } = useI18n();
  const form = useLoginForm(onSuccess);
  const emailRef = useRef<HTMLInputElement>(null);
  const invalid = form.error !== null;

  // After a failed sign-in the first field takes focus; it is described by the error.
  useEffect(() => {
    if (form.error) emailRef.current!.focus();
  }, [form.error]);

  return (
    <form onSubmit={form.handleSubmit} className="auth-card">
      <h1 className="auth-title">{t('app.auth.login.title')}</h1>
      <p className="auth-sub">
        {t('app.auth.login.switch')}{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t('app.auth.login.switchLink')}
        </button>
      </p>

      <GoogleSignIn
        label={t('app.auth.login.google')}
        onToken={form.handleGoogleToken}
        onError={form.reportGoogleError}
      />

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="login-email">
          {t('app.auth.login.emailLabel')}
        </label>
        <input
          ref={emailRef}
          id="login-email"
          className="auth-input"
          type="email"
          placeholder={t('app.auth.login.email')}
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'login-error' : undefined}
        />
      </div>

      <div className="auth-field">
        <div className="auth-field-header">
          <label className="auth-field-label" htmlFor="login-password">
            {t('app.auth.login.passwordLabel')}
          </label>
          <button type="button" className="auth-link auth-forgot-link" onClick={onForgot}>
            {t('app.auth.forgot.link')}
          </button>
        </div>
        <AuthPasswordInput
          id="login-password"
          invalid={invalid}
          describedBy={invalid ? 'login-error' : undefined}
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
        <p id="login-error" className="auth-error" role="alert">
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

      {/* aria-disabled, not disabled: the button keeps focus while the request runs. */}
      <button type="submit" className="auth-btn" aria-disabled={form.loading}>
        {form.loading ? t('app.auth.login.loading') : t('app.auth.login.submit')}
      </button>

      <p className="auth-footer-links">
        {/* The store apps do not advertise web prices (Google Play payments policy). */}
        {!isNativeApp() && (
          <>
            <Link to="/pricing">{t('pricing.link')}</Link>
            {' · '}
            <Link to="/calculadora-50-30-20">{t('tools.rule.nav')}</Link>
            {' · '}
            <Link to="/simulador-ahorro">{t('tools.savings.nav')}</Link>
            {' · '}
          </>
        )}
        <Link to="/privacy">{t('app.privacy.link')}</Link>
      </p>
      <SocialLinks />
    </form>
  );
}
