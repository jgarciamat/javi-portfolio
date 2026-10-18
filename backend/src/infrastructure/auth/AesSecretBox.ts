import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';
import { SecretBox } from '@domain/ports/two-factor';

const VERSION = 'v1';
const IV_BYTES = 12;

/**
 * AES-256-GCM with a key derived (HKDF-SHA256) from the configured key material, so
 * the same material can serve other purposes without reusing the key. Output:
 * `v1.<iv>.<tag>.<ciphertext>` in base64url.
 */
export class AesSecretBox implements SecretBox {
  private readonly key: Buffer;

  constructor(keyMaterial: string, purpose: string) {
    this.key = Buffer.from(hkdfSync('sha256', keyMaterial, 'finanverso', purpose, 32));
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv, tag, data]
      .map((p) => (typeof p === 'string' ? p : p.toString('base64url')))
      .join('.');
  }

  decrypt(sealed: string): string | null {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || data === undefined) return null;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }
}
