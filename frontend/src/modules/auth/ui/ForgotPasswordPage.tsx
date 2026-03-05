import { useState } from 'react';
import { authApi, ApiError } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';

interface Props { onBack: () => void; }

export function ForgotPasswordPage({ onBack }: Props) {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [alreadySent, setAlreadySent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await authApi.requestPasswordReset(email);
            setSent(true);
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 404 || err.code === 'EMAIL_NOT_FOUND') {
                    setError(t('app.auth.forgot.error.notFound'));
                } else if (err.status === 409 || err.code === 'RESET_EMAIL_ALREADY_SENT') {
                    setAlreadySent(true);
                    setError(t('app.auth.forgot.error.alreadySent'));
                } else {
                    setError(err.message);
                }
            } else if (err instanceof Error) {
                // Fallback: check code/status properties for test mocks
                const coded = err as Error & { code?: string; status?: number };
                if (coded.status === 404 || coded.code === 'EMAIL_NOT_FOUND') {
                    setError(t('app.auth.forgot.error.notFound'));
                } else if (coded.status === 409 || coded.code === 'RESET_EMAIL_ALREADY_SENT') {
                    setAlreadySent(true);
                    setError(t('app.auth.forgot.error.alreadySent'));
                } else {
                    setError(err.message);
                }
            } else {
                setError('Error');
            }
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">📬</div>
                    <h1 className="auth-title">{t('app.auth.forgot.success.title')}</h1>
                    <p className="auth-sub" style={{ textAlign: 'center', lineHeight: 1.6 }}>
                        {t('app.auth.forgot.success.sub')}
                    </p>
                    <button className="auth-btn" onClick={onBack}>
                        {t('app.auth.forgot.backToLogin')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <div className="auth-logo">🔑</div>
                <h1 className="auth-title">Money Manager</h1>
                <p className="auth-sub">{t('app.auth.forgot.title')}</p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '-8px 0 12px' }}>
                    {t('app.auth.forgot.sub')}
                </p>

                <input
                    className="auth-input"
                    type="email"
                    placeholder={t('app.auth.forgot.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                />

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={loading || alreadySent}>
                    {loading ? t('app.auth.forgot.loading') : t('app.auth.forgot.submit')}
                </button>

                <p className="auth-switch">
                    <span className="auth-link" onClick={onBack}>{t('app.auth.forgot.backToLogin')}</span>
                </p>
            </form>
        </div>
    );
}
