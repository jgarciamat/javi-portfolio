import { Response } from 'express';
import { AIController } from '@infrastructure/controllers/AIController';
import { GetAIAdvice } from '@application/use-cases/GetAIAdvice';
import { AuthRequest } from '@infrastructure/express/authMiddleware';

function makeRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function makeReq(body: Record<string, unknown> = {}, userId = 'user-1'): AuthRequest {
    return { body, userId } as AuthRequest;
}

const sampleAdvice = { summary: 'ok', tips: [], positives: [], warnings: [] };

describe('AIController', () => {
    let getAIAdvice: jest.Mocked<GetAIAdvice>;
    let controller: AIController;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getAIAdvice = { execute: jest.fn().mockResolvedValue(sampleAdvice) } as any;
        controller = new AIController(getAIAdvice);
    });

    it('returns 400 when year or month is missing', async () => {
        const res = makeRes();
        await controller.getAdvice(makeReq({ year: 2025 }), res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when month is out of range', async () => {
        const res = makeRes();
        await controller.getAdvice(makeReq({ year: 2025, month: 13 }), res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns advice on success', async () => {
        const res = makeRes();
        await controller.getAdvice(makeReq({ year: 2025, month: 3, locale: 'es' }), res as Response);
        expect(res.json).toHaveBeenCalledWith(sampleAdvice);
    });

    it('returns advice with default locale when not provided', async () => {
        const res = makeRes();
        await controller.getAdvice(makeReq({ year: 2025, month: 3 }), res as Response);
        expect(res.json).toHaveBeenCalledWith(sampleAdvice);
    });

    it('returns 500 on use case error', async () => {
        getAIAdvice.execute.mockRejectedValue(new Error('Gemini error'));
        const res = makeRes();
        await controller.getAdvice(makeReq({ year: 2025, month: 3 }), res as Response);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('passes transaction and budget data when repos are provided', async () => {
        const tx = {
            type: { isIncome: () => true },
            amount: { value: 500 },
            category: 'Salario',
            description: 'Salario',
            date: { toISOString: () => '2025-03-01T00:00:00.000Z' },
        };
        const txRepo = {
            findByUserAndMonth: jest.fn().mockResolvedValue([tx]),
        };
        const budgetRepo = {
            findByUserAndMonth: jest.fn().mockResolvedValue({ initialAmount: 1000 }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller = new AIController(getAIAdvice, txRepo as any, budgetRepo as any);
        const res = makeRes();

        await controller.getAdvice(makeReq({ year: 2025, month: 3 }), res as Response);

        expect(res.json).toHaveBeenCalledWith(sampleAdvice);
        expect(getAIAdvice.execute).toHaveBeenCalledWith(expect.objectContaining({ totalIncome: 500, budgetAmount: 1000 }));
    });

    it('handles expense transactions correctly', async () => {
        const tx = {
            type: { isIncome: () => false },
            amount: { value: 200 },
            category: 'Ocio',
            description: 'Cine',
            date: { toISOString: () => '2025-03-05T00:00:00.000Z' },
        };
        const txRepo = { findByUserAndMonth: jest.fn().mockResolvedValue([tx]) };
        const budgetRepo = { findByUserAndMonth: jest.fn().mockResolvedValue(null) };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller = new AIController(getAIAdvice, txRepo as any, budgetRepo as any);
        const res = makeRes();

        await controller.getAdvice(makeReq({ year: 2025, month: 3 }), res as Response);

        expect(getAIAdvice.execute).toHaveBeenCalledWith(expect.objectContaining({ totalExpenses: 200, budgetAmount: 0 }));
    });
});
