import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  captureStatus,
  captureSupported,
  configureCapture,
  openCaptureSettings,
} from '@core/capture/notificationCapture';
import { PremiumOnly } from '@modules/billing/ui/PremiumOnly';
import { Icon } from '@shared/components/Icon';
import { CAPTURE_PACKAGES } from '../../domain/bankNotifications';
import { captureEnabled, setCaptureEnabled } from '../../application/capturedPayments';
import '../css/Sections.css';

function CaptureSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(captureEnabled);
  const [access, setAccess] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAccess((await captureStatus()).listenerEnabled);
    } catch {
      setAccess(false);
    }
  }, []);

  useEffect(() => {
    // Keep the service in line with the choice made earlier (also after an update of the app).
    void configureCapture(captureEnabled(), CAPTURE_PACKAGES).catch(() => undefined);
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const toggle = (on: boolean) => {
    setCaptureEnabled(on);
    setEnabled(on);
    void configureCapture(on, CAPTURE_PACKAGES).catch(() => undefined);
  };

  return (
    <div className="card">
      <h2 className="section-title">
        <Icon name="bell" /> {t('app.capture.title')}
      </h2>
      <p className="section-hint">{t('app.capture.hint')}</p>
      <p className="section-hint">{t('app.capture.privacy')}</p>
      <label className="setting-row">
        <span>
          <strong>{t('app.capture.toggle')}</strong>
        </span>
        <input
          type="checkbox"
          className="toggle"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
        />
      </label>
      {enabled && access === false && (
        <div className="capture-access">
          <p className="form-error">{t('app.capture.needsAccess')}</p>
          <button className="btn-secondary" onClick={() => void openCaptureSettings()}>
            {t('app.capture.giveAccess')}
          </button>
        </div>
      )}
      {enabled && access && (
        <p className="section-success">
          <Icon name="checkCircle" /> {t('app.capture.active')}
        </p>
      )}
    </div>
  );
}

/** Android only: detect payments from the notifications of the person's bank apps (Premium). */
export function CaptureCard() {
  if (!captureSupported()) return null;
  return (
    <PremiumOnly icon="bell" titleKey="app.capture.title" hintKey="app.capture.locked">
      <CaptureSettings />
    </PremiumOnly>
  );
}
