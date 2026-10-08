import { useEffect, useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { authApi } from '@core/api/authApi';
import { errorCode } from '@core/api/http';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';
import { storage } from '@shared/utils/storage';

const REMEMBER_EMAIL_KEY = 'mm_remember_email';

const ERROR_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: 'app.auth.error.invalidCredentials',
  EMAIL_NOT_VERIFIED: 'app.auth.error.emailNotVerified',
  RATE_LIMITED: 'app.auth.error.rateLimited',
  GOOGLE_DISABLED: 'app.auth.error.google',
  GOOGLE_AUTH_FAILED: 'app.auth.error.google',
  GOOGLE_EMAIL_NOT_VERIFIED: 'app.auth.error.google',
};

export function useLoginForm(onSuccess?: () => void) {
  const { login, loginWithGoogle } = useAuth();
  const { t, locale } = useI18n();
  const [email, setEmail] = useState(() => storage.get(REMEMBER_EMAIL_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => storage.get(REMEMBER_EMAIL_KEY) !== null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Set when the account exists but the e-mail was never verified. */
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // "Remember me" keeps only the e-mail on this device.
  useEffect(() => {
    storage.set(REMEMBER_EMAIL_KEY, remember ? email : null);
  }, [remember, email]);

  const messageFor = (err: unknown): string => {
    const key = ERROR_KEYS[errorCode(err) ?? ''];
    return key ? t(key) : errorMessage(err, t('app.auth.error.generic'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      setError(messageFor(err));
      setNeedsVerification(errorCode(err) === 'EMAIL_NOT_VERIFIED');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    // The API answers the same whether the e-mail exists or not.
    await authApi.resendVerification(email, locale).catch(() => undefined);
    setVerificationSent(true);
  };

  const handleGoogleToken = async (googleToken: string) => {
    setError(null);
    try {
      await loginWithGoogle(googleToken, locale);
      onSuccess?.();
    } catch (err) {
      setError(messageFor(err));
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    remember,
    setRemember,
    error,
    loading,
    handleSubmit,
    needsVerification,
    verificationSent,
    resendVerification,
    handleGoogleToken,
    reportGoogleError: () => setError(t('app.auth.error.google')),
  };
}
