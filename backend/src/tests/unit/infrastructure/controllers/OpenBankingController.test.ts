import { Response } from 'express';
import { OpenBankingController } from '@infrastructure/controllers/OpenBankingController';
import { SyncBankTransactions } from '@application/use-cases/SyncBankTransactions';
import { OpenBankingService } from '@infrastructure/openbanking/OpenBankingService';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(
    query: Record<string, string> = {},
    body: Record<string, unknown> = {},
    params: Record<string, string> = {},
    userId = 'user-1'
): AuthRequest {
    return { query, body, params, userId } as unknown as AuthRequest;
}

describe('OpenBankingController', () => {
    let syncUseCase: jest.Mocked<SyncBankTransactions>;
    let openBankingService: jest.Mocked<OpenBankingService>;
    let controller: OpenBankingController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        syncUseCase = { execute: jest.fn() } as any;
        openBankingService = {
            listInstitutions: jest.fn(),
            createRequisition: jest.fn(),
            getRequisitionAccounts: jest.fn(),
            getAccountDetails: jest.fn(),
        } as unknown as jest.Mocked<OpenBankingService>;
        controller = new OpenBankingController(syncUseCase, openBankingService);
    });

    describe('listInstitutions', () => {
        it('returns institutions for given country', async () => {
            const institutions = [{ id: 'BBVA', name: 'BBVA' }];
            openBankingService.listInstitutions.mockResolvedValue(institutions as never);
            const res = makeRes();
            await controller.listInstitutions(makeReq({ country: 'ES' }), res as Response);
            expect(openBankingService.listInstitutions).toHaveBeenCalledWith('ES');
            expect(res.json).toHaveBeenCalledWith({ institutions });
        });

        it('defaults to ES country when not provided', async () => {
            openBankingService.listInstitutions.mockResolvedValue([]);
            const res = makeRes();
            await controller.listInstitutions(makeReq({}), res as Response);
            expect(openBankingService.listInstitutions).toHaveBeenCalledWith('ES');
        });

        it('returns 500 on error', async () => {
            openBankingService.listInstitutions.mockRejectedValue(new Error('API down'));
            const res = makeRes();
            await controller.listInstitutions(makeReq({}), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'API down' });
        });
    });

    describe('linkAccount', () => {
        it('returns requisition result', async () => {
            const result = { link: 'https://example.com', id: 'req-1' };
            openBankingService.createRequisition.mockResolvedValue(result as never);
            const res = makeRes();
            await controller.linkAccount(
                makeReq({}, { institutionId: 'BBVA', redirectUrl: 'https://app.com/callback' }),
                res as Response
            );
            expect(openBankingService.createRequisition).toHaveBeenCalledWith('BBVA', 'https://app.com/callback');
            expect(res.json).toHaveBeenCalledWith(result);
        });

        it('returns 400 when institutionId missing', async () => {
            const res = makeRes();
            await controller.linkAccount(
                makeReq({}, { redirectUrl: 'https://app.com' }),
                res as Response
            );
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'institutionId y redirectUrl son requeridos' });
        });

        it('returns 400 when redirectUrl missing', async () => {
            const res = makeRes();
            await controller.linkAccount(
                makeReq({}, { institutionId: 'BBVA' }),
                res as Response
            );
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 500 on error', async () => {
            openBankingService.createRequisition.mockRejectedValue(new Error('fail'));
            const res = makeRes();
            await controller.linkAccount(
                makeReq({}, { institutionId: 'BBVA', redirectUrl: 'https://app.com' }),
                res as Response
            );
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getLinkedAccounts', () => {
        it('returns enriched accounts list', async () => {
            openBankingService.getRequisitionAccounts.mockResolvedValue(['acc-1', 'acc-2'] as never);
            openBankingService.getAccountDetails
                .mockResolvedValueOnce({ iban: 'ES123', currency: 'EUR' } as never)
                .mockResolvedValueOnce({ iban: 'ES456', currency: 'EUR' } as never);
            const res = makeRes();
            await controller.getLinkedAccounts(makeReq({ requisitionId: 'req-1' }), res as Response);
            expect(res.json).toHaveBeenCalledWith({
                accounts: [
                    { accountId: 'acc-1', iban: 'ES123', currency: 'EUR' },
                    { accountId: 'acc-2', iban: 'ES456', currency: 'EUR' },
                ],
            });
        });

        it('returns 400 when requisitionId missing', async () => {
            const res = makeRes();
            await controller.getLinkedAccounts(makeReq({}), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'requisitionId es requerido' });
        });

        it('returns 500 on error', async () => {
            openBankingService.getRequisitionAccounts.mockRejectedValue(new Error('oops'));
            const res = makeRes();
            await controller.getLinkedAccounts(makeReq({ requisitionId: 'x' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('syncTransactions', () => {
        it('returns sync result', async () => {
            syncUseCase.execute.mockResolvedValue({ synced: 5, skipped: 1 } as never);
            const res = makeRes();
            await controller.syncTransactions(
                makeReq({}, { accountId: 'acc-1', dateFrom: '2025-01-01', dateTo: '2025-03-31' }),
                res as Response
            );
            expect(syncUseCase.execute).toHaveBeenCalledWith('acc-1', '2025-01-01', '2025-03-31');
            expect(res.json).toHaveBeenCalledWith({ synced: 5, skipped: 1 });
        });

        it('returns 400 when accountId missing', async () => {
            const res = makeRes();
            await controller.syncTransactions(makeReq({}, {}), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'accountId es requerido' });
        });

        it('returns 500 on error', async () => {
            syncUseCase.execute.mockRejectedValue(new Error('sync failed'));
            const res = makeRes();
            await controller.syncTransactions(makeReq({}, { accountId: 'acc-1' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('unlinkAccount', () => {
        it('returns success message with accountId', async () => {
            const res = makeRes();
            await controller.unlinkAccount(makeReq({}, {}, { accountId: 'acc-xyz' }), res as Response);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Cuenta acc-xyz desvinculada correctamente',
            });
        });
    });
});
