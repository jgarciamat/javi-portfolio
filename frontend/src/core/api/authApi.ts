import { clearReferral, pendingReferral } from '@core/referral';
import type {
  AuthResult,
  RegisterResult,
  SignInResult,
  TwoFactorProof,
  TwoFactorSetup,
  TwoFactorStatus,
} from '@modules/auth/domain/types';
import type { Locale } from '@core/i18n/I18nContext';
import { apiRequest, jsonBody, publicRequest } from './http';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeleteAccountProof {
  password?: string;
  /** Fresh Google credential, for accounts without a password. */
  googleToken?: string;
  /** The user says the Google Play subscription is already cancelled. */
  confirmPlayCancelled?: boolean;
}

export const authApi = {
  /** Tells the server, anonymously, where a new user came from (it ignores old accounts). */
  acquisition(source: string) {
    return apiRequest<void>('/acquisition', { method: 'POST', body: jsonBody({ source }) });
  },
  async register(dto: { email: string; password: string; name: string; locale?: Locale }) {
    const result = await publicRequest<RegisterResult>('/auth/register', {
      method: 'POST',
      body: jsonBody({ ...dto, referralCode: pendingReferral() }),
    });
    clearReferral();
    return result;
  },
  login(dto: { email: string; password: string }) {
    return publicRequest<SignInResult>('/auth/login', { method: 'POST', body: jsonBody(dto) });
  },
  /** Second step of a sign-in with 2FA: a code of the app or a recovery code. */
  verifyTwoFactor(challengeToken: string, code: string) {
    return publicRequest<AuthResult>('/auth/2fa/verify', {
      method: 'POST',
      body: jsonBody({ challengeToken, code }),
    });
  },
  twoFactorStatus() {
    return apiRequest<TwoFactorStatus>('/auth/2fa');
  },
  /** Needs the password (or, for Google-only accounts, a recent Google sign-in). */
  twoFactorSetup(proof: { password?: string; googleToken?: string }) {
    return apiRequest<TwoFactorSetup>('/auth/2fa/setup', {
      method: 'POST',
      body: jsonBody(proof),
    });
  },
  /** The recovery codes are returned only this once. */
  twoFactorEnable(code: string) {
    return apiRequest<{ recoveryCodes: string[] }>('/auth/2fa/enable', {
      method: 'POST',
      body: jsonBody({ code }),
    });
  },
  twoFactorDisable(proof: TwoFactorProof) {
    return apiRequest<void>('/auth/2fa/disable', { method: 'POST', body: jsonBody(proof) });
  },
  twoFactorRecoveryCodes(proof: TwoFactorProof) {
    return apiRequest<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', {
      method: 'POST',
      body: jsonBody(proof),
    });
  },
  /** Google access token (custom button) or ID token: the API verifies its audience. */
  async googleLogin(token: string, locale?: Locale) {
    const result = await publicRequest<SignInResult>('/auth/google', {
      method: 'POST',
      body: jsonBody({ token, locale, referralCode: pendingReferral() }),
    });
    clearReferral();
    return result;
  },
  logout(refreshToken: string) {
    return publicRequest<void>('/auth/logout', {
      method: 'POST',
      body: jsonBody({ refreshToken }),
    });
  },
  logoutEverywhere() {
    return apiRequest<void>('/auth/logout-all', { method: 'POST' });
  },
  verifyEmail(token: string) {
    return publicRequest<{ message: string }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`
    );
  },
  resendVerification(email: string, locale?: Locale) {
    return publicRequest<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: jsonBody({ email, locale }),
    });
  },
  requestPasswordReset(email: string, locale?: Locale) {
    return publicRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: jsonBody({ email, locale }),
    });
  },
  resetPassword(token: string, newPassword: string) {
    return publicRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: jsonBody({ token, newPassword }),
    });
  },
  updateName(name: string) {
    return apiRequest<{ name: string }>('/profile/name', {
      method: 'PATCH',
      body: jsonBody({ name }),
    });
  },
  /** Returns fresh tokens: every other session is closed by the API. */
  updatePassword(currentPassword: string | undefined, newPassword: string) {
    return apiRequest<{ message: string } & SessionTokens>('/profile/password', {
      method: 'PATCH',
      body: jsonBody({ currentPassword, newPassword }),
    });
  },
  updateAvatar(avatarDataUrl: string | null) {
    return apiRequest<{ avatarUrl: string | null }>('/profile/avatar', {
      method: 'PATCH',
      body: jsonBody({ avatarDataUrl }),
    });
  },
  /** Needs the current password (or, for Google-only accounts, a recent Google sign-in). */
  deleteAccount(proof: DeleteAccountProof = {}) {
    return apiRequest<void>('/profile/account', { method: 'DELETE', body: jsonBody(proof) });
  },
};
