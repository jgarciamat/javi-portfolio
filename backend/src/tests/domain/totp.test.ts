import {
  RECOVERY_CODE_COUNT,
  base32Decode,
  base32Encode,
  generateRecoveryCode,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  matchTotp,
  normalizeRecoveryCode,
  otpauthUri,
  totpCode,
  totpStep,
} from '@domain/services/totp';

// RFC 6238 appendix B uses the ASCII seed "12345678901234567890" (SHA-1, 8 digits).
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP (RFC 6238)', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC test vectors at %i s (last 6 digits)', (seconds, code) => {
    expect(totpCode(RFC_SECRET, seconds * 1000)).toBe(code);
  });

  it('matches the RFC 4226 HOTP vectors', () => {
    const secret = Buffer.from('12345678901234567890');
    expect(hotp(secret, 0)).toBe('755224');
    expect(hotp(secret, 9)).toBe('520489');
  });

  it('round-trips base32 and refuses other characters', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 255, 7]);
    const encoded = base32Encode(bytes);
    expect(base32Decode(encoded)).toEqual(bytes);
    expect(base32Decode(`${encoded.toLowerCase().slice(0, 4)} ${encoded.slice(4)}==`)).toEqual(
      bytes
    );
    expect(base32Decode('ABC1')).toBeNull();
    expect(base32Encode(Buffer.from('12345678901234567890'))).toBe(
      'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    );
  });

  it('generates 160-bit secrets', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret)).toHaveLength(20);
    expect(generateTotpSecret()).not.toBe(secret);
  });

  describe('matchTotp', () => {
    const now = 1_800_000_000_000;
    const step = totpStep(now);

    it('accepts the current code and one step of drift each way', () => {
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now), now, null)).toBe(step);
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now - 30_000), now, null)).toBe(step - 1);
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now + 30_000), now, null)).toBe(step + 1);
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now - 60_000), now, null)).toBeNull();
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now + 60_000), now, null)).toBeNull();
    });

    it('takes spaces in the code but nothing that is not 6 digits', () => {
      const code = totpCode(RFC_SECRET, now);
      expect(matchTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, now, null)).toBe(step);
      expect(matchTotp(RFC_SECRET, '12345', now, null)).toBeNull();
      expect(matchTotp(RFC_SECRET, 'abcdef', now, null)).toBeNull();
    });

    it('refuses a code whose step was already used (replay)', () => {
      const code = totpCode(RFC_SECRET, now);
      expect(matchTotp(RFC_SECRET, code, now, step)).toBeNull();
      expect(matchTotp(RFC_SECRET, code, now, step - 1)).toBe(step);
      // An older code is refused once a newer one was accepted.
      expect(matchTotp(RFC_SECRET, totpCode(RFC_SECRET, now - 30_000), now, step)).toBeNull();
    });

    it('never matches with a broken or empty secret', () => {
      expect(matchTotp('!!!', '123456', now, null)).toBeNull();
      expect(matchTotp('', '123456', now, null)).toBeNull();
    });
  });

  it('builds the otpauth link the authenticator apps read', () => {
    const uri = otpauthUri('Finanverso', 'ana+1@test.dev', 'ABCDEF');
    expect(uri).toBe(
      'otpauth://totp/Finanverso%3Aana%2B1%40test.dev?secret=ABCDEF&issuer=Finanverso&algorithm=SHA1&digits=6&period=30'
    );
  });
});

describe('recovery codes', () => {
  it('are random groups of four without look-alike characters', () => {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    for (const code of codes) expect(code).toMatch(/^[a-hjkmnp-z2-9]{4}(-[a-hjkmnp-z2-9]{4}){2}$/);
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
  });

  it('are compared without case, spaces or dashes, salted per user', () => {
    expect(normalizeRecoveryCode(' ABCD-efgh jkmn ')).toBe('abcdefghjkmn');
    expect(hashRecoveryCode('u1', 'ABCD-EFGH-JKMN')).toBe(hashRecoveryCode('u1', 'abcdefghjkmn'));
    expect(hashRecoveryCode('u1', 'abcd-efgh-jkmn')).not.toBe(
      hashRecoveryCode('u2', 'abcd-efgh-jkmn')
    );
    expect(hashRecoveryCode('u1', 'abcd')).toMatch(/^[0-9a-f]{64}$/);
  });
});
