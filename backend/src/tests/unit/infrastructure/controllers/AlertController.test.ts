import { Response } from 'express';
import { AlertController } from '@infrastructure/controllers/AlertController';
import { CheckBudgetAlerts } from '@application/use-cases/CheckBudgetAlerts';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(params: Record<string, string> = {}, userId = 'user-1'): AuthRequest {
    return { params, userId } as unknown as AuthRequest;
}

describe('AlertController', () => {
    let checkBudgetAlerts: jest.Mocked<CheckBudgetAlerts>;
    let controller: AlertController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checkBudgetAlerts = { execute: jest.fn().mockResolvedValue([]) } as any;
        controller = new AlertController(checkBudgetAlerts);
    });

    it('returns alerts for valid year/month', async () => {
        const alerts = [{ level: 'warning', category: null, spentAmount: 800, budgetAmount: 1000, percentage: 80, message: 'msg' }];
        checkBudgetAlerts.execute.mockResolvedValue(alerts as never);
        const res = makeRes();

        await controller.budgetAlerts(makeReq({ year: '2025', month: '3' }), res as Response);

        expect(res.json).toHaveBeenCalledWith({ alerts, year: 2025, month: 3 });
    });

    it('returns 400 for invalid year', async () => {
        const res = makeRes();
        await controller.budgetAlerts(makeReq({ year: 'abc', month: '3' }), res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for month out of range', async () => {
        const res = makeRes();
        await controller.budgetAlerts(makeReq({ year: '2025', month: '13' }), res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for month 0', async () => {
        const res = makeRes();
        await controller.budgetAlerts(makeReq({ year: '2025', month: '0' }), res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on use case error', async () => {
        checkBudgetAlerts.execute.mockRejectedValue(new Error('DB error'));
        const res = makeRes();
        await controller.budgetAlerts(makeReq({ year: '2025', month: '3' }), res as Response);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
