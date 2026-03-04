/**
 * OpenBankingService — Adapter for GoCardless (Nordigen) Open Banking API.
 *
 * In production, set these env vars:
 *   GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY
 *
 * When not configured, the service runs in DEMO mode and returns realistic
 * mock data so the feature is fully usable without a real bank connection.
 */

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
    institutionName: string;
    iban: string;
    currency: string;
    linkedAt: string;
    requisitionId: string;
}

export interface BankTransaction {
    transactionId: string;
    bookingDate: string;
    valueDate: string;
    amount: number;
    currency: string;
    creditorName?: string;
    debtorName?: string;
    remittanceInfo: string;
    type: 'income' | 'expense';
}

const NORDIGEN_BASE = 'https://bankaccountdata.gocardless.com/api/v2';

export class OpenBankingService {
    private readonly demoMode: boolean;
    private token: string | null = null;
    private tokenExpiry = 0;

    constructor() {
        this.demoMode = !process.env.GOCARDLESS_SECRET_ID || !process.env.GOCARDLESS_SECRET_KEY;
        if (this.demoMode) {
            console.warn('[OpenBanking] Running in DEMO mode — no real bank data');
        }
    }

    // ─── Token management ───────────────────────────────────────────────────

    private async getAccessToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiry) return this.token;

        const res = await fetch(`${NORDIGEN_BASE}/token/new/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                secret_id: process.env.GOCARDLESS_SECRET_ID,
                secret_key: process.env.GOCARDLESS_SECRET_KEY,
            }),
        });

        if (!res.ok) throw new Error(`GoCardless auth failed: ${res.status}`);
        const data = (await res.json()) as { access: string; access_expires: number };
        this.token = data.access;
        this.tokenExpiry = Date.now() + data.access_expires * 1000 - 60_000;
        return this.token;
    }

    private async authFetch<T>(path: string, options?: RequestInit): Promise<T> {
        const token = await this.getAccessToken();
        const res = await fetch(`${NORDIGEN_BASE}${path}`, {
            ...options,
            headers: {
                ...(options?.headers ?? {}),
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) throw new Error(`GoCardless error ${res.status}: ${await res.text()}`);
        return res.json() as Promise<T>;
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    async listInstitutions(country = 'ES'): Promise<BankInstitution[]> {
        if (this.demoMode) return DEMO_INSTITUTIONS;

        const data = await this.authFetch<{
            id: string; name: string; bic: string; logo: string; countries: string[];
        }[]>(`/institutions/?country=${country}`);

        return data.map((i) => ({
            id: i.id,
            name: i.name,
            bic: i.bic,
            logo: i.logo,
            countries: i.countries,
        }));
    }

    async createRequisition(institutionId: string, redirectUrl: string): Promise<{ link: string; requisitionId: string }> {
        if (this.demoMode) {
            return {
                requisitionId: `demo-req-${Date.now()}`,
                link: `${redirectUrl}?demo=true&institution=${institutionId}`,
            };
        }

        const data = await this.authFetch<{ id: string; link: string }>('/requisitions/', {
            method: 'POST',
            body: JSON.stringify({
                redirect: redirectUrl,
                institution_id: institutionId,
                reference: `ref-${Date.now()}`,
                user_language: 'ES',
            }),
        });

        return { requisitionId: data.id, link: data.link };
    }

    async getRequisitionAccounts(requisitionId: string): Promise<string[]> {
        if (this.demoMode) return ['demo-account-001'];

        const data = await this.authFetch<{ accounts: string[] }>(`/requisitions/${requisitionId}/`);
        return data.accounts;
    }

    async getAccountDetails(accountId: string): Promise<{ iban: string; currency: string; institutionId: string }> {
        if (this.demoMode) {
            return { iban: 'ES12 3456 7890 1234 5678 9012', currency: 'EUR', institutionId: 'DEMO_BANK' };
        }

        const data = await this.authFetch<{
            account: { iban: string; currency: string; institution_id: string };
        }>(`/accounts/${accountId}/details/`);

        return {
            iban: data.account.iban,
            currency: data.account.currency,
            institutionId: data.account.institution_id,
        };
    }

    async getTransactions(accountId: string, dateFrom?: string, dateTo?: string): Promise<BankTransaction[]> {
        if (this.demoMode) return generateDemoTransactions();

        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);

        const data = await this.authFetch<{
            transactions: {
                booked: {
                    transactionId: string;
                    bookingDate: string;
                    valueDate: string;
                    transactionAmount: { amount: string; currency: string };
                    creditorName?: string;
                    debtorName?: string;
                    remittanceInformationUnstructured?: string;
                }[];
            };
        }>(`/accounts/${accountId}/transactions/?${params}`);

        return data.transactions.booked.map((tx) => {
            const amount = parseFloat(tx.transactionAmount.amount);
            return {
                transactionId: tx.transactionId,
                bookingDate: tx.bookingDate,
                valueDate: tx.valueDate ?? tx.bookingDate,
                amount: Math.abs(amount),
                currency: tx.transactionAmount.currency,
                creditorName: tx.creditorName,
                debtorName: tx.debtorName,
                remittanceInfo: tx.remittanceInformationUnstructured ?? '',
                type: amount >= 0 ? 'income' : 'expense',
            };
        });
    }
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const DEMO_INSTITUTIONS: BankInstitution[] = [
    { id: 'SANDBOX_FINTECH_BBMD', name: 'BBVA (Demo)', bic: 'BBVAESMMXXX', logo: 'https://cdn.gocardless.com/bank-logos/BBVA.png', countries: ['ES'] },
    { id: 'SANDBOX_FINTECH_CAXE', name: 'CaixaBank (Demo)', bic: 'CAIXESBBXXX', logo: 'https://cdn.gocardless.com/bank-logos/CaixaBank.png', countries: ['ES'] },
    { id: 'SANDBOX_FINTECH_SAEN', name: 'Santander (Demo)', bic: 'BSCHESMM', logo: 'https://cdn.gocardless.com/bank-logos/Santander.png', countries: ['ES'] },
    { id: 'SANDBOX_FINTECH_BNPP', name: 'ING (Demo)', bic: 'INGDESDB', logo: 'https://cdn.gocardless.com/bank-logos/ING.png', countries: ['ES'] },
];

function generateDemoTransactions(): BankTransaction[] {
    const now = new Date();
    return [
        { transactionId: 't1', bookingDate: fmt(now, -1), valueDate: fmt(now, -1), amount: 1800, currency: 'EUR', debtorName: 'Empresa S.L.', remittanceInfo: 'Nómina marzo', type: 'income' },
        { transactionId: 't2', bookingDate: fmt(now, -2), valueDate: fmt(now, -2), amount: 850, currency: 'EUR', creditorName: 'Arrendador', remittanceInfo: 'Alquiler marzo', type: 'expense' },
        { transactionId: 't3', bookingDate: fmt(now, -3), valueDate: fmt(now, -3), amount: 65.40, currency: 'EUR', creditorName: 'Mercadona', remittanceInfo: 'Compra supermercado', type: 'expense' },
        { transactionId: 't4', bookingDate: fmt(now, -4), valueDate: fmt(now, -4), amount: 12.99, currency: 'EUR', creditorName: 'Netflix', remittanceInfo: 'Suscripción Netflix', type: 'expense' },
        { transactionId: 't5', bookingDate: fmt(now, -5), valueDate: fmt(now, -5), amount: 45.00, currency: 'EUR', creditorName: 'Repsol', remittanceInfo: 'Gasolina', type: 'expense' },
        { transactionId: 't6', bookingDate: fmt(now, -7), valueDate: fmt(now, -7), amount: 200, currency: 'EUR', debtorName: 'Juan García', remittanceInfo: 'Transferencia recibida', type: 'income' },
    ];
}

function fmt(date: Date, daysOffset: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
}
