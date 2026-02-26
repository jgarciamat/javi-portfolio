import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../shared/hooks/useAuth';

jest.mock('@core/api/authApi', () => ({
    authApi: {
        login: jest.fn().mockResolvedValue({ token: 'tok-123', user: { id: 'u1', name: 'Test', email: 'a@b' } }),
        register: jest.fn().mockResolvedValue({ message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.' }),
    },
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

    test('login persists token and user', async () => {
        render(<AuthProvider><TestComponent /></AuthProvider>);
        fireEvent.click(screen.getByText('login'));
        await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Test'));
        expect(localStorage.getItem('mm_token')).toBe('tok-123');
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
        localStorage.setItem('mm_token', 'tok-abc');
        localStorage.setItem('mm_user', JSON.stringify({ id: 'u0', name: 'Seed' }));
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('user').textContent).toBe('Seed');
        fireEvent.click(screen.getByText('logout'));
        await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('no-user'));
        expect(localStorage.getItem('mm_token')).toBeNull();
    });

    test('loads persisted user from localStorage on mount', () => {
        localStorage.setItem('mm_token', 'tok-persisted');
        localStorage.setItem('mm_user', JSON.stringify({ id: 'u3', name: 'Persisted', email: 'p@b' }));
        render(<AuthProvider><TestComponent /></AuthProvider>);
        expect(screen.getByTestId('user').textContent).toBe('Persisted');
        expect(screen.getByTestId('token').textContent).toBe('tok-persisted');
        expect(screen.getByTestId('auth').textContent).toBe('true');
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
