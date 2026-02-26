import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';

export function AuthPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    return mode === 'login'
        ? <LoginPage onSwitch={() => setMode('register')} />
        : <RegisterPage onSwitch={() => setMode('login')} />;
}
