import { useI18n } from '@core/i18n/I18nContext';
import { validatePassword } from '../domain/passwordValidation';

/** Live list of the password rules still missing (nothing while the field is empty). */
export function PasswordHints({ password, okText }: { password: string; okText?: string }) {
  const { t } = useI18n();
  if (password.length === 0) return null;
  const { valid, errors } = validatePassword(password);
  if (valid) return okText ? <p className="auth-hint-ok">{okText}</p> : null;
  return (
    <ul className="auth-password-hints" aria-label={t('app.password.rules')}>
      {errors.map((key) => (
        <li key={key} className="auth-hint-error">
          ✗ {t(key)}
        </li>
      ))}
    </ul>
  );
}
