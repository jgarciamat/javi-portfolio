import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { biometricUnlock } from '@core/security/appLock';
import { useAppLock } from '@shared/hooks/useAppLock';
import { useAuth } from '@shared/hooks/useAuth';
import './css/LockScreen.css';
import { Icon } from '@shared/components/Icon';

const MAX_FAILURES = 5;
const WAIT_MS = 30_000;

/** Full-screen PIN (or fingerprint / face) prompt shown while the app is locked. */
export function LockScreen() {
  const { t } = useI18n();
  const { config, unlock, unlockedByDevice } = useAppLock();
  const { logout } = useAuth();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [waitUntil, setWaitUntil] = useState(0);
  const failures = useRef(0);
  const settings = config as NonNullable<typeof config>;

  const askDevice = async () => {
    if (await biometricUnlock(t('app.lock.biometricReason'), t('app.lock.usePin')))
      unlockedByDevice();
  };

  useEffect(() => {
    if (settings.biometric) void askDevice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async (value: string) => {
    if (await unlock(value)) return;
    failures.current += 1;
    setWrong(true);
    setPin('');
    if (failures.current % MAX_FAILURES === 0) setWaitUntil(Date.now() + WAIT_MS);
  };

  const change = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, settings.pinLength);
    setPin(digits);
    setWrong(false);
    if (digits.length === settings.pinLength) void check(digits);
  };

  const blocked = Date.now() < waitUntil;

  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label={t('app.lock.title')}>
      <div className="lock-card">
        <div className="lock-icon" aria-hidden="true">
          <Icon name="lock" />
        </div>
        <h1>{t('app.lock.title')}</h1>
        <label className="lock-field">
          <span>{t('app.lock.enterPin')}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={settings.pinLength}
            value={pin}
            disabled={blocked}
            onChange={(e) => change(e.target.value)}
            aria-label={t('app.lock.enterPin')}
          />
        </label>
        {wrong && !blocked && (
          <p className="form-error" role="alert">
            {t('app.lock.wrong')}
          </p>
        )}
        {blocked && (
          <p className="form-error" role="alert">
            {t('app.lock.tooMany')}
          </p>
        )}
        {settings.biometric && (
          <button className="btn-secondary" onClick={() => void askDevice()}>
            <Icon name="shield" /> {t('app.lock.useBiometric')}
          </button>
        )}
        <button className="lock-forgot" onClick={logout}>
          {t('app.lock.forgot')}
        </button>
      </div>
    </div>
  );
}
