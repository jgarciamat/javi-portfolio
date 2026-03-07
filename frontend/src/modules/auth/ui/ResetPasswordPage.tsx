import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';
import { validatePassword } from '../domain/passwordValidation';
import { PublicHeader } from '@shared/components/PublicHeader';
import { AuthPasswordInput } from './AuthPasswordInput';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface SuccessViewProps { onGoLogin: () => void; t: (key: string) => string; }

function SuccessView({ onGoLogin, t }: SuccessViewProps) {
    return (
        <>
            <PublicHeader />
            <div className="auth-page-with-header">
                <div className="auth-card">
                    <div className="auth-logo">✅</div>
                    <h1 className="auth-title">{t('app.auth.reset.success.title')}</h1>
                    <p className="auth-sub" style={{ textAlign: 'center', lineHeight: 1.6 }}>
                        {t('app.auth.reset.success.sub')}
                    </p>
                    <button className="auth-btn" style={{ marginTop: '24px' }} onClick={onGoLogin}>
                        {t('app.auth.reset.goLogin')}
                    </button>
                </div>
            </div>
        </>
    );
}

interface PasswordStrengthHintsProps { password: string; errors: string[]; valid: boolean; okText: string; }

function PasswordStrengthHints({ password, errors, valid, okText }: PasswordStrengthHintsProps) {
    if (password.length === 0) return null;
    if (!valid) {
        return (
            <ul className="auth-password-hints" aria-label="Requisitos de contraseña">
                {errors.map((e) => <li key={e} className="auth-hint-error">✗ {e}</li>)}
            </ul>
        );
    }
    return <p className="auth-hint-ok">{okText}</p>;
}

function useResetPassword(token: string, t: (k: string) => string) {
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
        if (!passwordValidation.valid) { setError(passwordValidation.errors.join(' · ')); return; }
        if (password !== confirm) { setError(t('app.auth.reset.mismatch')); return; }
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

    return {
        password, setPassword, confirm, setConfirm, showPass, setShowPass, showConfirm, setShowConfirm,
        status, error, passwordValidation, mismatch, submitDisabled, handleSubmit
    };
}

export function ResetPasswordPage() {
    const { t } = useI18n();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';
    const { password, setPassword, confirm, setConfirm, showPass, setShowPass, showConfirm, setShowConfirm,
        status, error, passwordValidation, mismatch, submitDisabled, handleSubmit } = useResetPassword(token, t);

    if (status === 'success') {
        return <SuccessView onGoLogin={() => navigate('/auth', { replace: true })} t={t} />;
    }

    return (
        <>
            <PublicHeader />
            <div className="auth-page-with-header">
                <form onSubmit={handleSubmit} className="auth-card">
                    <div className="auth-logo">🔐</div>
                    <h1 className="auth-title">{t('app.auth.reset.title')}</h1>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '-8px 0 12px' }}>
                        {t('app.auth.reset.sub')}
                    </p>

                    <AuthPasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPass}
                        onToggle={() => setShowPass(v => !v)}
                        placeholder={t('app.auth.reset.password')}
                        showLabel={t('app.auth.reset.showPassword')}
                        hideLabel={t('app.auth.reset.hidePassword')}
                        required
                        autoFocus
                    />

                    <PasswordStrengthHints
                        password={password}
                        errors={passwordValidation.errors}
                        valid={passwordValidation.valid}
                        okText={t('app.auth.reset.passwordOk')}
                    />

                    <AuthPasswordInput
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        show={showConfirm}
                        onToggle={() => setShowConfirm(v => !v)}
                        placeholder={t('app.auth.reset.confirm')}
                        showLabel={t('app.auth.reset.showConfirm')}
                        hideLabel={t('app.auth.reset.hideConfirm')}
                        errorClass={mismatch ? 'auth-input--error' : undefined}
                        required
                    />
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
        </>
    );
}
