import { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';
import { validatePassword } from '../domain/passwordValidation';

export function useRegisterForm() {
  const { register, loginWithGoogle } = useAuth();
  const { t, locale } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const confirmTouched = confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.map((key) => t(key)).join(' · '));
      return;
    }
    if (!passwordsMatch) {
      setError(t('app.auth.register.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name, locale);
      setRegistered(true);
    } catch (err) {
      setError(errorMessage(err, t('app.auth.register.error')));
    } finally {
      setLoading(false);
    }
  };

  /** Signing up with Google signs in at once (the auth page then redirects). */
  const handleGoogleToken = async (token: string) => {
    setError(null);
    try {
      await loginWithGoogle(token, locale);
    } catch {
      setError(t('app.auth.error.google'));
    }
  };

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    loading,
    registered,
    passwordsMatch,
    confirmTouched,
    handleSubmit,
    handleGoogleToken,
    reportGoogleError: () => setError(t('app.auth.error.google')),
  };
}
