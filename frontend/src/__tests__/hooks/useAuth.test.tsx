import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../shared/hooks/useAuth';

// A valid-looking (but fake) JWT with exp far in the future so loadToken() accepts it
// header.payload.signature — payload: { userId:'u1', exp: 9999999999 }
// These are defined as module-level consts AND replicated as string literals inside jest.mock()
// because jest.mock() is hoisted before const declarations are evaluated.
const FAKE_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.sig';
const FAKE_REFRESH_TOKEN = 'fake-refresh-token-xyz';

jest.mock('@core/api/authApi', () => ({
    authApi: {
        login: jest.fn().mockResolvedValue({
            // Literal strings — cannot reference consts here due to hoisting
            accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.sig',
            refreshToken: 'fake-refresh-token-xyz',
            user: { id: 'u1', name: 'Test', email: 'a@b' },
        }),
        register: jest.fn().mockResolvedValue({ message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.' }),
        logout: jest.fn().mockResolvedValue(undefined),
    },
    registerUnauthorizedHandler: jest.fn(),
}));

function TestComponent() {
    const { user, token, login, register, logout, isAuthenticated } = useAuth();
    return (
        <div>
            <div data-testid="user">{user ? user.name : 'no-user'}</div>
            <div data-testid="token">{token ?? 'no-token'}</div>
            <div data-testid="auth">{String(isAuthenticated)}</div>
            <button onClick={() => login('a@b', 'pw')}>login</button>
            <button onClick={() => register('n@b', 'pw', 'New')}>register</button>
            <button onClick={() => logout()}>logout</button>
        </div>
    );
}

describe('useAuth / AuthProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('login persists accessToken, refreshToken and user', async () => {
        render(<AuthProvider><TestComponent /></AuthProvider>);
        fireEvent.click(screen.getByText('login'));
        await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Test'));
        expect(localStorage.getItem('mm_token')).toBe(FAKE_ACCESS_TOKEN);
        expect(localStorage.getItem('mm_refresh_token')).toBe(FAKE_REFRESH_TOKEN);
        expect(localStorage.getItem('mm_user')).toBe(JSON.stringify({ id: 'u1', name: 'Test', email: 'a@b' }));
        expect(screen.getByTestId('auth').textContent).toBe('true');
    });

    test('register returns message and does not persist session', async () => {
        render(<AuthProvider><TestComponent /></AuthProvider>);
        fireEvent.click(screen.getByText('register'));
        // register no longer persists — user stays unauthenticated until email is verified
        await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('false'));
        expect(localStorage.getItem('mm_token')).toBeNull();
        expect(screen.getByTestId('user').textContent).toBe('no-user');
    });

    test('logout clears persisted data', async () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        localStorage.setItem('mm_refresh_token', FAKE_REFRESH_TOKEN);
        localStorage.setItem('mm_user', JSON.stringify({ id: 'u0', name: 'Seed' }));
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('user').textContent).toBe('Seed');
        fireEvent.click(screen.getByText('logout'));
        await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
        expect(localStorage.getItem('mm_token')).toBeNull();
        expect(localStorage.getItem('mm_refresh_token')).toBeNull();
    });

    test('loads persisted user from localStorage on mount', () => {
        localStorage.setItem('mm_token', FAKE_ACCESS_TOKEN);
        localStorage.setItem('mm_refresh_token', FAKE_REFRESH_TOKEN);
        localStorage.setItem('mm_user', JSON.stringify({ id: 'u3', name: 'Persisted', email: 'p@b' }));
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('user').textContent).toBe('Persisted');
        expect(screen.getByTestId('token').textContent).toBe(FAKE_ACCESS_TOKEN);
        expect(screen.getByTestId('auth').textContent).toBe('true');
    });

    test('ignores an expired access token on mount (loadToken returns null)', () => {
        // JWT with exp in the past: { userId:'u1', exp: 1 }
        const expired = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSIsImV4cCI6MX0.sig';
        localStorage.setItem('mm_token', expired);
        localStorage.setItem('mm_user', JSON.stringify({ id: 'u1', name: 'OldUser', email: 'o@b' }));
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('token').textContent).toBe('no-token');
        expect(screen.getByTestId('auth').textContent).toBe('false');
    });

    test('handles corrupt localStorage gracefully (loadUser error branch)', () => {
        localStorage.setItem('mm_user', 'not-valid-json{{{');
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('user').textContent).toBe('no-user');
    });

    test('useAuth throws when used outside AuthProvider', () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        function Bare() { useAuth(); return null; }
        expect(() => render(<Bare />)).toThrow('useAuth must be used inside AuthProvider');
        consoleError.mockRestore();
    });
});
