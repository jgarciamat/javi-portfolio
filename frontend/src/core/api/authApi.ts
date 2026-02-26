import { API_BASE_URL } from '@core/config/api.config';
import type { AuthResult, MonthlyBudget } from '@shared/types/auth.types';
import type { RegisterResult } from '@modules/auth/domain/types';

function getToken(): string | null {
    return localStorage.getItem('mm_token');
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: authHeaders(),
        ...options,
    });
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
        throw new Error(body?.error ?? `HTTP ${res.status}`);
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
    verifyEmail(token: string) {
        return publicRequest<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    },
};

export const budgetApi = {
    get(year: number, month: number) {
        return request<MonthlyBudget>(`/budget/${year}/${month}`);
    },
    set(year: number, month: number, initialAmount: number) {
        return request<MonthlyBudget>(`/budget/${year}/${month}`, {
            method: 'PUT',
            body: JSON.stringify({ initialAmount }),
        });
    },
    history() {
        return request<MonthlyBudget[]>('/budget/history');
    },
    getCarryover(year: number, month: number) {
        return request<{ carryover: number; year: number; month: number }>(
            `/budget/carryover/${year}/${month}`
        );
    },
};
