import { useState } from 'react';
import { authApi, ApiError } from '@core/api/authApi';
import { useI18n } from '@core/i18n/I18nContext';

interface Props { onBack: () => void; }

function resolveError(err: unknown, t: (key: string) => string): { message: string; alreadySent: boolean } {
    const isNotFound = (e: { code?: string; status?: number }) =>
        e.status === 404 || e.code === 'EMAIL_NOT_FOUND';
    const isAlreadySent = (e: { code?: string; status?: number }) =>
        e.status === 409 || e.code === 'RESET_EMAIL_ALREADY_SENT';

    if (err instanceof ApiError || err instanceof Error) {
        const coded = err as Error & { code?: string; status?: number };
        if (isNotFound(coded)) return { message: t('app.auth.forgot.error.notFound'), alreadySent: false };
        if (isAlreadySent(coded)) return { message: t('app.auth.forgot.error.alreadySent'), alreadySent: true };
        return { message: (err as Error).message, alreadySent: false };
    }
    return { message: 'Error', alreadySent: false };
}

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
            const { message, alreadySent } = resolveError(err, t);
            setError(message);
            if (alreadySent) setAlreadySent(true);
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
