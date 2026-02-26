import { useLoginForm } from '../application/useLoginForm';

interface Props { onSwitch: () => void; }

export function LoginPage({ onSwitch }: Props) {
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
                <p className="auth-sub">Inicia sesión en tu cuenta</p>

                <input
                    className="auth-input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                />

                <div className="auth-pass-wrap">
                    <input
                        className="auth-input auth-pass-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                    <span>Recordarme</span>
                </label>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Entrando...' : 'Iniciar sesión'}
                </button>
                <p className="auth-switch">
                    ¿No tienes cuenta?{' '}
                    <span className="auth-link" onClick={onSwitch}>Regístrate</span>
                </p>
            </form>
        </div>
    );
}