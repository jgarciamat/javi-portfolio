import { useLoginForm } from '../application/useLoginForm';
import { useI18n } from '@core/i18n/I18nContext';
import { Link } from 'react-router-dom';

interface Props { onSwitch: () => void; onForgot: () => void; }

export function LoginPage({ onSwitch, onForgot }: Props) {
    const { t } = useI18n();
    const {
        email, setEmail,
        password, setPassword,
        showPass, setShowPass,
        remember, setRemember,
        error, loading,
        handleSubmit,
    } = useLoginForm();

    return (
        <form onSubmit={handleSubmit} className="auth-card">
            <div className="auth-logo">💰</div>
            <h1 className="auth-title">Money Manager</h1>
            <p className="auth-sub">{t('app.auth.login.title')}</p>

            <input
                className="auth-input"
                type="email"
                placeholder={t('app.auth.login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
            />

            <div className="auth-pass-wrap">
                <input
                    className="auth-input auth-pass-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('app.auth.login.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? t('app.auth.login.hidePassword') : t('app.auth.login.showPassword')}
                >
                    {showPass ? '🙈' : '👁️'}
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '-8px 0 4px' }}>
                <label className="auth-remember">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>{t('app.auth.login.remember')}</span>
                </label>
                <span className="auth-link" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={onForgot}>
                    {t('app.auth.forgot.link')}
                </span>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? t('app.auth.login.loading') : t('app.auth.login.submit')}
            </button>
            <p className="auth-switch">
                {t('app.auth.login.switch')}{' '}
                <span className="auth-link" onClick={onSwitch}>{t('app.auth.login.switchLink')}</span>
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', textAlign: 'center', color: '#64748b' }}>
                <Link to="/privacy" style={{ color: '#6366f1', textDecoration: 'none' }}>
                    {t('app.privacy.link')}
                </Link>
            </p>
        </form>
    );
}