import { validatePassword } from '@modules/auth/domain/passwordValidation';
import { PRESET_AVATARS, emojiAvatar } from '@modules/auth/domain/avatar';

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
});

describe('emojiAvatar', () => {
  it('draws the emoji in an SVG data URL', () => {
    const url = emojiAvatar(PRESET_AVATARS[0]);
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url)).toContain(PRESET_AVATARS[0]);
  });
});
