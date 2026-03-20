import { customAlertApi } from '@core/api/financeApi';

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

const alertFixture = {
    id: 'a1',
    userId: 'u1',
    name: 'Gastos altos',
    metric: 'expenses_pct',
    operator: 'gte',
    threshold: 80,
    category: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('customAlertApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('getAll calls GET /custom-alerts', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([alertFixture]));
        const result = await customAlertApi.getAll();
        expect(result).toEqual([alertFixture]);
        expect(mockFetch).toHaveBeenCalledWith(`${BASE}/custom-alerts`, expect.any(Object));
    });

    test('create calls POST /custom-alerts', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse(alertFixture, 201));
        const dto = {
            name: 'Gastos altos',
            metric: 'expenses_pct' as const,
            operator: 'gte' as const,
            threshold: 80,
        };
        const result = await customAlertApi.create(dto);
        expect(result).toEqual(alertFixture);
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/custom-alerts`,
            expect.objectContaining({ method: 'POST' }),
        );
    });

    test('update calls PATCH /custom-alerts/:id', async () => {
        const updated = { ...alertFixture, threshold: 90 };
        mockFetch.mockResolvedValueOnce(makeResponse(updated));
        const result = await customAlertApi.update('a1', { threshold: 90 });
        expect(result).toEqual(updated);
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/custom-alerts/a1`,
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    test('delete calls DELETE /custom-alerts/:id and returns undefined', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        const result = await customAlertApi.delete('a1');
        expect(result).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith(
            `${BASE}/custom-alerts/a1`,
            expect.objectContaining({ method: 'DELETE' }),
        );
    });

    test('getAll throws on error response', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Unauthorized' }, 401));
        await expect(customAlertApi.getAll()).rejects.toThrow();
    });
});
