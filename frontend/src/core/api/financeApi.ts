import { API_BASE_URL } from '@core/config/api.config';
import type {
    Transaction,
    CreateTransactionDTO,
    Category,
    FinancialSummary,
    AnnualSummary,
    RecurringRule,
    CreateRecurringRuleDTO,
    UpdateRecurringRuleDTO,
} from '@shared/types/finance.types';

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem('mm_token');
    return token
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: authHeaders(),
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP error ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

export const transactionApi = {
    getAll(params?: { year?: number; month?: number }) {
        const query = new URLSearchParams(
            Object.entries(params ?? {})
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        ).toString();
        return request<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
    },

    create(dto: CreateTransactionDTO) {
        return request<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },

    delete(id: string) {
        return request<void>(`/transactions/${id}`, { method: 'DELETE' });
    },

    patch(id: string, changes: { notes?: string | null }) {
        return request<Transaction>(`/transactions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    },

    update(id: string, dto: Partial<CreateTransactionDTO>) {
        return request<Transaction>(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(dto),
        });
    },

    getSummary(params?: { year?: number; month?: number }) {
        const query = new URLSearchParams(
            Object.entries(params ?? {})
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        ).toString();
        return request<FinancialSummary>(`/transactions/summary${query ? `?${query}` : ''}`);
    },

    getAnnual(year: number) {
        return request<AnnualSummary>(`/transactions/annual/${year}`);
    },
};

export const categoryApi = {
    getAll() {
        return request<Category[]>('/categories');
    },
    create(dto: { name: string; color?: string; icon?: string }) {
        return request<Category>('/categories', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    delete(id: string) {
        return request<void>(`/categories/${id}`, { method: 'DELETE' });
    },
};

export const recurringApi = {
    getAll() {
        return request<RecurringRule[]>('/recurring-rules');
    },
    create(dto: CreateRecurringRuleDTO) {
        return request<RecurringRule>('/recurring-rules', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    update(id: string, dto: UpdateRecurringRuleDTO) {
        return request<RecurringRule>(`/recurring-rules/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(dto),
        });
    },
    delete(id: string, scope: 'none' | 'from_current' | 'all' = 'none') {
        return request<void>(`/recurring-rules/${id}?scope=${scope}`, { method: 'DELETE' });
    },
};
