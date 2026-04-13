import { useState, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';

const REMEMBER_EMAIL_KEY = 'mm_remember_email';

export function useLoginForm(onSuccess?: () => void) {
    const { login } = useAuth();

    // Pre-fill remembered email if any
    const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_EMAIL_KEY));
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Sync checkbox state to storage
    useEffect(() => {
        if (remember) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
    }, [remember, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return {
        email, setEmail,
        password, setPassword,
        showPass, setShowPass,
        remember, setRemember,
        error,
        loading,
        handleSubmit,
    };
}
