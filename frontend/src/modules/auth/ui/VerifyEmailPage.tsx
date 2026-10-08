import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { errorCode } from '@core/api/http';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { errorMessage } from '@shared/utils/errors';

type Status = 'loading' | 'success' | 'error' | 'resent';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState('');
  const verified = useRef(false);

  useEffect(() => {
    // StrictMode runs effects twice: a token can only be used once.
    if (verified.current) return;
    verified.current = true;
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(t('app.auth.verify.invalid'));
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        setExpired(errorCode(err) === 'TOKEN_EXPIRED');
        setMessage(errorMessage(err, t('app.auth.verify.invalid')));
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.resendVerification(email, locale);
      setStatus('resent');
    } catch (err) {
      setMessage(errorMessage(err, t('app.auth.error.generic')));
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="auth-page-with-header">
        <div className="auth-card">
          {status === 'loading' && (
            <>
              <div className="auth-logo">⏳</div>
              <h1 className="auth-title">{t('app.auth.verify.loading')}</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="auth-logo">✅</div>
              <h1 className="auth-title">{t('app.auth.verify.success')}</h1>
              <p className="auth-sub" style={{ textAlign: 'center' }}>
                {t('app.auth.verify.successSub')}
              </p>
              <button
                className="auth-btn"
                style={{ marginTop: '24px' }}
                onClick={() => navigate('/login', { replace: true })}
              >
                {t('app.auth.login.submit')}
              </button>
            </>
          )}
          {status === 'resent' && (
            <>
              <div className="auth-logo">📬</div>
              <h1 className="auth-title">{t('app.auth.verify.resent')}</h1>
              <p className="auth-sub" style={{ textAlign: 'center' }}>
                {t('app.auth.verify.resentSub')}
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="auth-logo">❌</div>
              <h1 className="auth-title">{t('app.auth.verify.error')}</h1>
              <p className="auth-sub" style={{ textAlign: 'center', color: '#ef4444' }}>
                {message}
              </p>
              {expired && (
                <form onSubmit={resend}>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder={t('app.auth.login.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <button type="submit" className="auth-btn">
                    {t('app.auth.verify.resend')}
                  </button>
                </form>
              )}
              <button
                className="auth-btn"
                style={{ marginTop: '24px' }}
                onClick={() => navigate('/login', { replace: true })}
              >
                {t('app.auth.verify.back')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
