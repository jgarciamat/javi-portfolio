import { API_BASE_URL } from '@core/config/api.config';
import { storage } from '@shared/utils/storage';
import { apiErrorMessage } from './errorMessages';

/** Error returned by the API: carries the HTTP status and the stable error `code`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

// ─── Token storage ───────────────────────────────────────────────────────────

const ACCESS_KEY = 'mm_token';
const REFRESH_KEY = 'mm_refresh_token';

export const tokenStore = {
  getAccess: (): string | null => storage.get(ACCESS_KEY),
  getRefresh: (): string | null => storage.get(REFRESH_KEY),
  setAccess: (token: string): void => storage.set(ACCESS_KEY, token),
  setSession: (accessToken: string, refreshToken: string): void => {
    storage.set(ACCESS_KEY, accessToken);
    storage.set(REFRESH_KEY, refreshToken);
  },
  clear: (): void => {
    storage.set(ACCESS_KEY, null);
    storage.set(REFRESH_KEY, null);
  },
};

/** Reads the `exp` claim without verifying the signature (client-side hint only). */
export function isAccessTokenExpired(token: string | null, skewSeconds = 30): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

// ─── Session expiry callback ─────────────────────────────────────────────────

let onSessionExpired: (() => void) | null = null;

/** Registered by AuthProvider: called once the session cannot be renewed. */
export function registerSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

// ─── Paywall callback ────────────────────────────────────────────────────────

let onPaymentRequired: ((error: ApiError) => void) | null = null;

/**
 * Registered by PlanProvider: called on every 402 (Premium feature or free-plan
 * limit) so the upgrade dialog opens wherever the request was made. The error is
 * still thrown to the caller.
 */
export function registerPaymentRequiredHandler(handler: ((error: ApiError) => void) | null): void {
  onPaymentRequired = handler;
}

// ─── Refresh (single flight) ─────────────────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Gets a new access token with the refresh token. Concurrent callers share the
 * same request, so ten parallel 401s produce one refresh, not ten.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return Promise.resolve(null);
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // Only a rejected token ends the session; network/5xx errors keep it.
        if (res.status === 401) tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as { accessToken: string };
      tokenStore.setAccess(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ─── Requests ────────────────────────────────────────────────────────────────

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  const message = apiErrorMessage(body.code, body.error, body.details);
  return new ApiError(message, res.status, body.code, body.details);
}

/** `fetch` to the API; a network failure becomes an ApiError like any other. */
async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(apiErrorMessage('NETWORK_ERROR'), 0, 'NETWORK_ERROR');
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const type = res.headers?.get?.('content-type') ?? 'application/json';
  return (type.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

function buildInit(options: RequestInit | undefined, token: string | null): RequestInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } };
}

/**
 * Authenticated request. On 401 it refreshes the access token once and retries;
 * the session only ends when the refresh token itself is rejected. Any other
 * error (400, 404, 500…) is thrown as an ApiError and never logs the user out.
 */
export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  let token = tokenStore.getAccess();
  if (isAccessTokenExpired(token) && tokenStore.getRefresh()) {
    token = (await refreshAccessToken()) ?? token;
  }
  let res = await send(path, buildInit(options, token));
  if (res.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) res = await send(path, buildInit(options, renewed));
    if (res.status === 401) {
      tokenStore.clear();
      onSessionExpired?.();
      throw new ApiError(apiErrorMessage('SESSION_EXPIRED'), 401, 'SESSION_EXPIRED');
    }
  }
  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 402) onPaymentRequired?.(error);
    throw error;
  }
  return parse<T>(res);
}

/** Request to a public endpoint (no token, no refresh). */
export async function publicRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await send(path, buildInit(options, null));
  if (!res.ok) throw await toApiError(res);
  return parse<T>(res);
}

export function jsonBody(body: unknown): string {
  return JSON.stringify(body);
}

export function query(
  params: Record<string, string | number | boolean | undefined | null | string[]>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
