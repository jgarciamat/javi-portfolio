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

    // ─── Savings rate ──────────────────────────────────────────────────────

    it('returns outstanding-savings positive when savingsRate >= 30', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 35, totalSaving: 700 });
        expect(result.positives.some(p => p.includes('35'))).toBe(true);
    });

    it('returns good-savings positive when savingsRate >= 20 and < 30', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 25 });
        expect(result.positives.some(p => p.includes('25'))).toBe(true);
    });

    it('returns tip with gap when savingsRate >= 10 and < 20', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 15, totalSaving: 300 });
        // Tip should mention savingsRate value or "20%"
        expect(result.tips.some(t => t.includes('15') || t.includes('20'))).toBe(true);
    });

    it('returns warning with target when savingsRate > 0 and < 10', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 5, totalSaving: 100 });
        expect(result.warnings.some(w => w.includes('5') || w.includes('20'))).toBe(true);
    });

    it('returns no-savings warning when savingsRate is 0 and income > 0', async () => {
        const result = await useCase.execute({ ...baseContext, savingsRate: 0, totalSaving: 0 });
        expect(result.warnings.some(w => w.includes('10%') || w.includes('ahorro') || w.includes('savings'))).toBe(true);
    });

    // ─── Balance ───────────────────────────────────────────────────────────

    it('returns negative-balance warning when balance < 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: -100, savingsRate: 0 });
        expect(result.warnings.some(w => w.includes('100'))).toBe(true);
    });

    it('returns positive balance positive when balance > 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: 800, savingsRate: 25 });
        expect(result.positives.some(p => p.includes('800') || p.includes('%'))).toBe(true);
    });

    // ─── Expense ratio ─────────────────────────────────────────────────────

    it('returns high-ratio warning when expenses >= 90% of income', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalIncome: 1000,
            totalExpenses: 950,
            balance: 50,
            savingsRate: 0,
        });
        expect(result.warnings.some(w => w.includes('95') || w.includes('90'))).toBe(true);
    });

    it('returns reduce-expenses tip when ratio >= 75% and < 90%', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalIncome: 1000,
            totalExpenses: 800,
            balance: 200,
            savingsRate: 0,
        });
        expect(result.tips.some(t => t.includes('80') || t.includes('75'))).toBe(true);
    });

    // ─── Top category ──────────────────────────────────────────────────────

    it('returns warning when top category exceeds 50% of expenses', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalExpenses: 1000,
            expensesByCategory: { Ocio: 600, Alimentación: 400 },
            savingsRate: 25,
        });
        expect(result.warnings.some(w => w.includes('Ocio'))).toBe(true);
    });

    it('returns tip when top category exceeds 35% but <= 50% of expenses', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalExpenses: 1000,
            expensesByCategory: { Ocio: 400, Alimentación: 350, Transporte: 250 },
            savingsRate: 25,
        });
        expect(result.tips.some(t => t.includes('Ocio'))).toBe(true);
    });

    // ─── Budget ────────────────────────────────────────────────────────────

    it('returns budget-exceeded warning when expenses exceed budgetAmount', async () => {
        const result = await useCase.execute({ ...baseContext, budgetAmount: 800, totalExpenses: 1000 });
        expect(result.warnings.some(w => w.includes('200'))).toBe(true);
    });

    it('returns within-budget positive when expenses are below budgetAmount', async () => {
        const result = await useCase.execute({ ...baseContext, budgetAmount: 1500, totalExpenses: 1000, savingsRate: 25 });
        expect(result.positives.some(p => p.includes('500') || p.includes('1500') || p.includes('presupuesto') || p.includes('budget'))).toBe(true);
    });

    // ─── Saving allocation ─────────────────────────────────────────────────

    it('returns diversified-savings positive when multiple saving categories', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalSaving: 400,
            savingsRate: 20,
            savingByCategory: { 'Fondo emergencia': 200, 'Inversión': 200 },
        });
        expect(result.positives.some(p => p.includes('2') || p.includes('categoría') || p.includes('categor'))).toBe(true);
    });

    it('returns diversify-savings tip when only one saving category', async () => {
        const result = await useCase.execute({
            ...baseContext,
            totalSaving: 200,
            savingsRate: 10,
            savingByCategory: { 'Fondo de emergencia': 200 },
        });
        expect(result.tips.some(t => t.includes('Fondo de emergencia') || t.includes('diversif'))).toBe(true);
    });

    // ─── Transactions ──────────────────────────────────────────────────────

    it('returns tip to start recording when no transactions', async () => {
        const result = await useCase.execute({ ...baseContext, transactions: [] });
        expect(result.tips.some(t => t.includes('registrar') || t.includes('recording') || t.includes('logging'))).toBe(true);
    });

    it('returns excellent-tracking positive when >= 20 transactions', async () => {
        const manyTx = Array.from({ length: 25 }, (_, i) => ({
            description: `tx${i}`, amount: 10, type: 'expense' as const, category: 'Ocio', date: '2025-03-01',
        }));
        const result = await useCase.execute({ ...baseContext, transactions: manyTx, savingsRate: 25 });
        expect(result.positives.some(p => p.includes('25'))).toBe(true);
    });

    // ─── Summary ───────────────────────────────────────────────────────────

    it('summary mentions negative balance amounts when balance < 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: -50, savingsRate: 0 });
        expect(result.summary).toContain('50');
    });

    it('summary mentions income and saving when balance >= 0', async () => {
        const result = await useCase.execute({ ...baseContext, balance: 800, totalSaving: 200, savingsRate: 25 });
        expect(result.summary).toMatch(/2000|200/);
    });

    it('summary provides no-data message when both income and expenses are 0', async () => {
        const result = await useCase.execute({
            ...baseContext, totalIncome: 0, totalExpenses: 0, totalSaving: 0, balance: 0, savingsRate: 0,
        });
        expect(result.summary).toMatch(/Sin datos|No financial data/i);
    });

    // ─── English locale ────────────────────────────────────────────────────

    it('works in English locale for savings >= 20%', async () => {
        const result = await useCase.execute({ ...baseContext, locale: 'en', savingsRate: 25 });
        expect(result.positives.some(p => p.includes('25'))).toBe(true);
        expect(result.summary).toMatch(/saved|saving|income/i);
    });

    it('works in English locale for negative balance', async () => {
        const result = await useCase.execute({ ...baseContext, locale: 'en', balance: -200, savingsRate: 0 });
        expect(result.warnings.some(w => w.includes('200'))).toBe(true);
        expect(result.summary).toMatch(/exceed/i);
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
