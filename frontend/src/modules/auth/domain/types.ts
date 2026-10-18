// ─── Auth domain types ────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  /** False for accounts that only sign in with Google. */
  hasPassword?: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterResult {
  message: string;
}

/** With two-step verification on, the password (or Google) step answers this instead. */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeToken: string;
  expiresAt: string;
}

export type SignInResult = AuthResult | TwoFactorChallenge;

export function isTwoFactorChallenge(result: SignInResult): result is TwoFactorChallenge {
  return 'twoFactorRequired' in result && result.twoFactorRequired === true;
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetup {
  /** Base32 key, for typing it into the app by hand. */
  secret: string;
  /** otpauth:// link shown as a QR code. */
  otpauthUri: string;
}

/** Proof asked before turning 2FA off or renewing the recovery codes. */
export interface TwoFactorProof {
  password?: string;
  /** A code of the app or a recovery code. */
  code?: string;
}
