import { ValidationError } from '@domain/errors';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Same rules the frontend shows while typing (modules/auth/domain/passwordValidation.ts). */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`al menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`como máximo ${PASSWORD_MAX_LENGTH} caracteres`);
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
