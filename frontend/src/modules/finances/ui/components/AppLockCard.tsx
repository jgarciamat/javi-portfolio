import { useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  LOCK_TIMEOUTS,
  PIN_MAX,
  PIN_MIN,
  biometricAvailable,
  isValidPin,
  type LockConfig,
} from '@core/security/appLock';
import { useAppLock } from '@shared/hooks/useAppLock';
import '../css/Sections.css';
import { Icon } from '@shared/components/Icon';

type Mode = 'idle' | 'enable' | 'change' | 'disable';

/** A masked field that only takes digits. */
function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="tx-input"
        type="password"
        inputMode="numeric"
        maxLength={PIN_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  );
}

/** The lock is on: the delay, fingerprint / face and the actions. */
function LockOptions({
  config,
  device,
  onMode,
}: {
  config: LockConfig;
  device: boolean;
  onMode: (mode: Mode) => void;
}) {
  const { t } = useI18n();
  const lock = useAppLock();
  return (
    <>
      <p className="section-success">
        <Icon name="checkCircle" /> {t('app.lock.on')}
      </p>
      <label className="field">
        <span className="field-label">{t('app.lock.timeout')}</span>
        <select
          className="tx-input"
          value={config.timeoutSec}
          onChange={(e) => lock.setOptions({ timeoutSec: Number(e.target.value) })}
        >
          {LOCK_TIMEOUTS.map((s) => (
            <option key={s} value={s}>
              {t(`app.lock.timeout.${s}`)}
            </option>
          ))}
        </select>
      </label>
      {device && (
        <label className="plan-terms">
          <input
            type="checkbox"
            checked={config.biometric}
            onChange={(e) => lock.setOptions({ biometric: e.target.checked })}
          />
          <span>{t('app.lock.biometric')}</span>
        </label>
      )}
      <div className="button-row">
        <button className="btn-secondary" onClick={() => onMode('change')}>
          {t('app.lock.change')}
        </button>
        <button className="btn-secondary" onClick={lock.lockNow}>
          {t('app.lock.now')}
        </button>
        <button className="btn-secondary" onClick={() => onMode('disable')}>
          {t('app.lock.disable')}
        </button>
      </div>
    </>
  );
}

/** Settings: turn the PIN lock on or off, change the PIN, fingerprint / face and the delay. */
export function AppLockCard() {
  const { t } = useI18n();
  const lock = useAppLock();
  const [mode, setMode] = useState<Mode>('idle');
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState(false);

  useEffect(() => {
    void biometricAvailable().then(setDevice);
  }, []);

  const close = () => {
    setMode('idle');
    setCurrent('');
    setPin('');
    setRepeat('');
    setError(null);
  };

  const submit = async () => {
    if (mode !== 'disable') {
      if (!isValidPin(pin)) return setError('app.lock.invalidPin');
      if (pin !== repeat) return setError('app.lock.mismatch');
    }
    if (mode === 'enable') await lock.enable(pin, { biometric: device, timeoutSec: 60 });
    else if (mode === 'change' && !(await lock.changePin(current, pin))) {
      return setError('app.lock.wrong');
    } else if (mode === 'disable' && !(await lock.disable(current))) {
      return setError('app.lock.wrong');
    }
    close();
  };

  const config = lock.config;
  const needsCurrent = mode === 'change' || mode === 'disable';

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="lock" /> {t('app.lock.title')}
      </h2>
      <p className="section-hint">{t('app.lock.hint')}</p>
      {mode === 'idle' && !config && (
        <div className="button-row">
          <button className="btn-secondary" onClick={() => setMode('enable')}>
            {t('app.lock.enable')}
          </button>
        </div>
      )}
      {mode === 'idle' && config && (
        <LockOptions config={config} device={device} onMode={setMode} />
      )}
      {mode !== 'idle' && (
        <div className="form-grid">
          {needsCurrent && (
            <PinField label={t('app.lock.currentPin')} value={current} onChange={setCurrent} />
          )}
          {mode !== 'disable' && (
            <>
              <PinField
                label={t('app.lock.newPin', { min: PIN_MIN, max: PIN_MAX })}
                value={pin}
                onChange={setPin}
              />
              <PinField label={t('app.lock.repeatPin')} value={repeat} onChange={setRepeat} />
            </>
          )}
          {error && <p className="form-error">{t(error)}</p>}
          <div className="button-row">
            <button className="btn-primary" onClick={() => void submit()}>
              {t('app.lock.save')}
            </button>
            <button className="btn-secondary" onClick={close}>
              {t('app.common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
