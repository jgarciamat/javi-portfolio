import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { errorCode } from '@core/api/http';
import { useI18n } from '@core/i18n/I18nContext';
import { errorMessage } from '@shared/utils/errors';
import type { TwoFactorProof, TwoFactorSetup, TwoFactorStatus } from '../domain/types';

/** What the card shows: the status, or one step of a change. */
export type TwoFactorMode = 'idle' | 'identity' | 'scan' | 'codes' | 'disable' | 'regenerate';

const ERROR_KEYS: Record<string, string> = {
  INVALID_TWO_FACTOR_CODE: 'app.twoFactor.error.invalid',
  TWO_FACTOR_LOCKED: 'app.twoFactor.error.locked',
  TWO_FACTOR_SETUP_EXPIRED: 'app.twoFactor.error.setupExpired',
  WRONG_PASSWORD: 'app.twoFactor.error.wrongPassword',
  RATE_LIMITED: 'app.auth.error.rateLimited',
};

/** Settings → Security: turn two-step verification on or off and renew the recovery codes. */
export function useTwoFactorSettings() {
  const { authApi } = useApi();
  const { t } = useI18n();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [mode, setMode] = useState<TwoFactorMode>('idle');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const messageFor = useCallback(
    (err: unknown): string => {
      const key = ERROR_KEYS[errorCode(err) ?? ''];
      return key ? t(key) : errorMessage(err, t('app.twoFactor.error.generic'));
    },
    [t]
  );

  const load = useCallback(async () => {
    setStatus(await authApi.twoFactorStatus());
  }, [authApi]);

  useEffect(() => {
    load().catch((err: unknown) => setError(messageFor(err)));
  }, [load, messageFor]);

  const run = async (work: () => Promise<void>) => {
    // The buttons are only aria-disabled while sending: ignore a second click.
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setPending(false);
    }
  };

  const open = (next: TwoFactorMode) => {
    setError(null);
    setMode(next);
  };

  const close = () => {
    setMode('idle');
    setSetup(null);
    setRecoveryCodes([]);
    setError(null);
  };

  return {
    status,
    mode,
    setup,
    recoveryCodes,
    error,
    pending,
    open,
    close,
    /** Proves who it is and gets the secret to scan. */
    start: (proof: { password?: string }) =>
      run(async () => {
        setSetup(await authApi.twoFactorSetup(proof));
        setMode('scan');
      }),
    /** The first code of the app turns it on; the recovery codes are shown once. */
    confirm: (code: string) =>
      run(async () => {
        const result = await authApi.twoFactorEnable(code);
        setSetup(null);
        setRecoveryCodes(result.recoveryCodes);
        setMode('codes');
        await load();
      }),
    disable: (proof: TwoFactorProof) =>
      run(async () => {
        await authApi.twoFactorDisable(proof);
        setMode('idle');
        await load();
      }),
    regenerate: (proof: TwoFactorProof) =>
      run(async () => {
        const result = await authApi.twoFactorRecoveryCodes(proof);
        setRecoveryCodes(result.recoveryCodes);
        setMode('codes');
        await load();
      }),
  };
}
