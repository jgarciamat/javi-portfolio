import { useState, useEffect } from 'react';
import './css/AuthPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { ForgotPasswordPage } from '@modules/auth/ui/ForgotPasswordPage';
import { PublicHeader } from './PublicHeader';

export function AuthPage() {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    return (
        <div className="auth-page-root">
            <PublicHeader />
            <div className="auth-page-with-header">
                {mode === 'forgot' && <ForgotPasswordPage onBack={() => setMode('login')} />}
                {mode === 'register' && <RegisterPage onSwitch={() => setMode('login')} />}
                {mode === 'login' && <LoginPage onSwitch={() => setMode('register')} onForgot={() => setMode('forgot')} />}
            </div>
        </div>
    );
}
