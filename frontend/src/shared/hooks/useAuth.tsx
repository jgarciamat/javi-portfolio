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
    updateName: (name: string) => Promise<void>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateAvatar: (avatarDataUrl: string) => Promise<void>;
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

    const updateName = useCallback(async (name: string) => {
        const result = await authApi.updateName(name);
        setUser((u) => u ? { ...u, name: result.name } : u);
        const stored = localStorage.getItem('mm_user');
        if (stored) {
            const parsed = JSON.parse(stored) as AuthUser;
            localStorage.setItem('mm_user', JSON.stringify({ ...parsed, name: result.name }));
        }
    }, []);

    const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        await authApi.updatePassword(currentPassword, newPassword);
    }, []);

    const updateAvatar = useCallback(async (avatarDataUrl: string) => {
        const result = await authApi.updateAvatar(avatarDataUrl);
        setUser((u) => u ? { ...u, avatarUrl: result.avatarUrl } : u);
        const stored = localStorage.getItem('mm_user');
        if (stored) {
            const parsed = JSON.parse(stored) as AuthUser;
            localStorage.setItem('mm_user', JSON.stringify({ ...parsed, avatarUrl: result.avatarUrl }));
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token, updateName, updatePassword, updateAvatar }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
