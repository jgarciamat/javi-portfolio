/** Two-factor authentication (TOTP) of one user: pending while `enabledAt` is null. */
export interface TwoFactorRecord {
  userId: string;
  /** The TOTP secret, encrypted (SecretBox): never stored in clear. */
  secretEncrypted: string;
  createdAt: string;
  enabledAt: string | null;
  /** Last TOTP step accepted: a code is never accepted twice. */
  lastUsedStep: number | null;
  /** Wrong codes in a row; reaching the limit locks the second step for a while. */
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface TwoFactorChallengeRecord {
  /** SHA-256 of the token handed to the client after the password (or Google) step. */
  tokenHash: string;
  userId: string;
  expiresAt: string;
  attempts: number;
}

export interface TwoFactorRepository {
  find(userId: string): TwoFactorRecord | null;
  save(record: TwoFactorRecord): void;
  /** Turns 2FA off: the secret, the recovery codes and the open challenges go. */
  delete(userId: string): void;

  /** Replaces every recovery code of the user (stored hashed). */
  replaceRecoveryCodes(userId: string, codeHashes: string[]): void;
  /** Marks the code used; false when it does not exist or was already used. */
  useRecoveryCode(userId: string, codeHash: string, at: string): boolean;
  remainingRecoveryCodes(userId: string): number;

  saveChallenge(record: TwoFactorChallengeRecord): void;
  findChallenge(tokenHash: string): TwoFactorChallengeRecord | null;
  countChallengeAttempt(tokenHash: string): void;
  deleteChallenge(tokenHash: string): void;
  deleteExpiredChallenges(now: string): void;
}

/** Symmetric encryption for secrets kept at rest (authenticated: tampering is detected). */
export interface SecretBox {
  encrypt(plain: string): string;
  /** Null when the value cannot be decrypted (other key, corrupted). */
  decrypt(sealed: string): string | null;
}
