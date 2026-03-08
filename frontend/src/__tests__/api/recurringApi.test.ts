import { recurringApi } from '@core/api/financeApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: jest.fn().mockResolvedValue(body),
    };
}

const BASE = 'http://localhost:3000/api';

const ruleFixture = {
    id: 'r1',
    userId: 'u1',
    description: 'Netflix',
    amount: 12.99,
    type: 'EXPENSE',
    category: 'Ocio',
    startYear: 2026,
    startMonth: 1,
    endYear: null,
    endMonth: null,
    frequency: 'monthly',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('recurringApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('getAll calls GET /recurring-rules', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([ruleFixture]));
        const result = await recurringApi.getAll();
        expect(result).toEqual([ruleFixture]);
        expect(mockFetch).toHaveBeenCalledWith(`${BASE}/recurring-rules`, expect.any(Object));
    });

    test('create calls POST /recurring-rules', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(ruleFixture, 201));
        const dto = {
            description: 'Netflix',
            amount: 12.99,
            type: 'EXPENSE' as const,
            category: 'Ocio',
            startYear: 2026,
            startMonth: 1,
        };
        const result = await recurringApi.create(dto);
        expect(result).toEqual(ruleFixture);
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/recurring-rules`,
            expect.objectContaining({ method: 'POST' }),
        );
    });

    test('update calls PATCH /recurring-rules/:id', async () => {
        const updated = { ...ruleFixture, active: false };
        mockFetch.mockResolvedValueOnce(makeResponse(updated));
        const result = await recurringApi.update('r1', { active: false });
        expect(result).toEqual(updated);
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/recurring-rules/r1`,
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    test('delete calls DELETE /recurring-rules/:id?scope=none by default and returns undefined', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        const result = await recurringApi.delete('r1');
        expect(result).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/recurring-rules/r1?scope=none`,
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    test('delete passes scope param to DELETE /recurring-rules/:id', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        await recurringApi.delete('r1', 'all');
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/recurring-rules/r1?scope=all`,
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    test('throws error message on non-ok response', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Not found' }, 404));
        await expect(recurringApi.getAll()).rejects.toThrow('Not found');
    });

    test('sends Authorization header when token is in localStorage', async () => {
        localStorage.setItem('mm_token', 'tok123');
        mockFetch.mockResolvedValueOnce(makeResponse([]));
        await recurringApi.getAll();
        const options = mockFetch.mock.calls[0][1] as RequestInit;
        expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer tok123');
    });
});
