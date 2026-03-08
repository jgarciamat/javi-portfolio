import { API_BASE_URL } from '@core/config/api.config';
import type { AuthResult } from '@modules/auth/domain/types';
import type { MonthlyBudget } from '@modules/finances/domain/types';
import type { RegisterResult, RefreshResult } from '@modules/auth/domain/types';

export class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code?: string) {
        super(message);
        this.name = 'ApiError';
    }
}

function getToken(): string | null {
    return localStorage.getItem('mm_token');
}

function getRefreshToken(): string | null {
    return localStorage.getItem('mm_refresh_token');
}

function setToken(token: string): void {
    localStorage.setItem('mm_token', token);
}

function authHeaders(): Record<string, string> {
    const token = getToken();
    return token
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };
}

function publicHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
}

/** Attempt to get a new access token using the stored refresh token. */
async function tryRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: publicHeaders(),
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json() as RefreshResult;
        setToken(data.accessToken);
        return data.accessToken;
    } catch {
        return null;
    }
}

/** Callback registered by AuthProvider to force logout when refresh fails. */
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(handler: () => void): void {
    onUnauthorized = handler;
}

/**
 * Authenticated request with automatic 401 handling:
 * tries to refresh the access token once, then calls onUnauthorized (logout) if refresh also fails.
 * Exported so financeApi and premiumApi can share the same auth/refresh/logout logic.
 */
export async function apiRequest<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: authHeaders(),
        ...options,
    });

    // 401 handling: try refresh once, then force logout
    if (res.status === 401 && !isRetry) {
        const newToken = await tryRefresh();
        if (newToken) {
            // Retry original request with new access token
            const retryRes = await fetch(`${API_BASE_URL}${path}`, {
                headers: { ...authHeaders(), Authorization: `Bearer ${newToken}` },
                ...options,
            });
            if (retryRes.ok) {
                if (retryRes.status === 204) return undefined as T;
                return retryRes.json();
            }
        }
        // Refresh also failed — force logout
        onUnauthorized?.();
        throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

async function publicRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: publicHeaders(),
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body?.error ?? `HTTP ${res.status}`, res.status, body?.code);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export const authApi = {
    register(dto: { email: string; password: string; name: string }) {
        return publicRequest<RegisterResult>('/auth/register', { method: 'POST', body: JSON.stringify(dto) });
    },
    login(dto: { email: string; password: string }) {
        return publicRequest<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(dto) });
    },
    logout(refreshToken: string) {
        return apiRequest<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    },
    verifyEmail(token: string) {
        return publicRequest<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    },
    requestPasswordReset(email: string) {
        return publicRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    },
    resetPassword(token: string, newPassword: string) {
        return publicRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
    },
    updateName(name: string) {
        return apiRequest<{ name: string }>('/profile/name', { method: 'PATCH', body: JSON.stringify({ name }) });
    },
    updatePassword(currentPassword: string, newPassword: string) {
        return apiRequest<{ message: string }>('/profile/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
    },
    updateAvatar(avatarDataUrl: string) {
        return apiRequest<{ avatarUrl: string }>('/profile/avatar', { method: 'PATCH', body: JSON.stringify({ avatarDataUrl }) });
    },
};

export const budgetApi = {
    get(year: number, month: number) {
        return apiRequest<MonthlyBudget>(`/budget/${year}/${month}`);
    },
    set(year: number, month: number, initialAmount: number) {
        return apiRequest<MonthlyBudget>(`/budget/${year}/${month}`, {
            method: 'PUT',
            body: JSON.stringify({ initialAmount }),
        });
    },
    history() {
        return apiRequest<MonthlyBudget[]>('/budget/history');
    },
    getCarryover(year: number, month: number) {
        return apiRequest<{ carryover: number; year: number; month: number }>(
            `/budget/carryover/${year}/${month}`
        );
    },
};
