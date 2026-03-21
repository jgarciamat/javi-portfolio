import { useRegisterForm } from '../application/useRegisterForm';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import { useGoogleLogin } from '@react-oauth/google';
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

function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

export function RegisterPage({ onSwitch }: Props) {
    const { t } = useI18n();
    const { loginWithGoogle } = useAuth();

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                await loginWithGoogle(tokenResponse.access_token);
                onSwitch();
            } catch {
                // ignore
            }
        },
        flow: 'implicit',
    });

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
            <h1 className="auth-title">{t('app.auth.register.title')}</h1>
            <p className="auth-sub">
                {t('app.auth.register.subtitle')}{' '}
                <span className="auth-link" onClick={onSwitch}>{t('app.auth.register.subtitleLink')}</span>
            </p>

            <button type="button" className="auth-google-btn" onClick={() => handleGoogleLogin()}>
                <GoogleIcon />
                {t('app.auth.register.google')}
            </button>

            <div className="auth-divider">
                <span>{t('app.auth.login.orDivider')}</span>
            </div>

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
        </form>
    );
}
