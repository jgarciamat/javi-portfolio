import { useRegisterForm } from '../application/useRegisterForm';

interface Props { onSwitch: () => void; }

export function RegisterPage({ onSwitch }: Props) {
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
                    <h1 className="auth-title">¡Revisa tu email!</h1>
                    <p className="auth-sub" style={{ textAlign: 'center', lineHeight: 1.6 }}>
                        Hemos enviado un enlace de verificación a<br />
                        <strong>{email}</strong>
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '12px 0 20px' }}>
                        Haz clic en el enlace del email para activar tu cuenta.
                        Luego podrás iniciar sesión.
                    </p>
                    <button className="auth-btn" onClick={onSwitch}>
                        Ir a iniciar sesión
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
                <p className="auth-sub">Crea tu cuenta gratuita</p>

                <input className="auth-input" type="text" placeholder="Nombre" value={name}
                    onChange={(e) => setName(e.target.value)} required autoFocus />
                <input className="auth-input" type="email" placeholder="Email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />

                {/* Password */}
                <div className="auth-pass-wrap">
                    <input
                        className="auth-input auth-pass-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
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
                    <p className="auth-hint-ok">✓ Contraseña segura</p>
                )}

                {/* Confirm password */}
                <div className="auth-pass-wrap">
                    <input
                        className={`auth-input auth-pass-input${confirmTouched && !passwordsMatch ? ' auth-input-error' : ''}`}
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repetir contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowConfirm(v => !v)}
                        aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}>
                        {showConfirm ? '🙈' : '👁️'}
                    </button>
                </div>
                {confirmTouched && !passwordsMatch && (
                    <p className="auth-hint-error" style={{ marginTop: '-4px' }}>✗ Las contraseñas no coinciden</p>
                )}

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
                <p className="auth-switch">
                    ¿Ya tienes cuenta?{' '}
                    <span className="auth-link" onClick={onSwitch}>Inicia sesión</span>
                </p>
            </form>
        </div>
    );
}
