import { useRef, useState, type FormEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { useRegisterForm } from '../application/useRegisterForm';
import { AuthPasswordInput } from './AuthPasswordInput';
import { GoogleSignIn } from './GoogleButton';
import { PasswordHints } from './PasswordHints';
import { Icon } from '@shared/components/Icon';
import { SocialLinks } from '@shared/components/SocialLinks';

interface Props {
  onSwitch: () => void;
}

/** Shown after signing up: the account waits for the e-mail to be verified. */
function VerifyNotice({ email, onSwitch }: { email: string; onSwitch: () => void }) {
  const { t } = useI18n();
  return (
    <div className="auth-card">
      <div className="auth-logo">
        <Icon name="mail" />
      </div>
      <h1 className="auth-title">{t('app.auth.register.verify.title')}</h1>
      <p className="auth-sub auth-sub--center">
        {t('app.auth.register.verify.sub')}
        <br />
        <strong>{email}</strong>
      </p>
      <p className="auth-note">{t('app.auth.register.verify.instructions')}</p>
      <button className="auth-btn" onClick={onSwitch}>
        {t('app.auth.register.verify.goLogin')}
      </button>
    </div>
  );
}

/** Ids of the texts that explain a field, for aria-describedby. */
const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined;

/** Password and its confirmation, each pointing at the rules or the error that applies. */
function PasswordFields({
  form,
  passwordRef,
  confirmRef,
}: {
  form: ReturnType<typeof useRegisterForm>;
  passwordRef: RefObject<HTMLInputElement | null>;
  confirmRef: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useI18n();
  const mismatch = form.confirmTouched && !form.passwordsMatch;
  return (
    <>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="register-password">
          {t('app.auth.register.password')}
        </label>
        <AuthPasswordInput
          id="register-password"
          inputRef={passwordRef}
          value={form.password}
          onChange={form.setPassword}
          invalid={form.invalidField === 'password'}
          describedBy={describedBy(
            form.password.length > 0 && 'register-password-rules',
            form.invalidField === 'password' && 'register-error'
          )}
        />
        <PasswordHints
          id="register-password-rules"
          password={form.password}
          okText={t('app.auth.register.passwordOk')}
        />
      </div>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="register-confirm">
          {t('app.auth.register.confirmPassword')}
        </label>
        <AuthPasswordInput
          id="register-confirm"
          inputRef={confirmRef}
          value={form.confirmPassword}
          onChange={form.setConfirmPassword}
          invalid={mismatch || form.invalidField === 'confirm'}
          describedBy={describedBy(
            mismatch && 'register-mismatch',
            form.invalidField === 'confirm' && 'register-error'
          )}
        />
        {mismatch && (
          <p id="register-mismatch" className="auth-hint-error">
            ✗ {t('app.auth.register.mismatch')}
          </p>
        )}
      </div>
    </>
  );
}

/** First layer of the privacy notice: `{terms}` and `{privacy}` in the text become links. */
function LegalNotice({ textKey }: { textKey: string }) {
  const { t } = useI18n();
  return (
    <p className="auth-footer-links">
      {t(textKey)
        .split(/(\{terms\}|\{privacy\})/)
        .map((part, i) =>
          part === '{terms}' ? (
            <Link key={i} to="/terms">
              {t('app.auth.register.legal.terms')}
            </Link>
          ) : part === '{privacy}' ? (
            <Link key={i} to="/privacy">
              {t('app.auth.register.legal.privacy')}
            </Link>
          ) : (
            part
          )
        )}
    </p>
  );
}

export function RegisterPage({ onSwitch }: Props) {
  const { t } = useI18n();
  const form = useRegisterForm();
  // Spain sets 14 as the age to consent to data processing (LOPDGDD art. 7).
  const [oldEnough, setOldEnough] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // A refused submit takes focus to the field to fix.
  const submit = async (e: FormEvent) => {
    if (!oldEnough) return e.preventDefault();
    const invalid = await form.handleSubmit(e);
    if (invalid) (invalid === 'password' ? passwordRef : confirmRef).current!.focus();
  };

  if (form.registered) return <VerifyNotice email={form.email} onSwitch={onSwitch} />;

  return (
    <form onSubmit={submit} className="auth-card">
      <h1 className="auth-title">{t('app.auth.register.title')}</h1>
      <p className="auth-sub">
        {t('app.auth.register.subtitle')}{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>
          {t('app.auth.register.subtitleLink')}
        </button>
      </p>

      <GoogleSignIn
        label={t('app.auth.register.google')}
        onToken={form.handleGoogleToken}
        onError={form.reportGoogleError}
      />
      <LegalNotice textKey="app.auth.register.legal.google" />

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="register-name">
          {t('app.auth.register.name')}
        </label>
        <input
          id="register-name"
          className="auth-input"
          type="text"
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
          required
          autoFocus
          autoComplete="name"
        />
      </div>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="register-email">
          {t('app.auth.register.email')}
        </label>
        <input
          id="register-email"
          className="auth-input"
          type="email"
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <PasswordFields form={form} passwordRef={passwordRef} confirmRef={confirmRef} />

      {form.error && (
        <p id="register-error" className="auth-error" role="alert">
          {form.error}
        </p>
      )}
      <label className="auth-remember">
        <input
          type="checkbox"
          checked={oldEnough}
          onChange={(e) => setOldEnough(e.target.checked)}
          required
        />
        <span>{t('app.auth.register.age')}</span>
      </label>
      {/* Sending is aria-disabled, not disabled: the button keeps focus while it runs. */}
      <button type="submit" className="auth-btn" disabled={!oldEnough} aria-disabled={form.loading}>
        {form.loading ? t('app.auth.register.loading') : t('app.auth.register.submit')}
      </button>
      <LegalNotice textKey="app.auth.register.legal.email" />
      <SocialLinks />
    </form>
  );
}
