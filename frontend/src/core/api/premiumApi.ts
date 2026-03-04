import { API_BASE_URL } from '@core/config/api.config';

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
    return res.json();
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertLevel = 'warning' | 'danger';

export interface BudgetAlert {
    level: AlertLevel;
    category: string | null;
    spentAmount: number;
    budgetAmount: number;
    percentage: number;
    message: string;
}

export interface AlertsResponse {
    alerts: BudgetAlert[];
    year: number;
    month: number;
}

export const alertApi = {
    getBudgetAlerts(year: number, month: number): Promise<AlertsResponse> {
        return request<AlertsResponse>(`/alerts/budget/${year}/${month}`);
    },
};

// ─── AI Advisor ───────────────────────────────────────────────────────────────

export interface AIAdvice {
    summary: string;
    tips: string[];
    positives: string[];
    warnings: string[];
}

export const aiApi = {
    getAdvice(year: number, month: number): Promise<AIAdvice> {
        return request<AIAdvice>('/ai/advice', {
            method: 'POST',
            body: JSON.stringify({ year, month }),
        });
    },
};

// ─── Open Banking ─────────────────────────────────────────────────────────────

export interface BankInstitution {
    id: string;
    name: string;
    bic: string;
    logo: string;
    countries: string[];
}

export interface LinkedAccount {
    accountId: string;
    institutionId: string;
    iban: string;
    currency: string;
}

export interface SyncResult {
    synced: number;
    skipped: number;
    transactions: { description: string; amount: number; type: string; category: string; date: string }[];
}

export const openBankingApi = {
    listInstitutions(country = 'ES'): Promise<{ institutions: BankInstitution[] }> {
        return request<{ institutions: BankInstitution[] }>(`/open-banking/institutions?country=${country}`);
    },

    linkAccount(institutionId: string, redirectUrl: string): Promise<{ link: string; requisitionId: string }> {
        return request<{ link: string; requisitionId: string }>('/open-banking/link', {
            method: 'POST',
            body: JSON.stringify({ institutionId, redirectUrl }),
        });
    },

    getLinkedAccounts(requisitionId: string): Promise<{ accounts: LinkedAccount[] }> {
        return request<{ accounts: LinkedAccount[] }>(`/open-banking/accounts?requisitionId=${requisitionId}`);
    },

    syncTransactions(accountId: string, dateFrom?: string, dateTo?: string): Promise<SyncResult> {
        return request<SyncResult>('/open-banking/sync', {
            method: 'POST',
            body: JSON.stringify({ accountId, dateFrom, dateTo }),
        });
    },

    unlinkAccount(accountId: string): Promise<{ message: string }> {
        return request<{ message: string }>(`/open-banking/accounts/${accountId}`, { method: 'DELETE' });
    },
};
