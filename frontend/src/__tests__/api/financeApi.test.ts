/**
 * Tests for transactionApi and categoryApi in core/api/financeApi.ts
 */

import { transactionApi, categoryApi } from '@core/api/financeApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: jest.fn().mockResolvedValue(body),
    };
}

describe('transactionApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('getAll without params calls /transactions', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([]));
        await transactionApi.getAll();
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/transactions', expect.any(Object));
    });

    test('getAll with year/month appends query params', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([]));
        await transactionApi.getAll({ year: 2025, month: 3 });
        const url = mockFetch.mock.calls[0][0];
        expect(url).toContain('year=2025');
        expect(url).toContain('month=3');
    });

    test('create sends POST and returns transaction', async () => {
        const tx = { id: 't1', description: 'Bus', amount: 10, type: 'EXPENSE', category: 'Transport', date: '2025-01-05', createdAt: '2025-01-05' };
        mockFetch.mockResolvedValueOnce(makeResponse(tx));
        const result = await transactionApi.create({ description: 'Bus', amount: 10, type: 'EXPENSE', category: 'Transport' });
        expect(result).toEqual(tx);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/transactions', expect.objectContaining({ method: 'POST' }));
    });

    test('delete sends DELETE', async () => {
        const resp = { ok: true, status: 204, json: jest.fn() };
        mockFetch.mockResolvedValueOnce(resp);
        const result = await transactionApi.delete('t1');
        expect(result).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/transactions/t1', expect.objectContaining({ method: 'DELETE' }));
    });

    test('getSummary without params calls /transactions/summary', async () => {
        const summary = { balance: 100, totalIncome: 500, totalExpenses: 400, totalSaving: 0, transactionCount: 5, expensesByCategory: {}, incomeByCategory: {}, savingByCategory: {} };
        mockFetch.mockResolvedValueOnce(makeResponse(summary));
        const result = await transactionApi.getSummary();
        expect(result).toEqual(summary);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/transactions/summary', expect.any(Object));
    });

    test('getSummary with params appends query string', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({}));
        await transactionApi.getSummary({ year: 2025, month: 6 });
        const url = mockFetch.mock.calls[0][0];
        expect(url).toContain('year=2025');
        expect(url).toContain('month=6');
    });

    test('getAnnual calls /transactions/annual/:year', async () => {
        const annual = { year: 2025, months: {} };
        mockFetch.mockResolvedValueOnce(makeResponse(annual));
        const result = await transactionApi.getAnnual(2025);
        expect(result).toEqual(annual);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/transactions/annual/2025', expect.any(Object));
    });

    test('throws with error message on non-ok response', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Not found' }, 404));
        await expect(transactionApi.getAll()).rejects.toThrow('Not found');
    });

    test('throws HTTP error status when body has no error field', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({}, 500));
        await expect(transactionApi.getAll()).rejects.toThrow('HTTP error 500');
    });

    test('falls back to HTTP status when error response body is not JSON', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 502,
            json: jest.fn().mockRejectedValue(new Error('not json')),
        });
        await expect(transactionApi.getAll()).rejects.toThrow('HTTP error 502');
    });

    test('sends Authorization header when token exists', async () => {
        localStorage.setItem('mm_token', 'tok-abc');
        mockFetch.mockResolvedValueOnce(makeResponse([]));
        await transactionApi.getAll();
        const headers = mockFetch.mock.calls[0][1].headers;
        expect(headers['Authorization']).toBe('Bearer tok-abc');
    });

    test('omits Authorization header when no token', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([]));
        await transactionApi.getAll();
        const headers = mockFetch.mock.calls[0][1].headers;
        expect(headers['Authorization']).toBeUndefined();
    });
});

describe('categoryApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('getAll returns categories', async () => {
        const cats = [{ id: 'c1', name: 'Food', color: '#ff0', icon: '🍔' }];
        mockFetch.mockResolvedValueOnce(makeResponse(cats));
        const result = await categoryApi.getAll();
        expect(result).toEqual(cats);
    });

    test('create sends POST and returns new category', async () => {
        const cat = { id: 'c2', name: 'Transport', color: '#00f', icon: '🚗' };
        mockFetch.mockResolvedValueOnce(makeResponse(cat));
        const result = await categoryApi.create({ name: 'Transport', color: '#00f', icon: '🚗' });
        expect(result).toEqual(cat);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/categories', expect.objectContaining({ method: 'POST' }));
    });

    test('delete sends DELETE', async () => {
        const resp = { ok: true, status: 204, json: jest.fn() };
        mockFetch.mockResolvedValueOnce(resp);
        const result = await categoryApi.delete('c1');
        expect(result).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/categories/c1', expect.objectContaining({ method: 'DELETE' }));
    });
});
