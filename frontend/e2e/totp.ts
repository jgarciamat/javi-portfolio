import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of text.replace(/[\s=]/g, '').toUpperCase()) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/**
 * The 6-digit code an authenticator app shows (RFC 6238: HMAC-SHA1, 30-second steps), for the
 * step `stepsAhead` after the current one. The API accepts one step on each side of its clock and
 * refuses a step it already took, so the next one is always safe to use, whatever the second.
 */
export function totp(secret: string, stepsAhead = 0, now = Date.now()): string {
  const counter = Math.floor(now / 30_000) + stepsAhead;
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, '0');
}
