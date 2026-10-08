/**
 * Tests for core/api/http.ts (request helpers, token refresh) and authApi.
 * fetch is mocked; api.config is stubbed via moduleNameMapper → src/__mocks__/api.config.ts
 */

import { authApi } from '@core/api/authApi';
import {
  ApiError,
  apiRequest,
  errorCode,
  isAccessTokenExpired,
  refreshAccessToken,
  registerSessionExpiredHandler,
  tokenStore,
} from '@core/api/http';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const API = 'http://localhost:3000/api';

function jwt(expSecondsFromNow: number): string {
  const payload = btoa(
    JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })
  );
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
}

const VALID = jwt(3600);
const EXPIRED = jwt(-60);

function makeResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(body) };
}

function headersOf(call: number): Record<string, string> {
  return (mockFetch.mock.calls[call][1] as RequestInit).headers as Record<string, string>;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  registerSessionExpiredHandler(null);
});

describe('public auth endpoints', () => {
  test('register sends the locale and never an Authorization header', async () => {
    tokenStore.setSession(VALID, 'r');
    mockFetch.mockResolvedValueOnce(makeResponse({ message: 'ok' }, 201));
    await authApi.register({ email: 'a@b.co', password: 'pw', name: 'A', locale: 'en' });
    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/auth/register`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      email: 'a@b.co',
      password: 'pw',
      name: 'A',
      locale: 'en',
    });
    expect(headersOf(0).Authorization).toBeUndefined();
  });

  test('login returns the tokens', async () => {
    const result = {
      accessToken: VALID,
      refreshToken: 'r',
      user: { id: 'u1', email: 'a@b', name: 'A' },
    };
    mockFetch.mockResolvedValueOnce(makeResponse(result));
    await expect(authApi.login({ email: 'a@b', password: 'pw' })).resolves.toEqual(result);
  });

  test('errors carry status, code and details', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        { error: 'Debes verificar tu email', code: 'EMAIL_NOT_VERIFIED', details: { x: 1 } },
        403
      )
    );
    const error = await authApi.login({ email: 'a@b', password: 'pw' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED', details: { x: 1 } });
    expect(errorCode(error)).toBe('EMAIL_NOT_VERIFIED');
    expect(errorCode(new Error('x'))).toBeUndefined();
  });

  test('falls back to the HTTP status when the error body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: jest.fn().mockRejectedValue(new Error()),
    });
    await expect(authApi.requestPasswordReset('a@b')).rejects.toThrow('HTTP 502');
  });

  test.each([
    ['verifyEmail', () => authApi.verifyEmail('t k'), `${API}/auth/verify-email?token=t%20k`],
    [
      'resendVerification',
      () => authApi.resendVerification('a@b', 'es'),
      `${API}/auth/resend-verification`,
    ],
    [
      'requestPasswordReset',
      () => authApi.requestPasswordReset('a@b', 'en'),
      `${API}/auth/forgot-password`,
    ],
    [
      'resetPassword',
      () => authApi.resetPassword('tok', 'New-pass1!'),
      `${API}/auth/reset-password`,
    ],
    ['googleLogin', () => authApi.googleLogin('google-token', 'es'), `${API}/auth/google`],
    ['logout', () => authApi.logout('refresh'), `${API}/auth/logout`],
  ])('%s calls the right endpoint', async (_name, call, url) => {
    mockFetch.mockResolvedValueOnce(makeResponse({ message: 'ok' }));
    await call();
    expect(mockFetch.mock.calls[0][0]).toBe(url);
  });

  test('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
    await expect(authApi.logout('r')).resolves.toBeUndefined();
  });
});

describe('apiRequest', () => {
  test('sends the stored access token', async () => {
    tokenStore.setSession(VALID, 'r');
    mockFetch.mockResolvedValueOnce(makeResponse({ ok: true }));
    await apiRequest('/categories');
    expect(headersOf(0).Authorization).toBe(`Bearer ${VALID}`);
  });

  test('refreshes an expired access token before the request', async () => {
    tokenStore.setSession(EXPIRED, 'refresh-1');
    mockFetch
      .mockResolvedValueOnce(makeResponse({ accessToken: VALID }))
      .mockResolvedValueOnce(makeResponse([]));
    await apiRequest('/categories');
    expect(mockFetch.mock.calls[0][0]).toBe(`${API}/auth/refresh`);
    expect(headersOf(1).Authorization).toBe(`Bearer ${VALID}`);
    expect(tokenStore.getAccess()).toBe(VALID);
  });

  test('retries once with a refreshed token after a 401', async () => {
    tokenStore.setSession(VALID, 'refresh-1');
    const fresh = jwt(7200);
    mockFetch
      .mockResolvedValueOnce(makeResponse({ error: 'expired' }, 401))
      .mockResolvedValueOnce(makeResponse({ accessToken: fresh }))
      .mockResolvedValueOnce(makeResponse({ data: 1 }));
    await expect(apiRequest('/x')).resolves.toEqual({ data: 1 });
    expect(headersOf(2).Authorization).toBe(`Bearer ${fresh}`);
  });

  test('ends the session only when the refresh token is rejected', async () => {
    const onExpired = jest.fn();
    registerSessionExpiredHandler(onExpired);
    tokenStore.setSession(VALID, 'refresh-1');
    mockFetch
      .mockResolvedValueOnce(makeResponse({}, 401))
      .mockResolvedValueOnce(makeResponse({ code: 'SESSION_EXPIRED' }, 401));
    const error = await apiRequest('/x').catch((e) => e);
    expect(error).toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.getRefresh()).toBeNull();
  });

  test('does NOT log the user out when the retried request fails with another error (old bug)', async () => {
    const onExpired = jest.fn();
    registerSessionExpiredHandler(onExpired);
    tokenStore.setSession(VALID, 'refresh-1');
    mockFetch
      .mockResolvedValueOnce(makeResponse({}, 401))
      .mockResolvedValueOnce(makeResponse({ accessToken: jwt(7200) }))
      .mockResolvedValueOnce(
        makeResponse({ error: 'Saldo insuficiente', code: 'INSUFFICIENT_BALANCE' }, 400)
      );
    await expect(apiRequest('/transactions', { method: 'POST' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
    expect(onExpired).not.toHaveBeenCalled();
    expect(tokenStore.getRefresh()).toBe('refresh-1');
  });

  test('keeps the session when refreshing fails because of the network', async () => {
    tokenStore.setSession(EXPIRED, 'refresh-1');
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(tokenStore.getRefresh()).toBe('refresh-1');
  });

  test('parallel requests share a single refresh call', async () => {
    tokenStore.setSession(EXPIRED, 'refresh-1');
    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/auth/refresh')) {
        return new Promise((r) => {
          resolveRefresh = () => r(makeResponse({ accessToken: VALID }));
        });
      }
      return Promise.resolve(makeResponse({}));
    });
    const calls = [apiRequest('/a'), apiRequest('/b'), apiRequest('/c')];
    await Promise.resolve();
    resolveRefresh(undefined);
    await Promise.all(calls);
    expect(
      mockFetch.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))
    ).toHaveLength(1);
  });
});

describe('authenticated profile endpoints', () => {
  beforeEach(() => tokenStore.setSession(VALID, 'r'));

  test('updatePassword returns the new tokens', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ message: 'ok', accessToken: 'a2', refreshToken: 'r2' })
    );
    await expect(authApi.updatePassword(undefined, 'New-pass1!')).resolves.toMatchObject({
      refreshToken: 'r2',
    });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ newPassword: 'New-pass1!' });
  });

  test.each([
    ['deleteAccount', () => authApi.deleteAccount(), `${API}/profile/account`, 'DELETE'],
    ['logoutEverywhere', () => authApi.logoutEverywhere(), `${API}/auth/logout-all`, 'POST'],
    ['updateName', () => authApi.updateName('Ana'), `${API}/profile/name`, 'PATCH'],
    ['updateAvatar', () => authApi.updateAvatar(null), `${API}/profile/avatar`, 'PATCH'],
  ])('%s', async (_name, call, url, method) => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
    await call();
    expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining({ method }));
    expect(headersOf(0).Authorization).toBe(`Bearer ${VALID}`);
  });
});

describe('isAccessTokenExpired', () => {
  test('reads the exp claim with a safety margin', () => {
    expect(isAccessTokenExpired(VALID)).toBe(false);
    expect(isAccessTokenExpired(EXPIRED)).toBe(true);
    expect(isAccessTokenExpired(jwt(10))).toBe(true);
    expect(isAccessTokenExpired('garbage')).toBe(true);
    expect(isAccessTokenExpired(null)).toBe(true);
  });
});
