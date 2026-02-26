import { validatePassword } from '../../../modules/auth/domain/passwordValidation';

describe('validatePassword', () => {
    it('rejects empty password', () => {
        const result = validatePassword('');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Al menos 8 caracteres');
    });

    it('rejects password shorter than 8 chars', () => {
        const result = validatePassword('Ab1!xyz');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Al menos 8 caracteres');
    });

    it('rejects password without uppercase', () => {
        const result = validatePassword('ab1!wxyz');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Al menos una mayúscula');
    });

    it('rejects password without digit', () => {
        const result = validatePassword('Abcdefg!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Al menos un número');
    });

    it('rejects password without symbol', () => {
        const result = validatePassword('Abcdefg1');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Al menos un símbolo (p. ej. @, #, !)');
    });

    it('accepts valid password with all requirements', () => {
        const result = validatePassword('Secure1!');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('accepts strong password with multiple symbols', () => {
        const result = validatePassword('MyP@ssw0rd#2026');
        expect(result.valid).toBe(true);
    });

    it('returns multiple errors when several rules fail', () => {
        const result = validatePassword('short');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
    });
});
