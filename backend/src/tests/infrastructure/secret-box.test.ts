import { AesSecretBox } from '@infrastructure/auth/AesSecretBox';

describe('AesSecretBox', () => {
  const box = new AesSecretBox('k'.repeat(40), 'totp-secret');

  it('encrypts with a fresh IV every time and decrypts back', () => {
    const a = box.encrypt('JBSWY3DPEHPK3PXP');
    const b = box.encrypt('JBSWY3DPEHPK3PXP');
    expect(a).not.toBe(b);
    expect(a).not.toContain('JBSWY3DPEHPK3PXP');
    expect(a.startsWith('v1.')).toBe(true);
    expect(box.decrypt(a)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('cannot be read with another key or purpose', () => {
    const sealed = box.encrypt('secret');
    expect(new AesSecretBox('x'.repeat(40), 'totp-secret').decrypt(sealed)).toBeNull();
    expect(new AesSecretBox('k'.repeat(40), 'other').decrypt(sealed)).toBeNull();
  });

  it('detects tampering and malformed values', () => {
    const [v, iv, tag, data] = box.encrypt('secret').split('.');
    const flipped = data.slice(0, -1) + (data.endsWith('A') ? 'B' : 'A');
    expect(box.decrypt([v, iv, tag, flipped].join('.'))).toBeNull();
    expect(box.decrypt('v2.a.b.c')).toBeNull();
    expect(box.decrypt('v1.only')).toBeNull();
    expect(box.decrypt('plain')).toBeNull();
  });
});
