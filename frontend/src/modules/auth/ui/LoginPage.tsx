import { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';

interface Props { onSwitch: () => void; }

export function LoginPage({ onSwitch }: Props) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try { await login(email, password); }
        catch (err) { setError(err instanceof Error ? err.message : 'Error al iniciar sesión'); }
        finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <div className="auth-logo">💰</div>
                <h1 className="auth-title">Money Manager</h1>
                <p className="auth-sub">Inicia sesión en tu cuenta</p>

                <input className="auth-input" type="email" placeholder="Email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoFocus />

                <div className="auth-pass-wrap">
                    <input className="auth-input auth-pass-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        {showPass ? '🙈' : '👁️'}
                    </button>
                </div>

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

