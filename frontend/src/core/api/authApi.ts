import { clearReferral, pendingReferral } from '@core/referral';
import type { AuthResult, RegisterResult } from '@modules/auth/domain/types';
import type { Locale } from '@core/i18n/I18nContext';
import { apiRequest, jsonBody, publicRequest } from './http';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async register(dto: { email: string; password: string; name: string; locale?: Locale }) {
    const result = await publicRequest<RegisterResult>('/auth/register', {
      method: 'POST',
      body: jsonBody({ ...dto, referralCode: pendingReferral() }),
    });
    clearReferral();
    return result;
  },
  login(dto: { email: string; password: string }) {
    return publicRequest<AuthResult>('/auth/login', { method: 'POST', body: jsonBody(dto) });
  },
  /** Google access token (custom button) or ID token: the API verifies its audience. */
  googleLogin(token: string, locale?: Locale) {
    return publicRequest<AuthResult>('/auth/google', {
      method: 'POST',
      body: jsonBody({ token, locale }),
    });
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
  deleteAccount() {
    return apiRequest<void>('/profile/account', { method: 'DELETE' });
  },
};
