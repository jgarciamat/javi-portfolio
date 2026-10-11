import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  type LockConfig,
  clearLock,
  loadLock,
  saveLock,
  updateLockOptions,
  verifyPin,
} from '@core/security/appLock';
import { useAuth } from './useAuth';

interface AppLockValue {
  config: LockConfig | null;
  locked: boolean;
  enable: (pin: string, options: { biometric: boolean; timeoutSec: number }) => Promise<void>;
  /** Changes the PIN: only with the current one. */
  changePin: (current: string, next: string) => Promise<boolean>;
  setOptions: (options: Partial<Pick<LockConfig, 'biometric' | 'timeoutSec'>>) => void;
  /** Turns the lock off: only with the PIN. */
  disable: (pin: string) => Promise<boolean>;
  unlock: (pin: string) => Promise<boolean>;
  /** Unlocked by the device (fingerprint / face). */
  unlockedByDevice: () => void;
  lockNow: () => void;
}

const AppLockContext = createContext<AppLockValue | null>(null);

/**
 * Locks the signed-in app on start and after it stayed in the background longer than the
 * chosen time. Signing out forgets the lock: the PIN belongs to that session.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [config, setConfig] = useState<LockConfig | null>(loadLock);
  const [locked, setLocked] = useState(() => loadLock() !== null);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'anonymous') return;
    clearLock();
    setConfig(null);
    setLocked(false);
  }, [status]);

  useEffect(() => {
    if (!config) return;
    const onChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      const left = hiddenAt.current;
      hiddenAt.current = null;
      if (left !== null && Date.now() - left >= config.timeoutSec * 1000) setLocked(true);
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [config]);

  const enable = useCallback(
    async (pin: string, options: { biometric: boolean; timeoutSec: number }) => {
      setConfig(await saveLock(pin, options));
    },
    []
  );

  const value = useMemo<AppLockValue>(
    () => ({
      config,
      locked: locked && config !== null,
      enable,
      changePin: async (current, next) => {
        if (!config || !(await verifyPin(config, current))) return false;
        setConfig(
          await saveLock(next, { biometric: config.biometric, timeoutSec: config.timeoutSec })
        );
        return true;
      },
      setOptions: (options) => {
        if (config) setConfig(updateLockOptions(config, options));
      },
      disable: async (pin) => {
        if (!config || !(await verifyPin(config, pin))) return false;
        clearLock();
        setConfig(null);
        setLocked(false);
        return true;
      },
      unlock: async (pin) => {
        if (!config || !(await verifyPin(config, pin))) return false;
        setLocked(false);
        return true;
      },
      unlockedByDevice: () => setLocked(false),
      lockNow: () => setLocked(true),
    }),
    [config, locked, enable]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}
