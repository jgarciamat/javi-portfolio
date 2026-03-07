/**
 * OpenBankingService tests.
 * Tests demo mode (no GOCARDLESS env vars) and real API mode (mocked fetch).
 */

// Ensure no GoCardless credentials are set (demo mode)
delete process.env.GOCARDLESS_SECRET_ID;
delete process.env.GOCARDLESS_SECRET_KEY;

import { OpenBankingService, BankInstitution, BankTransaction } from '@infrastructure/openbanking/OpenBankingService';

describe('OpenBankingService — demo mode', () => {
    let service: OpenBankingService;

    beforeEach(() => {
        // No env vars → demoMode = true
        delete process.env.GOCARDLESS_SECRET_ID;
        delete process.env.GOCARDLESS_SECRET_KEY;
        service = new OpenBankingService();
    });

    describe('listInstitutions', () => {
        it('returns demo institutions', async () => {
            const result = await service.listInstitutions('ES');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
            const first = result[0] as BankInstitution;
            expect(first).toHaveProperty('id');
            expect(first).toHaveProperty('name');
            expect(first).toHaveProperty('bic');
        });

        it('defaults to ES when no country param', async () => {
            const result = await service.listInstitutions();
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('createRequisition', () => {
        it('returns demo requisition with link containing the redirectUrl', async () => {
            const result = await service.createRequisition('BBVA', 'https://app.com/callback');
            expect(result.requisitionId).toContain('demo-req-');
            expect(result.link).toContain('https://app.com/callback');
            expect(result.link).toContain('BBVA');
        });
    });

    describe('getRequisitionAccounts', () => {
        it('returns demo account id', async () => {
            const result = await service.getRequisitionAccounts('req-123');
            expect(result).toEqual(['demo-account-001']);
        });
    });

    describe('getAccountDetails', () => {
        it('returns demo account details with IBAN and currency', async () => {
            const result = await service.getAccountDetails('acc-001');
            expect(result).toHaveProperty('iban');
            expect(result).toHaveProperty('currency', 'EUR');
            expect(result).toHaveProperty('institutionId');
        });
    });

    describe('getTransactions', () => {
        it('returns demo transactions array with at least one transaction', async () => {
            const result = await service.getTransactions('acc-001');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('each transaction has required fields', async () => {
            const result = await service.getTransactions('acc-001') as BankTransaction[];
            const tx = result[0];
            expect(tx).toHaveProperty('transactionId');
            expect(tx).toHaveProperty('bookingDate');
            expect(tx).toHaveProperty('amount');
            expect(tx).toHaveProperty('currency');
            expect(tx).toHaveProperty('remittanceInfo');
            expect(['income', 'expense']).toContain(tx.type);
        });

        it('accepts optional dateFrom and dateTo', async () => {
            const result = await service.getTransactions('acc-001', '2025-01-01', '2025-03-31');
            expect(result.length).toBeGreaterThan(0);
        });
    });
});

describe('OpenBankingService — live mode (mocked fetch)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.GOCARDLESS_SECRET_ID = 'test-secret-id';
        process.env.GOCARDLESS_SECRET_KEY = 'test-secret-key';
    });

    afterEach(() => {
        global.fetch = originalFetch;
        delete process.env.GOCARDLESS_SECRET_ID;
        delete process.env.GOCARDLESS_SECRET_KEY;
    });

    function mockFetch(responses: Array<{ ok: boolean; json?: unknown; text?: string }>): void {
        let call = 0;
        global.fetch = jest.fn().mockImplementation(async () => {
            const r = responses[call++] ?? { ok: true, json: {} };
            return {
                ok: r.ok,
                status: 400,
                json: async (): Promise<unknown> => r.json,
                text: async (): Promise<string> => r.text ?? '',
            };
        });
    }

    it('listInstitutions calls authFetch and maps result', async () => {
        mockFetch([
            // Token request
            { ok: true, json: { access: 'test-token', access_expires: 3600 } },
            // Institutions request
            {
                ok: true, json: [
                    { id: 'BBVA', name: 'BBVA', bic: 'BBVAES', logo: 'https://logo.png', countries: ['ES'] },
                ],
            },
        ]);

        const service = new OpenBankingService();
        const result = await service.listInstitutions('ES');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('BBVA');
    });

    it('throws when GoCardless token request fails', async () => {
        mockFetch([
            { ok: false, text: 'Unauthorized' },
        ]);

        const service = new OpenBankingService();
        await expect(service.listInstitutions('ES')).rejects.toThrow('GoCardless auth failed');
    });

    it('throws when API call fails', async () => {
        mockFetch([
            // Token OK
            { ok: true, json: { access: 'test-token', access_expires: 3600 } },
            // API call fails
            { ok: false, text: 'Internal Server Error' },
        ]);

        const service = new OpenBankingService();
        await expect(service.listInstitutions('ES')).rejects.toThrow('GoCardless error');
    });

    it('getAccountDetails maps account fields correctly', async () => {
        mockFetch([
            { ok: true, json: { access: 'tok', access_expires: 3600 } },
            { ok: true, json: { account: { iban: 'ES00 1234', currency: 'EUR', institution_id: 'BBVA' } } },
        ]);

        const service = new OpenBankingService();
        const result = await service.getAccountDetails('acc-1');
        expect(result.iban).toBe('ES00 1234');
        expect(result.institutionId).toBe('BBVA');
    });

    it('getTransactions maps booked transactions', async () => {
        mockFetch([
            { ok: true, json: { access: 'tok', access_expires: 3600 } },
            {
                ok: true, json: {
                    transactions: {
                        booked: [{
                            transactionId: 'tx1',
                            bookingDate: '2025-03-01',
                            valueDate: '2025-03-01',
                            transactionAmount: { amount: '-50.00', currency: 'EUR' },
                            creditorName: 'Mercadona',
                            remittanceInformationUnstructured: 'Compra supermercado',
                        }],
                    },
                },
            },
        ]);

        const service = new OpenBankingService();
        const txs = await service.getTransactions('acc-1');
        expect(txs).toHaveLength(1);
        expect(txs[0].type).toBe('expense');
        expect(txs[0].amount).toBe(50);
        expect(txs[0].creditorName).toBe('Mercadona');
    });

    it('getTransactions uses bookingDate when valueDate is missing', async () => {
        mockFetch([
            { ok: true, json: { access: 'tok', access_expires: 3600 } },
            {
                ok: true, json: {
                    transactions: {
                        booked: [{
                            transactionId: 'tx2',
                            bookingDate: '2025-03-05',
                            transactionAmount: { amount: '200.00', currency: 'EUR' },
                            debtorName: 'Empresa',
                            remittanceInformationUnstructured: undefined,
                        }],
                    },
                },
            },
        ]);

        const service = new OpenBankingService();
        const txs = await service.getTransactions('acc-1', '2025-03-01');
        expect(txs[0].type).toBe('income');
        expect(txs[0].valueDate).toBe('2025-03-05');
        expect(txs[0].remittanceInfo).toBe('');
    });

    it('reuses cached token on second call', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ access: 'cached-token', access_expires: 3600 }),
        });
        global.fetch = fetchMock;

        const service = new OpenBankingService();
        // First call gets token + institutions
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access: 'cached-token', access_expires: 3600 }) })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'A', name: 'A', bic: 'B', logo: 'L', countries: ['ES'] }] })
            // Second call should reuse token
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'B', name: 'B', bic: 'C', logo: 'L', countries: ['ES'] }] });

        await service.listInstitutions('ES');
        await service.listInstitutions('ES');
        // Token endpoint called only once
        const tokenCalls = (fetchMock as jest.Mock).mock.calls.filter((c: string[]) => (c[0] as string).includes('/token/'));
        expect(tokenCalls).toHaveLength(1);
    });

    it('createRequisition sends POST and returns requisitionId + link', async () => {
        mockFetch([
            { ok: true, json: { access: 'tok', access_expires: 3600 } },
            { ok: true, json: { id: 'req-abc', link: 'https://gocardless.com/link' } },
        ]);

        const service = new OpenBankingService();
        const result = await service.createRequisition('BBVA', 'https://app.com/cb');
        expect(result.requisitionId).toBe('req-abc');
        expect(result.link).toBe('https://gocardless.com/link');
    });

    it('getRequisitionAccounts returns accounts array', async () => {
        mockFetch([
            { ok: true, json: { access: 'tok', access_expires: 3600 } },
            { ok: true, json: { accounts: ['acc-1', 'acc-2'] } },
        ]);

        const service = new OpenBankingService();
        const result = await service.getRequisitionAccounts('req-1');
        expect(result).toEqual(['acc-1', 'acc-2']);
    });
});
