import { useRegisterForm } from '../application/useRegisterForm';
import { useI18n } from '@core/i18n/I18nContext';
import { AuthPasswordInput } from './AuthPasswordInput';

interface Props { onSwitch: () => void; }

interface PasswordHintsProps { password: string; errors: string[]; valid: boolean; okText: string; }

function PasswordHints({ password, errors, valid, okText }: PasswordHintsProps) {
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
        );
    }

    return (
        <form onSubmit={handleSubmit} className="auth-card">
            <div className="auth-logo">💰</div>
            <h1 className="auth-title">Money Manager</h1>
            <p className="auth-sub">{t('app.auth.register.title')}</p>

            <input className="auth-input" type="text" placeholder={t('app.auth.register.name')} value={name}
                onChange={(e) => setName(e.target.value)} required autoFocus />
            <input className="auth-input" type="email" placeholder={t('app.auth.register.email')} value={email}
                onChange={(e) => setEmail(e.target.value)} required />

            {/* Password */}
            <AuthPasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                show={showPass}
                onToggle={() => setShowPass(v => !v)}
                placeholder={t('app.auth.register.password')}
                showLabel={t('app.auth.register.showPassword')}
                hideLabel={t('app.auth.register.hidePassword')}
                required
            />

            {/* Password strength hints */}
            <PasswordHints
                password={password}
                errors={passwordValidation.errors}
                valid={passwordValidation.valid}
                okText={t('app.auth.register.passwordOk')}
            />

            {/* Confirm password */}
            <AuthPasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
                placeholder={t('app.auth.register.confirmPassword')}
                showLabel={t('app.auth.register.showConfirm')}
                hideLabel={t('app.auth.register.hideConfirm')}
                errorClass={confirmTouched && !passwordsMatch ? 'auth-input-error' : undefined}
                required
            />
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
    );
}
