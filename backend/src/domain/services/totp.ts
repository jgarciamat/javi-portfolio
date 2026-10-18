import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

/**
 * Time-based one-time passwords (RFC 6238 over RFC 4226 HOTP, HMAC-SHA1, 6 digits,
 * 30-second steps): what Google Authenticator, Authy or 1Password generate.
 */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps accepted on each side of the current one (clock drift of the phone). */
export const TOTP_WINDOW = 1;
const SECRET_BYTES = 20;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** Decodes base32, ignoring case, spaces and padding; null when it has other characters. */
export function base32Decode(text: string): Buffer | null {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret, base32 (the form authenticator apps take). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

export function hotp(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function totpStep(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_PERIOD_SECONDS);
}

/** The code shown by the app at `timeMs`. */
export function totpCode(secretBase32: string, timeMs: number): string {
  return hotp(base32Decode(secretBase32) as Buffer, totpStep(timeMs));
}

/** Only the digits of what the user typed ("123 456" is fine). */
export function normalizeTotpCode(code: string): string {
  return code.replace(/[\s-]/g, '');
}

/**
 * The step whose code matches (current one ±TOTP_WINDOW), or null. Steps up to
 * `lastUsedStep` are refused: a code works once, even inside its 30 seconds.
 */
export function matchTotp(
  secretBase32: string,
  code: string,
  timeMs: number,
  lastUsedStep: number | null
): number | null {
  const typed = normalizeTotpCode(code);
  if (!/^\d{6}$/.test(typed)) return null;
  const secret = base32Decode(secretBase32);
  if (!secret || secret.length === 0) return null;
  const current = totpStep(timeMs);
  let matched: number | null = null;
  // Every candidate is compared (constant work), the newest match wins.
  for (let step = current - TOTP_WINDOW; step <= current + TOTP_WINDOW; step++) {
    const expected = Buffer.from(hotp(secret, step));
    if (timingSafeEqual(expected, Buffer.from(typed))) matched = step;
  }
  if (matched === null || (lastUsedStep !== null && matched <= lastUsedStep)) return null;
  return matched;
}

/** otpauth:// link of the QR code (Key URI Format used by Google Authenticator). */
export function otpauthUri(issuer: string, account: string, secretBase32: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ─── Recovery codes ──────────────────────────────────────────────────────────

export const RECOVERY_CODE_COUNT = 10;
/** No look-alike characters (0/o, 1/l/i). 12 characters: 60 bits each. */
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const RECOVERY_LENGTH = 12;

/** Printed in groups of four: `abcd-efgh-jkmn`. */
export function generateRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < RECOVERY_LENGTH; i++) {
    code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  }
  return code.match(/.{4}/g)!.join('-');
}

export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Stored form of a recovery code: SHA-256 salted with the user id. The codes are random
 * (60 bits), so a slow hash adds nothing; the salt keeps equal codes apart across users.
 */
export function hashRecoveryCode(userId: string, code: string): string {
  return createHash('sha256')
    .update(`${userId}:${normalizeRecoveryCode(code)}`)
    .digest('hex');
}
