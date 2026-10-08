import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { errorMessage } from '@shared/utils/errors';
import { validatePassword } from '../domain/passwordValidation';
import { AuthPasswordInput } from './AuthPasswordInput';
import { PasswordHints } from './PasswordHints';

/** New password from the link sent by e-mail (`?token=`). */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validation = validatePassword(password);
  const mismatch = confirm.length > 0 && password !== confirm;
  const goLogin = () => navigate('/login', { replace: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || password !== confirm) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="auth-page-with-header">
        {done ? (
          <div className="auth-card">
            <div className="auth-logo">✅</div>
            <h1 className="auth-title">{t('app.auth.reset.success.title')}</h1>
            <p className="auth-sub auth-sub--center">{t('app.auth.reset.success.sub')}</p>
            <button className="auth-btn" onClick={goLogin}>
              {t('app.auth.reset.goLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-card">
            <div className="auth-logo">🔐</div>
            <h1 className="auth-title">{t('app.auth.reset.title')}</h1>
            <p className="auth-note">{t('app.auth.reset.sub')}</p>
            <AuthPasswordInput
              value={password}
              onChange={setPassword}
              placeholder={t('app.auth.reset.password')}
              autoFocus
            />
            <PasswordHints password={password} okText={t('app.auth.reset.passwordOk')} />
            <AuthPasswordInput
              value={confirm}
              onChange={setConfirm}
              placeholder={t('app.auth.reset.confirm')}
              invalid={mismatch}
            />
            {mismatch && <p className="auth-error">{t('app.auth.reset.mismatch')}</p>}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="auth-btn"
              disabled={loading || mismatch || !validation.valid || !confirm}
            >
              {loading ? t('app.auth.reset.loading') : t('app.auth.reset.submit')}
            </button>
            <p className="auth-switch">
              <button type="button" className="auth-link" onClick={goLogin}>
                {t('app.auth.reset.goLogin')}
              </button>
            </p>
          </form>
        )}
      </div>
    </>
  );
}
