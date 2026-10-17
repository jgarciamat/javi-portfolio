import { ValidationError } from '@domain/errors';

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores everything after the first 72 bytes (UTF-8): longer would be misleading. */
export const PASSWORD_MAX_BYTES = 72;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/** Same rules the frontend shows while typing (modules/auth/domain/passwordValidation.ts). */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`al menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    problems.push(
      `como máximo ${PASSWORD_MAX_BYTES} bytes (72 caracteres sin tildes ni emojis; cada tilde o emoji ocupa más)`
    );
  }
  if (!/[A-Z]/.test(password)) problems.push('una mayúscula');
  if (!/[0-9]/.test(password)) problems.push('un número');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('un símbolo');
  return problems;
}

export function assertStrongPassword(password: string): void {
  const problems = passwordProblems(password);
  if (problems.length > 0) {
    throw new ValidationError(`La contraseña debe tener ${problems.join(', ')}`, 'WEAK_PASSWORD', {
      problems,
    });
  }
}
