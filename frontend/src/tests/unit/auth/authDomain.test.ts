import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { AVATAR_CHOICES, avatarChoices } from '@modules/auth/domain/avatar';

describe('validatePassword', () => {
  it('lists every rule that fails, as i18n keys', () => {
    expect(validatePassword('abc')).toEqual({
      valid: false,
      errors: [
        'app.password.rule.length',
        'app.password.rule.upper',
        'app.password.rule.digit',
        'app.password.rule.symbol',
      ],
    });
  });

  it('accepts a strong password', () => {
    expect(validatePassword('Sup3r-secret!')).toEqual({ valid: true, errors: [] });
  });

  it('refuses more than 72 bytes, counting accents and emojis as bcrypt does', () => {
    const tooLong = { valid: false, errors: ['app.password.rule.maxLength'] };
    expect(validatePassword(`Aa1!${'x'.repeat(68)}`).valid).toBe(true);
    expect(validatePassword(`Aa1!${'x'.repeat(69)}`)).toEqual(tooLong);
    expect(validatePassword(`Aa1!${'ñ'.repeat(34)}`).valid).toBe(true);
    expect(validatePassword(`Aa1!${'ñ'.repeat(35)}`)).toEqual(tooLong);
    expect(validatePassword(`Aa1!${'💶'.repeat(18)}`)).toEqual(tooLong);
  });
});

describe('avatarChoices', () => {
  it('offers the calm set, keeping first a saved avatar that is no longer offered', () => {
    expect(AVATAR_CHOICES).toHaveLength(16);
    expect(avatarChoices(null)).toBe(AVATAR_CHOICES);
    expect(avatarChoices('🦊')).toBe(AVATAR_CHOICES);
    expect(avatarChoices('🤖')).toEqual(['🤖', ...AVATAR_CHOICES]);
  });
});
