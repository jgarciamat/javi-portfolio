import { useI18n } from '@core/i18n/I18nContext';
import { PASSWORD_RULES_COUNT, validatePassword } from '../domain/passwordValidation';

/** How many of the rules the password meets, as a bar of segments and a word (nothing while empty). */
export function PasswordMeter({ password }: { password: string }) {
  const { t } = useI18n();
  if (password.length === 0) return null;
  const met = PASSWORD_RULES_COUNT - validatePassword(password).errors.length;
  const level =
    met === PASSWORD_RULES_COUNT ? 'strong' : met >= PASSWORD_RULES_COUNT - 2 ? 'medium' : 'weak';
  return (
    <div className={`auth-meter auth-meter--${level}`}>
      <div className="auth-meter-bar" aria-hidden="true">
        {Array.from({ length: PASSWORD_RULES_COUNT }, (_, i) => (
          <span key={i} className={i < met ? 'auth-meter-on' : undefined} />
        ))}
      </div>
      <span className="auth-meter-label" role="status">
        {t(`app.auth.reset.strength.${level}`)}
      </span>
    </div>
  );
}
