import { useState } from 'react';
import { authApi } from '@core/api/authApi';
import { errorCode } from '@core/api/http';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';

interface Props {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: Props) {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // The API answers the same whether the e-mail exists or not.
      await authApi.requestPasswordReset(email, locale);
      setSent(true);
    } catch (err) {
      setError(
        errorCode(err) === 'RATE_LIMITED'
          ? t('app.auth.error.rateLimited')
          : errorMessage(err, t('app.auth.error.generic'))
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-card">
        <div className="auth-logo">📬</div>
        <h1 className="auth-title">{t('app.auth.forgot.success.title')}</h1>
        <p className="auth-sub auth-sub--center">{t('app.auth.forgot.success.sub')}</p>
        <button className="auth-btn" onClick={onBack}>
          {t('app.auth.forgot.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-card">
      <div className="auth-logo">🔑</div>
      <h1 className="auth-title">Money Manager</h1>
      <p className="auth-sub">{t('app.auth.forgot.title')}</p>
      <p className="auth-note">{t('app.auth.forgot.sub')}</p>

      <input
        className="auth-input"
        type="email"
        placeholder={t('app.auth.forgot.email')}
        aria-label={t('app.auth.forgot.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        inputMode="email"
        autoFocus
      />

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? t('app.auth.forgot.loading') : t('app.auth.forgot.submit')}
      </button>

      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={onBack}>
          {t('app.auth.forgot.backToLogin')}
        </button>
      </p>
    </form>
  );
}
