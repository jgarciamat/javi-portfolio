import { useLoginForm } from '../application/useLoginForm';
import { useI18n } from '@core/i18n/I18nContext';

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
        <div className="auth-page">
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

                <label className="auth-remember">
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span>{t('app.auth.login.remember')}</span>
                </label>
                <p style={{ textAlign: 'right', margin: '-4px 0 4px' }}>
                    <span className="auth-link" style={{ fontSize: '0.8rem' }} onClick={onForgot}>
                        {t('app.auth.forgot.link')}
                    </span>
                </p>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? t('app.auth.login.loading') : t('app.auth.login.submit')}
                </button>
                <p className="auth-switch">
                    {t('app.auth.login.switch')}{' '}
                    <span className="auth-link" onClick={onSwitch}>{t('app.auth.login.switchLink')}</span>
                </p>
            </form>
        </div>
    );
}