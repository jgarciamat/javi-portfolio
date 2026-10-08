import { useI18n } from '@core/i18n/I18nContext';
import { useRegisterForm } from '../application/useRegisterForm';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleButton } from './GoogleButton';
import { PasswordHints } from './PasswordHints';

interface Props {
  onSwitch: () => void;
}

export function RegisterPage({ onSwitch }: Props) {
  const { t } = useI18n();
  const form = useRegisterForm();
  const mismatch = form.confirmTouched && !form.passwordsMatch;

  if (form.registered) {
    return (
      <div className="auth-card">
        <div className="auth-logo">📧</div>
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
    <form onSubmit={form.handleSubmit} className="auth-card">
      <h1 className="auth-title">{t('app.auth.register.title')}</h1>
      <p className="auth-sub">
        {t('app.auth.register.subtitle')}{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t('app.auth.register.subtitleLink')}
        </button>
      </p>

      <GoogleButton
        label={t('app.auth.register.google')}
        onToken={form.handleGoogleToken}
        onError={form.reportGoogleError}
      />

      <div className="auth-divider">
        <span>{t('app.auth.login.orDivider')}</span>
      </div>

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
      <button type="submit" className="auth-btn" disabled={form.loading}>
        {form.loading ? t('app.auth.register.loading') : t('app.auth.register.submit')}
      </button>
    </form>
  );
}
