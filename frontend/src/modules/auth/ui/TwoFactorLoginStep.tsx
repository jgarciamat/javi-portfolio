import { useEffect, useRef, useState } from 'react';
import { errorCode } from '@core/api/http';
import { useI18n } from '@core/i18n/I18nContext';
import { useAuth } from '@shared/hooks/useAuth';
import { errorMessage } from '@shared/utils/errors';
import './css/TwoFactor.css';

const ERROR_KEYS: Record<string, string> = {
  INVALID_TWO_FACTOR_CODE: 'app.twoFactor.error.invalid',
  TWO_FACTOR_LOCKED: 'app.twoFactor.error.locked',
  TWO_FACTOR_CHALLENGE_EXPIRED: 'app.twoFactor.error.expired',
  RATE_LIMITED: 'app.auth.error.rateLimited',
};

/** The field of the code: digits of the app (phone keypad, autofill) or a recovery code. */
function CodeInput({
  inputRef,
  recovery,
  value,
  onChange,
  invalid,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  recovery: boolean;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const shared = {
    ref: inputRef,
    id: 'two-factor-code',
    type: 'text',
    value,
    required: true,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? 'two-factor-error' : undefined,
  };
  if (recovery) {
    return (
      <input
        {...shared}
        key="recovery"
        className="auth-input"
        onChange={(e) => onChange(e.target.value)}
        placeholder="abcd-efgh-jkmn"
        maxLength={20}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    );
  }
  return (
    <input
      {...shared}
      key="totp"
      className="auth-input auth-code-input"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="123456"
      minLength={6}
      maxLength={6}
      inputMode="numeric"
      pattern="[0-9]{6}"
      autoComplete="one-time-code"
    />
  );
}

/** Second step of a sign-in with 2FA: the 6-digit code of the app, or a recovery code. */
export function TwoFactorLoginStep() {
  const { t } = useI18n();
  const { verifyTwoFactor, cancelTwoFactor } = useAuth();
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The field takes focus at first, when switching the kind of code and after an error.
  useEffect(() => {
    inputRef.current!.focus();
  }, [recovery, error]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await verifyTwoFactor(code);
    } catch (err) {
      const key = ERROR_KEYS[errorCode(err) ?? ''];
      setError(key ? t(key) : errorMessage(err, t('app.auth.error.generic')));
      setLoading(false);
    }
  };

  const switchKind = () => {
    setRecovery((r) => !r);
    setCode('');
    setError(null);
  };

  const invalid = error !== null;
  return (
    <form onSubmit={submit} className="auth-card" aria-labelledby="two-factor-title">
      <h1 id="two-factor-title" className="auth-title">
        {t('app.twoFactor.login.title')}
      </h1>
      <p className="auth-sub">
        {t(recovery ? 'app.twoFactor.login.recoveryHint' : 'app.twoFactor.login.hint')}
      </p>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="two-factor-code">
          {t(recovery ? 'app.twoFactor.login.recoveryLabel' : 'app.twoFactor.login.codeLabel')}
        </label>
        <CodeInput
          inputRef={inputRef}
          recovery={recovery}
          value={code}
          onChange={setCode}
          invalid={invalid}
        />
      </div>

      {error && (
        <p id="two-factor-error" className="auth-error" role="alert">
          {error}
        </p>
      )}

      {/* aria-disabled, not disabled: the button keeps focus while the request runs. */}
      <button type="submit" className="auth-btn" aria-disabled={loading}>
        {loading ? t('app.twoFactor.login.loading') : t('app.twoFactor.login.submit')}
      </button>

      <p className="auth-footer-links">
        <button type="button" className="auth-link" onClick={switchKind}>
          {t(recovery ? 'app.twoFactor.login.useApp' : 'app.twoFactor.login.useRecovery')}
        </button>
        {' · '}
        <button type="button" className="auth-link" onClick={cancelTwoFactor}>
          {t('app.twoFactor.login.back')}
        </button>
      </p>
    </form>
  );
}
