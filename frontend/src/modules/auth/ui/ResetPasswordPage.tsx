import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';
import { validatePassword } from '../domain/passwordValidation';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function ResetPasswordPage() {
    const { t } = useI18n();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);

    const passwordValidation = validatePassword(password);
    const mismatch = confirm.length > 0 && password !== confirm;
    const submitDisabled = status === 'loading' || mismatch || (password.length > 0 && !passwordValidation.valid);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!passwordValidation.valid) {
            setError(passwordValidation.errors.join(' · '));
            return;
        }
        if (password !== confirm) {
            setError(t('app.auth.reset.mismatch'));
            return;
        }
        setStatus('loading');
        setError(null);
        try {
            await authApi.resetPassword(token, password);
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
            setStatus('error');
        }
    }

    if (status === 'success') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">✅</div>
                    <h1 className="auth-title">{t('app.auth.reset.success.title')}</h1>
                    <p className="auth-sub" style={{ textAlign: 'center', lineHeight: 1.6 }}>
                        {t('app.auth.reset.success.sub')}
                    </p>
                    <button className="auth-btn" style={{ marginTop: '24px' }} onClick={() => navigate('/auth', { replace: true })}>
                        {t('app.auth.reset.goLogin')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <div className="auth-logo">🔐</div>
                <h1 className="auth-title">Money Manager</h1>
                <p className="auth-sub">{t('app.auth.reset.title')}</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '-8px 0 12px' }}>
                    {t('app.auth.reset.sub')}
                </p>

                <div className="auth-pass-wrap">
                    <input
                        className="auth-input auth-pass-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder={t('app.auth.reset.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                    <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? t('app.auth.reset.hidePassword') : t('app.auth.reset.showPassword')}
                    >
                        {showPass ? '🙈' : '👁️'}
                    </button>
                </div>

                {/* Password strength hints */}
                {password.length > 0 && !passwordValidation.valid && (
                    <ul className="auth-password-hints" aria-label="Requisitos de contraseña">
                        {passwordValidation.errors.map((e) => (
                            <li key={e} className="auth-hint-error">✗ {e}</li>
                        ))}
                    </ul>
                )}
                {password.length > 0 && passwordValidation.valid && (
                    <p className="auth-hint-ok">{t('app.auth.reset.passwordOk')}</p>
                )}

                <div className="auth-pass-wrap">
                    <input
                        className={`auth-input auth-pass-input${mismatch ? ' auth-input--error' : ''}`}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder={t('app.auth.reset.confirm')}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShowConfirm(v => !v)}
                        aria-label={showConfirm ? t('app.auth.reset.hideConfirm') : t('app.auth.reset.showConfirm')}
                    >
                        {showConfirm ? '🙈' : '👁️'}
                    </button>
                </div>
                {mismatch && <p className="auth-error">{t('app.auth.reset.mismatch')}</p>}

                {error && status === 'error' && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={submitDisabled}>
                    {status === 'loading' ? t('app.auth.reset.loading') : t('app.auth.reset.submit')}
                </button>

                <p className="auth-switch">
                    <span className="auth-link" onClick={() => navigate('/auth', { replace: true })}>
                        {t('app.auth.reset.goLogin')}
                    </span>
                </p>
            </form>
        </div>
    );
}
