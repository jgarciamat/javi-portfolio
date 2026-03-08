import { apiRequest } from '@core/api/authApi';

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
        return apiRequest<AlertsResponse>(`/alerts/budget/${year}/${month}`);
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
    getAdvice(year: number, month: number, locale: string): Promise<AIAdvice> {
        return apiRequest<AIAdvice>('/ai/advice', {
            method: 'POST',
            body: JSON.stringify({ year, month, locale }),
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
        return apiRequest<{ institutions: BankInstitution[] }>(`/open-banking/institutions?country=${country}`);
    },

    linkAccount(institutionId: string, redirectUrl: string): Promise<{ link: string; requisitionId: string }> {
        return apiRequest<{ link: string; requisitionId: string }>('/open-banking/link', {
            method: 'POST',
            body: JSON.stringify({ institutionId, redirectUrl }),
        });
    },

    getLinkedAccounts(requisitionId: string): Promise<{ accounts: LinkedAccount[] }> {
        return apiRequest<{ accounts: LinkedAccount[] }>(`/open-banking/accounts?requisitionId=${requisitionId}`);
    },

    syncTransactions(accountId: string, dateFrom?: string, dateTo?: string): Promise<SyncResult> {
        return apiRequest<SyncResult>('/open-banking/sync', {
            method: 'POST',
            body: JSON.stringify({ accountId, dateFrom, dateTo }),
        });
    },

    unlinkAccount(accountId: string): Promise<{ message: string }> {
        return apiRequest<{ message: string }>(`/open-banking/accounts/${accountId}`, { method: 'DELETE' });
    },
};
