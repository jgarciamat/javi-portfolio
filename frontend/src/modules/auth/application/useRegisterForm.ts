import { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { validatePassword } from '../domain/passwordValidation';

export function useRegisterForm() {
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);

    // Live validation
    const passwordValidation = validatePassword(password);
    const passwordsMatch = password === confirmPassword;
    const confirmTouched = confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!passwordValidation.valid) {
            setError(passwordValidation.errors.join(' · '));
            return;
        }
        if (!passwordsMatch) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            await register(email, password, name);
            setRegistered(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return {
        name, setName,
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPass, setShowPass,
        showConfirm, setShowConfirm,
        error,
        loading,
        registered,
        passwordValidation,
        passwordsMatch,
        confirmTouched,
        handleSubmit,
    };
}
