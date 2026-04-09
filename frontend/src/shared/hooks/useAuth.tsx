import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AuthUser } from '@modules/auth/domain/types';
import { authApi, registerUnauthorizedHandler } from '@core/api/authApi';

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    register: (email: string, password: string, name: string, turnstileToken?: string) => Promise<string>;
    logout: () => void;
    isAuthenticated: boolean;
    updateName: (name: string) => Promise<void>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateAvatar: (avatarDataUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decode the exp claim from a JWT without verifying signature (client-side only). */
function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch { return true; }
}

function loadUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem('mm_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

/** Load access token from storage, returning null if it is already expired.
 *  If the access token is expired, also clear stale auth data from localStorage. */
function loadToken(): string | null {
    const t = localStorage.getItem('mm_token');
    if (!t || isTokenExpired(t)) {
        // Clear stale data so the app starts with a clean unauthenticated state
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_refresh_token');
        localStorage.removeItem('mm_user');
        return null;
    }
    return t;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(loadToken);
    const [user, setUser] = useState<AuthUser | null>(token ? loadUser : null);

    const persist = (result: { accessToken: string; refreshToken: string; user: AuthUser }) => {
        localStorage.setItem('mm_token', result.accessToken);
        localStorage.setItem('mm_refresh_token', result.refreshToken);
        localStorage.setItem('mm_user', JSON.stringify(result.user));
        setToken(result.accessToken);
        setUser(result.user);
    };

    const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
        const result = await authApi.login({ email, password, turnstileToken });
        persist(result);
    }, []);

    const loginWithGoogle = useCallback(async (idToken: string) => {
        const result = await authApi.googleLogin(idToken);
        persist(result);
    }, []);

    const register = useCallback(async (email: string, password: string, name: string, turnstileToken?: string): Promise<string> => {
        const result = await authApi.register({ email, password, name, turnstileToken });
        return result.message;
    }, []);

    const logout = useCallback(() => {
        // Best-effort: tell backend to revoke the refresh token
        const refreshToken = localStorage.getItem('mm_refresh_token');
        if (refreshToken) {
            authApi.logout(refreshToken).catch(() => { /* ignore network errors on logout */ });
        }
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_refresh_token');
        localStorage.removeItem('mm_user');
        setToken(null);
        setUser(null);
    }, []);

    // Register the unauthorized handler so the API layer can trigger logout when
    // both the access token and refresh token are invalid / expired.
    useEffect(() => {
        registerUnauthorizedHandler(logout);
    }, [logout]);

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
        <AuthContext.Provider value={{ user, token, login, loginWithGoogle, register, logout, isAuthenticated: !!token, updateName, updatePassword, updateAvatar }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
