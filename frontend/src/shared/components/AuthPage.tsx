import { useState, useEffect } from 'react';
import './css/AuthPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { ForgotPasswordPage } from '@modules/auth/ui/ForgotPasswordPage';

export function AuthPage() {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    if (mode === 'forgot') return <ForgotPasswordPage onBack={() => setMode('login')} />;
    if (mode === 'register') return <RegisterPage onSwitch={() => setMode('login')} />;
    return <LoginPage onSwitch={() => setMode('register')} onForgot={() => setMode('forgot')} />;
}
