import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { stableContext } from '@shared/utils/stableContext';
import {
  isTwoFactorChallenge,
  type AuthResult,
  type AuthUser,
  type SignInResult,
  type TwoFactorChallenge,
} from '@modules/auth/domain/types';
import { authApi } from '@core/api/authApi';
import {
  isAccessTokenExpired,
  refreshAccessToken,
  registerSessionExpiredHandler,
  tokenStore,
} from '@core/api/http';
import type { Locale } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import { clearLocalUserData } from '@shared/utils/localData';
import { setSessionOpen } from './sessionSignal';

/** 'loading' while a stored session is being restored with the refresh token. */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** True right after signing in with a password or Google (not when a session is restored). */
  freshSignIn: boolean;
  /** Marks the fresh sign-in as handled (the welcome tour asks once per sign-in). */
  acknowledgeSignIn: () => void;
  /** True when signed in; false when the second step (2FA code) is still to come. */
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (token: string, locale?: Locale) => Promise<boolean>;
  /** Set between the password (or Google) and the 2FA code. */
  twoFactorChallenge: TwoFactorChallenge | null;
  /** Sends the code (of the app or a recovery code) of the pending sign-in. */
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
  register: (email: string, password: string, name: string, locale?: Locale) => Promise<string>;
  logout: () => void;
  /**
   * Forgets the session and every local trace of the person, "remember me" included,
   * without calling the API (after deleting the account).
   */
  endSession: () => void;
  logoutEverywhere: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updatePassword: (currentPassword: string | undefined, newPassword: string) => Promise<void>;
  updateAvatar: (avatar: string | null) => Promise<void>;
}

const AuthContext = stableContext<AuthContextValue | null>('AuthContext', null);
const USER_KEY = 'mm_user';

/**
 * The stored user. Copies saved before pictures were dropped may still carry the old photo
 * (`avatarUrl`, a data URL): it is removed from the device the first time it is read.
 */
function loadUser(): AuthUser | null {
  const stored = storage.getJSON<(AuthUser & { avatarUrl?: unknown }) | null>(USER_KEY, null);
  if (!stored || !('avatarUrl' in stored)) return stored;
  const { avatarUrl: _picture, ...user } = stored;
  saveUser(user);
  return user;
}

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

/** Password, Google and the 2FA code: what opens a session, handed to `persist`. */
function useSignIn(persist: (result: AuthResult) => void) {
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  const open = useCallback(
    (result: AuthResult) => {
      setTwoFactorChallenge(null);
      persist(result);
    },
    [persist]
  );

  /** Opens the session, or keeps the challenge when the account asks for a 2FA code. */
  const signIn = useCallback(
    (result: SignInResult): boolean => {
      if (isTwoFactorChallenge(result)) {
        setTwoFactorChallenge(result);
        return false;
      }
      open(result);
      return true;
    },
    [open]
  );

  const login = useCallback(
    async (email: string, password: string) => signIn(await authApi.login({ email, password })),
    [signIn]
  );

  const loginWithGoogle = useCallback(
    async (googleToken: string, locale?: Locale) =>
      signIn(await authApi.googleLogin(googleToken, locale)),
    [signIn]
  );

  const verifyTwoFactor = useCallback(
    async (code: string) =>
      open(await authApi.verifyTwoFactor(twoFactorChallenge!.challengeToken, code)),
    [open, twoFactorChallenge]
  );

  const cancelTwoFactor = useCallback(() => setTwoFactorChallenge(null), []);

  return { login, loginWithGoogle, twoFactorChallenge, verifyTwoFactor, cancelTwoFactor };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initialState);
  const [status, setStatus] = useState<AuthStatus>(initial.status);
  const [token, setToken] = useState<string | null>(initial.token);
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [freshSignIn, setFreshSignIn] = useState(false);

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

  useEffect(() => setSessionOpen(status !== 'anonymous'), [status]);

  useEffect(() => {
    registerSessionExpiredHandler(clearSession);
    return () => registerSessionExpiredHandler(null);
  }, [clearSession]);

  const persist = useCallback((result: AuthResult) => {
    tokenStore.setSession(result.accessToken, result.refreshToken);
    saveUser(result.user);
    setToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
    setFreshSignIn(true);
  }, []);

  const acknowledgeSignIn = useCallback(() => setFreshSignIn(false), []);

  const { login, loginWithGoogle, twoFactorChallenge, verifyTwoFactor, cancelTwoFactor } =
    useSignIn(persist);

  const register = useCallback(
    async (email: string, password: string, name: string, locale?: Locale): Promise<string> => {
      const result = await authApi.register({ email, password, name, locale });
      return result.message;
    },
    []
  );

  /** Signing out also wipes the person's data on this device (drafts, captured payments…). */
  const signOut = useCallback(
    (keepRememberedEmail: boolean) => {
      clearLocalUserData({ keepRememberedEmail });
      clearSession();
    },
    [clearSession]
  );

  const logout = useCallback(() => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
    signOut(true);
  }, [signOut]);

  const endSession = useCallback(() => signOut(false), [signOut]);

  const logoutEverywhere = useCallback(async () => {
    await authApi.logoutEverywhere();
    signOut(true);
  }, [signOut]);

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
    async (avatar: string | null) =>
      updateUser({ avatar: (await authApi.updateAvatar(avatar)).avatar }),
    [updateUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isAuthenticated: status === 'authenticated',
      freshSignIn,
      acknowledgeSignIn,
      login,
      loginWithGoogle,
      twoFactorChallenge,
      verifyTwoFactor,
      cancelTwoFactor,
      register,
      logout,
      endSession,
      logoutEverywhere,
      updateName,
      updatePassword,
      updateAvatar,
    }),
    [
      user,
      token,
      status,
      freshSignIn,
      acknowledgeSignIn,
      login,
      loginWithGoogle,
      twoFactorChallenge,
      verifyTwoFactor,
      cancelTwoFactor,
      register,
      logout,
      endSession,
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
