
import { apiRequest } from '@core/api/authApi';
import type {
    Transaction,
    CreateTransactionDTO,
    Category,
    FinancialSummary,
    AnnualSummary,
    RecurringRule,
    CreateRecurringRuleDTO,
    UpdateRecurringRuleDTO,
    CustomAlert,
    CreateCustomAlertDTO,
    UpdateCustomAlertDTO,
} from '@modules/finances/domain/types';

export const transactionApi = {
    getAll(params?: { year?: number; month?: number }) {
        const query = new URLSearchParams(
            Object.entries(params ?? {})
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        ).toString();
        return apiRequest<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
    },

    create(dto: CreateTransactionDTO) {
        return apiRequest<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },

    delete(id: string) {
        return apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' });
    },

    patch(id: string, changes: { notes?: string | null }) {
        return apiRequest<Transaction>(`/transactions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    },

    update(id: string, dto: Partial<CreateTransactionDTO>) {
        return apiRequest<Transaction>(`/transactions/${id}`, {
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
        return apiRequest<FinancialSummary>(`/transactions/summary${query ? `?${query}` : ''}`);
    },

    getAnnual(year: number) {
        return apiRequest<AnnualSummary>(`/transactions/annual/${year}`);
    },
};

export const categoryApi = {
    getAll() {
        return apiRequest<Category[]>('/categories');
    },
    create(dto: { name: string; color?: string; icon?: string }) {
        return apiRequest<Category>('/categories', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    delete(id: string) {
        return apiRequest<void>(`/categories/${id}`, { method: 'DELETE' });
    },
};

export const recurringApi = {
    getAll() {
        return apiRequest<RecurringRule[]>('/recurring-rules');
    },
    create(dto: CreateRecurringRuleDTO) {
        return apiRequest<RecurringRule>('/recurring-rules', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    update(id: string, dto: UpdateRecurringRuleDTO) {
        return apiRequest<RecurringRule>(`/recurring-rules/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(dto),
        });
    },
    delete(id: string, scope: 'none' | 'from_current' | 'all' = 'none') {
        return apiRequest<void>(`/recurring-rules/${id}?scope=${scope}`, { method: 'DELETE' });
    },
};

export const customAlertApi = {
    getAll() {
        return apiRequest<CustomAlert[]>('/custom-alerts');
    },
    create(dto: CreateCustomAlertDTO) {
        return apiRequest<CustomAlert>('/custom-alerts', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
    update(id: string, dto: UpdateCustomAlertDTO) {
        return apiRequest<CustomAlert>(`/custom-alerts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(dto),
        });
    },
    delete(id: string) {
        return apiRequest<void>(`/custom-alerts/${id}`, { method: 'DELETE' });
    },
};
