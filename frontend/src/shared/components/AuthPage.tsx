import { useState, useEffect } from 'react';
import './css/AuthPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { ForgotPasswordPage } from '@modules/auth/ui/ForgotPasswordPage';
import { TwoFactorLoginStep } from '@modules/auth/ui/TwoFactorLoginStep';
import { safeNext } from '@shared/utils/appLinks';
import { PublicHeader } from './PublicHeader';

export function AuthPage() {
  const [params] = useSearchParams();
  // ?mode=register (pricing links) and ?mode=forgot (the "you already have an account" e-mail).
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(() => {
    const requested = params.get('mode');
    return requested === 'register' || requested === 'forgot' ? requested : 'login';
  });
  const { isAuthenticated, twoFactorChallenge } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate(safeNext(params.get('next')), { replace: true });
  }, [isAuthenticated, navigate, params]);

  return (
    <div className="auth-page-root">
      <PublicHeader />
      <main className="auth-page-with-header">
        {/* After the password (or Google) of an account with 2FA: the code, whatever the mode. */}
        {twoFactorChallenge && <TwoFactorLoginStep />}
        {!twoFactorChallenge && (
          <>
            {mode === 'forgot' && <ForgotPasswordPage onBack={() => setMode('login')} />}
            {mode === 'register' && <RegisterPage onSwitch={() => setMode('login')} />}
            {mode === 'login' && (
              <LoginPage onSwitch={() => setMode('register')} onForgot={() => setMode('forgot')} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
