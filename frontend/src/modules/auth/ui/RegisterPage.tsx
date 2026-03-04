import { useRegisterForm } from '../application/useRegisterForm';
import { useI18n } from '@core/i18n/I18nContext';

interface Props { onSwitch: () => void; }

export function RegisterPage({ onSwitch }: Props) {
    const { t } = useI18n();
    const {
        name, setName,
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPass, setShowPass,
        showConfirm, setShowConfirm,
        error, loading, registered,
        passwordValidation,
        passwordsMatch, confirmTouched,
        handleSubmit,
    } = useRegisterForm();

    if (registered) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-logo">📧</div>
                    <h1 className="auth-title">{t('app.auth.register.verify.title')}</h1>
                    <p className="auth-sub" style={{ textAlign: 'center', lineHeight: 1.6 }}>
                        {t('app.auth.register.verify.sub')}<br />
                        <strong>{email}</strong>
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '12px 0 20px' }}>
                        {t('app.auth.register.verify.instructions')}
                    </p>
                    <button className="auth-btn" onClick={onSwitch}>
                        {t('app.auth.register.verify.goLogin')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <div className="auth-logo">💰</div>
                <h1 className="auth-title">Money Manager</h1>
                <p className="auth-sub">{t('app.auth.register.title')}</p>

                <input className="auth-input" type="text" placeholder={t('app.auth.register.name')} value={name}
                    onChange={(e) => setName(e.target.value)} required autoFocus />
                <input className="auth-input" type="email" placeholder={t('app.auth.register.email')} value={email}
                    onChange={(e) => setEmail(e.target.value)} required />

                {/* Password */}
                <div className="auth-pass-wrap">
                    <input
                        className="auth-input auth-pass-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder={t('app.auth.register.password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? t('app.auth.register.hidePassword') : t('app.auth.register.showPassword')}>
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
                    <p className="auth-hint-ok">{t('app.auth.register.passwordOk')}</p>
                )}

                {/* Confirm password */}
                <div className="auth-pass-wrap">
                    <input
                        className={`auth-input auth-pass-input${confirmTouched && !passwordsMatch ? ' auth-input-error' : ''}`}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder={t('app.auth.register.confirmPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowConfirm(v => !v)}
                        aria-label={showConfirm ? t('app.auth.register.hideConfirm') : t('app.auth.register.showConfirm')}>
                        {showConfirm ? '🙈' : '👁️'}
                    </button>
                </div>
                {confirmTouched && !passwordsMatch && (
                    <p className="auth-hint-error" style={{ marginTop: '-4px' }}>✗ {t('app.profile.password.noMatch').replace('✗ ', '')}</p>
                )}

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? t('app.auth.register.loading') : t('app.auth.register.submit')}
                </button>
                <p className="auth-switch">
                    {t('app.auth.register.switch')}{' '}
                    <span className="auth-link" onClick={onSwitch}>{t('app.auth.register.switchLink')}</span>
                </p>
            </form>
        </div>
    );
}
