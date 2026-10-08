/**
 * Password policy (same as the API): at least 8 characters, an uppercase
 * letter, a digit and a symbol. Errors are i18n keys.
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const RULES: { key: string; ok: (password: string) => boolean }[] = [
  { key: 'app.password.rule.length', ok: (p) => p.length >= 8 },
  { key: 'app.password.rule.upper', ok: (p) => /[A-Z]/.test(p) },
  { key: 'app.password.rule.digit', ok: (p) => /[0-9]/.test(p) },
  { key: 'app.password.rule.symbol', ok: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors = RULES.filter((r) => !r.ok(password)).map((r) => r.key);
  return { valid: errors.length === 0, errors };
}
