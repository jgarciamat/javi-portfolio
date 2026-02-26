import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@core/api/authApi';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('El enlace de verificación no es válido.');
            return;
        }

        authApi.verifyEmail(token)
            .then((res) => {
                setMessage(res.message);
                setStatus('success');
            })
            .catch((err: unknown) => {
                setMessage(err instanceof Error ? err.message : 'Error al verificar el email.');
                setStatus('error');
            });
    }, [searchParams]);

    return (
        <div className="auth-page">
            <div className="auth-card">
                {status === 'loading' && (
                    <>
                        <div className="auth-logo">⏳</div>
                        <h1 className="auth-title">Verificando...</h1>
                        <p className="auth-sub">Por favor, espera un momento.</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="auth-logo">✅</div>
                        <h1 className="auth-title">¡Email verificado!</h1>
                        <p className="auth-sub" style={{ textAlign: 'center' }}>{message}</p>
                        <button className="auth-btn" style={{ marginTop: '24px' }} onClick={() => navigate('/auth', { replace: true })}>
                            Iniciar sesión
                        </button>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="auth-logo">❌</div>
                        <h1 className="auth-title">Error de verificación</h1>
                        <p className="auth-sub" style={{ textAlign: 'center', color: '#ef4444' }}>{message}</p>
                        <button className="auth-btn" style={{ marginTop: '24px' }} onClick={() => navigate('/auth', { replace: true })}>
                            Volver al inicio
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
