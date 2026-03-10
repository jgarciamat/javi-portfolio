/**
 * Tests for authApi and budgetApi in core/api/authApi.ts
 * We mock global fetch to test the request helper branches.
 * api.config is stubbed via moduleNameMapper in jest.config.cjs → src/__mocks__/api.config.ts
 */

import { authApi, budgetApi, registerUnauthorizedHandler } from '@core/api/authApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

// A valid-looking fake JWT with exp far in the future
const FAKE_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.sig';
const FAKE_REFRESH_TOKEN = 'refresh-abc-xyz';

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

    test('login sends POST and returns AuthResult with accessToken + refreshToken', async () => {
        const expected = {
            accessToken: FAKE_ACCESS_TOKEN,
            refreshToken: FAKE_REFRESH_TOKEN,
            user: { id: 'u2', name: 'Login', email: 'l@b' },
        };
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
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        mockFetch.mockResolvedValueOnce(makeResponse({ accessToken: FAKE_ACCESS_TOKEN, refreshToken: FAKE_REFRESH_TOKEN, user: {} }));
        await authApi.login({ email: 'a@b', password: 'pw' });
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBeUndefined();
    });

    test('does not send Authorization header when no token in localStorage', async () => {
        localStorage.removeItem('mm_token');
        mockFetch.mockResolvedValueOnce(makeResponse({ accessToken: FAKE_ACCESS_TOKEN, refreshToken: FAKE_REFRESH_TOKEN, user: {} }));
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

    test('requestPasswordReset sends POST /auth/forgot-password with email', async () => {
        const expected = { message: 'Si existe una cuenta con ese email, recibirás un enlace.' };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await authApi.requestPasswordReset('user@example.com');
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/forgot-password',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ email: 'user@example.com' }),
            })
        );
    });

    test('requestPasswordReset does not send Authorization header', async () => {
        localStorage.setItem('mm_token', 'some-token');
        mockFetch.mockResolvedValueOnce(makeResponse({ message: 'ok' }));
        await authApi.requestPasswordReset('u@e.com');
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBeUndefined();
    });

    test('resetPassword sends POST /auth/reset-password with token and newPassword', async () => {
        const expected = { message: 'Contraseña restablecida correctamente.' };
        mockFetch.mockResolvedValueOnce(makeResponse(expected));
        const result = await authApi.resetPassword('my-reset-token', 'newpassword123');
        expect(result).toEqual(expected);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/reset-password',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ token: 'my-reset-token', newPassword: 'newpassword123' }),
            })
        );
    });

    test('resetPassword does not send Authorization header', async () => {
        localStorage.setItem('mm_token', 'some-token');
        mockFetch.mockResolvedValueOnce(makeResponse({ message: 'ok' }));
        await authApi.resetPassword('tok', 'pw');
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBeUndefined();
    });

    test('resetPassword throws on server error', async () => {
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'El enlace ha expirado.' }, 400));
        await expect(authApi.resetPassword('expired-token', 'pw')).rejects.toThrow('El enlace ha expirado.');
    });

    test('logout sends POST /auth/logout with refreshToken', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        await authApi.logout(FAKE_REFRESH_TOKEN);
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('401 handler: retries with refreshed token on 401 response', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        localStorage.setItem('mm_refresh_token', FAKE_REFRESH_TOKEN);

        // First call → 401
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'expired' }, 401));
        // tryRefresh call → 200 with new accessToken
        mockFetch.mockResolvedValueOnce(makeResponse({ accessToken: FAKE_ACCESS_TOKEN }));
        // Retry of original request → 200 with data
        mockFetch.mockResolvedValueOnce(makeResponse({ name: 'Updated' }));

        const result = await authApi.updateName('Updated');
        expect(result).toEqual({ name: 'Updated' });
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('401 handler: calls onUnauthorized when refresh also fails', async () => {
        const handler = jest.fn();
        registerUnauthorizedHandler(handler);
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        localStorage.setItem('mm_refresh_token', FAKE_REFRESH_TOKEN);

        // First call → 401
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'expired' }, 401));
        // tryRefresh → 401 (refresh also expired)
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'invalid' }, 401));

        await expect(authApi.updateName('Fail')).rejects.toThrow('Sesión expirada');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('401 handler: calls onUnauthorized when no refresh token stored', async () => {
        const handler = jest.fn();
        registerUnauthorizedHandler(handler);
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        localStorage.removeItem('mm_refresh_token');

        // First call → 401
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'expired' }, 401));

        await expect(authApi.updateName('Fail')).rejects.toThrow('Sesión expirada');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('registerUnauthorizedHandler registers a callback', () => {
        const handler = jest.fn();
        expect(() => registerUnauthorizedHandler(handler)).not.toThrow();
    });

    test('deleteAccount sends DELETE /profile/account', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        await authApi.deleteAccount();
        expect(mockFetch).toHaveBeenCalledWith(
            'http://localhost:3000/api/profile/account',
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    test('deleteAccount sends Authorization header when token is stored', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: jest.fn() });
        await authApi.deleteAccount();
        const calledHeaders = mockFetch.mock.calls[0][1].headers;
        expect(calledHeaders['Authorization']).toBe(`Bearer ${FAKE_ACCESS_TOKEN}`);
    });

    test('deleteAccount throws on server error', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Usuario no encontrado' }, 400));
        await expect(authApi.deleteAccount()).rejects.toThrow('Usuario no encontrado');
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
