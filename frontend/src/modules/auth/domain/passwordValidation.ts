/**
 * Password strength rules:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one digit
 *  - At least one symbol (non-alphanumeric)
 */
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Al menos una mayúscula');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Al menos un número');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Al menos un símbolo (p. ej. @, #, !)');
    }

    return { valid: errors.length === 0, errors };
}
