import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AuthUser } from '@shared/types/auth.types';
import { authApi } from '@core/api/authApi';

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<string>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem('mm_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(loadUser);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('mm_token'));

    const persist = (result: { token: string; user: AuthUser }) => {
        localStorage.setItem('mm_token', result.token);
        localStorage.setItem('mm_user', JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
    };

    const login = useCallback(async (email: string, password: string) => {
        const result = await authApi.login({ email, password });
        persist(result);
    }, []);

    const register = useCallback(async (email: string, password: string, name: string): Promise<string> => {
        const result = await authApi.register({ email, password, name });
        return result.message;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_user');
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
