import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@modules/auth/domain/types';
import { authApi } from '@core/api/authApi';
import {
  isAccessTokenExpired,
  refreshAccessToken,
  registerSessionExpiredHandler,
  tokenStore,
} from '@core/api/http';
import type { Locale } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';

/** 'loading' while a stored session is being restored with the refresh token. */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string, locale?: Locale) => Promise<void>;
  register: (email: string, password: string, name: string, locale?: Locale) => Promise<string>;
  logout: () => void;
  /** Forgets the session locally without calling the API (e.g. after deleting the account). */
  endSession: () => void;
  logoutEverywhere: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updatePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>;
  updateAvatar: (avatarDataUrl: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'mm_user';

const loadUser = (): AuthUser | null => storage.getJSON<AuthUser | null>(USER_KEY, null);

function saveUser(user: AuthUser | null): void {
  if (user) storage.setJSON(USER_KEY, user);
  else storage.set(USER_KEY, null);
}

/** Initial state: a valid access token means signed in; a refresh token means "restore it". */
function initialStatus(): AuthStatus {
  if (!isAccessTokenExpired(tokenStore.getAccess())) return 'authenticated';
  return tokenStore.getRefresh() ? 'loading' : 'anonymous';
}

function initialState(): { status: AuthStatus; token: string | null; user: AuthUser | null } {
  const status = initialStatus();
  return {
    status,
    token: status === 'authenticated' ? tokenStore.getAccess() : null,
    user: status === 'anonymous' ? null : loadUser(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initialState);
  const [status, setStatus] = useState<AuthStatus>(initial.status);
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<AuthUser | null>(initial.user);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    saveUser(null);
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Restore an expired session once at start-up (the old code logged the user out here).
  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    refreshAccessToken().then((fresh) => {
      if (cancelled) return;
      if (fresh) {
        setToken(fresh);
        setStatus('authenticated');
      } else if (!tokenStore.getRefresh()) {
        clearSession();
      } else {
        // Offline or server error: keep the session and let the next request retry.
        setToken(tokenStore.getAccess());
        setStatus('authenticated');
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(clearSession);
    return () => registerSessionExpiredHandler(null);
  }, [clearSession]);

  const persist = useCallback(
    (result: { accessToken: string; refreshToken: string; user: AuthUser }) => {
      tokenStore.setSession(result.accessToken, result.refreshToken);
      saveUser(result.user);
      setToken(result.accessToken);
      setUser(result.user);
      setStatus('authenticated');
    },
    []
  );

  const login = useCallback(
    async (email: string, password: string) => persist(await authApi.login({ email, password })),
    [persist]
  );

  const loginWithGoogle = useCallback(
    async (googleToken: string, locale?: Locale) =>
      persist(await authApi.googleLogin(googleToken, locale)),
    [persist]
  );

  const register = useCallback(
    async (email: string, password: string, name: string, locale?: Locale): Promise<string> => {
      const result = await authApi.register({ email, password, name, locale });
      return result.message;
    },
    []
  );

  const logout = useCallback(() => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const logoutEverywhere = useCallback(async () => {
    await authApi.logoutEverywhere();
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((changes: Partial<AuthUser>) => {
    setUser((u) => {
      const next = u ? { ...u, ...changes } : u;
      saveUser(next);
      return next;
    });
  }, []);

  const updateName = useCallback(
    async (name: string) => updateUser({ name: (await authApi.updateName(name)).name }),
    [updateUser]
  );

  const updatePassword = useCallback(
    async (currentPassword: string | undefined, newPassword: string) => {
      const result = await authApi.updatePassword(currentPassword, newPassword);
      // Every other session was closed by the API; this device gets new tokens.
      tokenStore.setSession(result.accessToken, result.refreshToken);
      setToken(result.accessToken);
      updateUser({ hasPassword: true });
    },
    [updateUser]
  );

  const updateAvatar = useCallback(
    async (avatarDataUrl: string | null) =>
      updateUser({ avatarUrl: (await authApi.updateAvatar(avatarDataUrl)).avatarUrl }),
    [updateUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      loginWithGoogle,
      register,
      logout,
      endSession: clearSession,
      logoutEverywhere,
      updateName,
      updatePassword,
      updateAvatar,
    }),
    [
      user,
      token,
      status,
      login,
      loginWithGoogle,
      register,
      logout,
      clearSession,
      logoutEverywhere,
      updateName,
      updatePassword,
      updateAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
