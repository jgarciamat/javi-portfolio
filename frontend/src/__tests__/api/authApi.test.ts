/**
 * Tests for authApi and budgetApi in core/api/authApi.ts
 * We mock global fetch to test the request helper branches.
 * api.config is stubbed via moduleNameMapper in jest.config.cjs → src/__mocks__/api.config.ts
 */

import { authApi, budgetApi } from '@core/api/authApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: jest.fn().mockResolvedValue(body),
    };
}

describe('authApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('register sends POST and returns RegisterResult', async () => {
        const expected = { message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.' };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await authApi.register({ email: 'a@b', password: 'pw', name: 'Test' });
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/register',
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('login sends POST and returns AuthResult', async () => {
        const expected = { token: 'tok2', user: { id: 'u2', name: 'Login', email: 'l@b' } };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await authApi.login({ email: 'l@b', password: 'pw' });
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/login',
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('throws with server error message on non-ok response', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Invalid credentials' }, 401));
        await expect(authApi.login({ email: 'bad@b', password: 'wrong' }))
            .rejects.toThrow('Invalid credentials');
    });

    test('throws HTTP status message when body has no error field', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({}, 500));
        await expect(authApi.login({ email: 'a@b', password: 'pw' }))
            .rejects.toThrow('HTTP 500');
    });

    test('falls back to HTTP status when error response body is not JSON', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 503,
            json: jest.fn().mockRejectedValue(new Error('not json')),
        });
        await expect(authApi.login({ email: 'a@b', password: 'pw' }))
            .rejects.toThrow('HTTP 503');
    });

    test('returns undefined for 204 No Content', async () => {
        const resp = { ok: true, status: 204, json: jest.fn() };
        mockFetch.mockResolvedValueOnce(resp);
        // Just needs to not throw
        const result = await authApi.login({ email: 'a@b', password: 'pw' } as never);
        expect(result).toBeUndefined();
    });

    test('does NOT send Authorization header on login even when token is in localStorage', async () => {
        localStorage.setItem('mm_token', 'tok-auth');
        mockFetch.mockResolvedValueOnce(makeResponse({ token: 't', user: {} }));
        await authApi.login({ email: 'a@b', password: 'pw' });
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBeUndefined();
    });

    test('does not send Authorization header when no token in localStorage', async () => {
        localStorage.removeItem('mm_token');
        mockFetch.mockResolvedValueOnce(makeResponse({ token: 't', user: {} }));
        await authApi.login({ email: 'a@b', password: 'pw' });
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBeUndefined();
    });

    test('verifyEmail sends GET with token query param', async () => {
        const expected = { message: 'Email verificado correctamente. Ya puedes iniciar sesión.' };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await authApi.verifyEmail('test-token-123');
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/verify-email?token=test-token-123',
            expect.any(Object)
        );
    });
});

describe('budgetApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test('get fetches budget for year/month', async () => {
        const expected = { id: 'b1', year: 2025, month: 1, initialAmount: 1000 };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await budgetApi.get(2025, 1);
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/budget/2025/1', expect.any(Object));
    });

    test('set sends PUT with initialAmount', async () => {
        const expected = { id: 'b2', year: 2025, month: 2, initialAmount: 500 };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await budgetApi.set(2025, 2, 500);
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/budget/2025/2',
            expect.objectContaining({ method: 'PUT' })
        );
    });

    test('history returns array', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse([{ year: 2025, month: 1, initialAmount: 0 }]));
        const result = await budgetApi.history();
        expect(Array.isArray(result)).toBe(true);
    });

    test('getCarryover returns carryover data', async () => {
        const expected = { carryover: 250, year: 2025, month: 3 };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await budgetApi.getCarryover(2025, 3);
        expect(result).toEqual(expected);
    });
});
