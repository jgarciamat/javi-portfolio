import { GetAIAdvice, FinancialContext } from '@application/use-cases/GetAIAdvice';

const baseContext: FinancialContext = {
    year: 2025,
    month: 3,
    locale: 'es',
    totalIncome: 2000,
    totalExpenses: 1000,
    totalSaving: 200,
    balance: 800,
    savingsRate: 50,
    budgetAmount: 0,
    expensesByCategory: { Alimentación: 300, Ocio: 700 },
    savingByCategory: { 'Fondo de emergencia': 200 },
    transactions: [
        { description: 'Supermercado', amount: 300, type: 'expense', category: 'Alimentación', date: '2025-03-10' },
    ],
};

// Ensure we always use rule-based (no API key)
beforeAll(() => {
    delete process.env.GEMINI_API_KEY;
});

describe('GetAIAdvice (rule-based fallback)', () => {
    const useCase = new GetAIAdvice();

    it('returns positive savings message when savingsRate >= 20', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 25 });
        expect(result.positives.some(p => p.includes('25'))).toBe(true);
    });

    it('returns tip to increase savings when savingsRate > 0 but < 20', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 10 });
        expect(result.tips.some(t => t.includes('10'))).toBe(true);
    });

    it('returns warning when balance is negative', async () => {
        const result = await useCase.execute({ ...baseContext, balance: -100, savingsRate: 0 });
        expect(result.warnings.some(w => w.includes('-100'))).toBe(true);
    });

    it('returns tip when a category exceeds 40% of expenses', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalExpenses: 1000,
            expensesByCategory: { Ocio: 700, Alimentación: 300 },
            savingsRate: 0,
        });
        expect(result.tips.some(t => t.includes('Ocio'))).toBe(true);
    });

    it('returns warning when expenses exceed budgetAmount', async () => {
        const result = await useCase.execute({ ...baseContext, budgetAmount: 800, totalExpenses: 1000 });
        expect(result.warnings.some(w => w.includes('200'))).toBe(true);
    });

    it('returns tip to start recording when no transactions', async () => {
        const result = await useCase.execute({ ...baseContext, transactions: [] });
        expect(result.tips.some(t => t.includes('registrar') || t.includes('recording'))).toBe(true);
    });

    it('returns count positive when transactions exist', async () => {
        const result = await useCase.execute(baseContext);
        expect(result.positives.some(p => p.includes('1'))).toBe(true);
    });

    it('summary mentions negative balance when balance < 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: -50, savingsRate: 0 });
        expect(result.summary).toContain('50');
    });

    it('summary mentions income and saving when balance >= 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: 800, totalSaving: 200, savingsRate: 25 });
        // Summary should mention income (2000) or saving (200) figures
        expect(result.summary).toMatch(/2000|200/);
    });

    it('works in English locale', async () => {
        const result = await useCase.execute({ ...baseContext, locale: 'en', savingsRate: 25 });
        expect(result.positives.some(p => p.includes('25'))).toBe(true);
        expect(result.summary).toMatch(/saved|saving/i);
    });

    it('builds prompt and falls back on Gemini error (fetch throws)', async () => {
        process.env.GEMINI_API_KEY = 'fake-key';
        const globalFetch = global.fetch;
        global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

        const result = await useCase.execute(baseContext);

        expect(result).toHaveProperty('summary');
        global.fetch = globalFetch;
        delete process.env.GEMINI_API_KEY;
    });

    it('falls back when Gemini returns non-ok response', async () => {
        process.env.GEMINI_API_KEY = 'fake-key';
        const globalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: jest.fn().mockResolvedValue('rate limited'),
        });

        const result = await useCase.execute(baseContext);

        expect(result).toHaveProperty('summary');
        global.fetch = globalFetch;
        delete process.env.GEMINI_API_KEY;
    });

    it('strips markdown code fences from Gemini response', async () => {
        process.env.GEMINI_API_KEY = 'fake-key';
        const globalFetch = global.fetch;
        const advice = { summary: 'ok', tips: [], positives: [], warnings: [] };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(advice) + '\n```' }] } }],
            }),
        });

        const result = await useCase.execute(baseContext);

        expect(result.summary).toBe('ok');
        global.fetch = globalFetch;
        delete process.env.GEMINI_API_KEY;
    });

    it('builds English prompt when locale is en', async () => {
        process.env.GEMINI_API_KEY = 'fake-key';
        const globalFetch = global.fetch;
        const advice = { summary: 'ok', tips: [], positives: [], warnings: [] };
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                candidates: [{ content: { parts: [{ text: JSON.stringify(advice) }] } }],
            }),
        });

        const result = await useCase.execute({ ...baseContext, locale: 'en' });

        expect(result.summary).toBe('ok');
        // Verify fetch was called (prompt was built)
        expect(global.fetch).toHaveBeenCalled();
        global.fetch = globalFetch;
        delete process.env.GEMINI_API_KEY;
    });
});
