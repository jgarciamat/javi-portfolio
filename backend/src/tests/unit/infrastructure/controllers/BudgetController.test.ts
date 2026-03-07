import { Response } from 'express';
import { BudgetController } from '@infrastructure/controllers/BudgetController';
import { SetMonthlyBudget, GetMonthlyBudget } from '@application/use-cases/Budget';
import { AuthRequest } from '@infrastructure/express/authMiddleware';
import { MonthlyBudget } from '@domain/entities/MonthlyBudget';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(params: Record<string, string> = {}, body: Record<string, unknown> = {}, userId = 'user-1'): AuthRequest {
    return { params, body, userId } as unknown as AuthRequest;
}

function makeBudget(): MonthlyBudget {
    return MonthlyBudget.create({ id: 'b1', userId: 'user-1', year: 2025, month: 3, initialAmount: 1000, createdAt: new Date(), updatedAt: new Date() });
}

describe('BudgetController', () => {
    let setUseCase: jest.Mocked<SetMonthlyBudget>;
    let getUseCase: jest.Mocked<GetMonthlyBudget>;
    let txRepo: { computeCarryover: jest.Mock };
    let controller: BudgetController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUseCase = { execute: jest.fn() } as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getUseCase = { execute: jest.fn(), getHistory: jest.fn() } as any;
        txRepo = { computeCarryover: jest.fn().mockReturnValue(500) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller = new BudgetController(setUseCase, getUseCase, txRepo as any);
    });

    describe('get', () => {
        it('returns budget JSON when found', async () => {
            const budget = makeBudget();
            getUseCase.execute.mockResolvedValue(budget);
            const res = makeRes();
            await controller.get(makeReq({ year: '2025', month: '3' }), res as Response);
            expect(res.json).toHaveBeenCalledWith(budget.toJSON());
        });

        it('returns default object when no budget found', async () => {
            getUseCase.execute.mockResolvedValue(null);
            const res = makeRes();
            await controller.get(makeReq({ year: '2025', month: '3' }), res as Response);
            expect(res.json).toHaveBeenCalledWith({ initialAmount: 0, year: 2025, month: 3 });
        });

        it('returns 500 on error', async () => {
            getUseCase.execute.mockRejectedValue(new Error('DB error'));
            const res = makeRes();
            await controller.get(makeReq({ year: '2025', month: '3' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('set', () => {
        it('saves and returns budget', async () => {
            const budget = makeBudget();
            setUseCase.execute.mockResolvedValue(budget);
            const res = makeRes();
            await controller.set(makeReq({ year: '2025', month: '3' }, { initialAmount: 1000 }), res as Response);
            expect(res.json).toHaveBeenCalledWith(budget.toJSON());
        });

        it('returns 400 on error', async () => {
            setUseCase.execute.mockRejectedValue(new Error('Invalid'));
            const res = makeRes();
            await controller.set(makeReq({ year: '2025', month: '3' }, { initialAmount: -1 }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('history', () => {
        it('returns list of budgets', async () => {
            const budgets = [makeBudget()];
            getUseCase.getHistory.mockResolvedValue(budgets);
            const res = makeRes();
            await controller.history(makeReq({}, {}), res as Response);
            expect(res.json).toHaveBeenCalledWith(budgets.map(b => b.toJSON()));
        });

        it('returns 500 on error', async () => {
            getUseCase.getHistory.mockRejectedValue(new Error('DB error'));
            const res = makeRes();
            await controller.history(makeReq({}), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('carryover', () => {
        it('returns carryover value for valid params', async () => {
            const res = makeRes();
            await controller.carryover(makeReq({ year: '2025', month: '3' }), res as Response);
            expect(res.json).toHaveBeenCalledWith({ carryover: 500, year: 2025, month: 3 });
        });

        it('returns 400 for invalid month', async () => {
            const res = makeRes();
            await controller.carryover(makeReq({ year: '2025', month: '0' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 400 for invalid year', async () => {
            const res = makeRes();
            await controller.carryover(makeReq({ year: 'abc', month: '3' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('returns 500 on error', async () => {
            txRepo.computeCarryover.mockImplementation(() => { throw new Error('fail'); });
            const res = makeRes();
            await controller.carryover(makeReq({ year: '2025', month: '3' }), res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
