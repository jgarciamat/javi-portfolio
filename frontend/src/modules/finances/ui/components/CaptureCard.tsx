import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  captureStatus,
  captureSupported,
  openCaptureSettings,
} from '@core/capture/notificationCapture';
import { requestNotificationPermission } from '@core/notifications/notifications';
import { useOptionalPlan } from '@modules/billing/application/PlanContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import {
  captureAlert,
  captureConsented,
  captureEnabled,
  forgetCaptured,
  learningEnabled,
  setCaptureAlert,
  setCaptureConsent,
  setCaptureEnabled,
  setLearningEnabled,
  syncCapture,
  type CaptureAlert,
} from '../../application/capturedPayments';
import '../css/Sections.css';

const ALERTS: CaptureAlert[] = ['daily', 'each', 'off'];

/**
 * What the detection reads, what it does not and where it stays, said before the system settings
 * open (Google Play asks for this prominent disclosure). Without «Entendido» nothing is opened.
 */
function CaptureDisclosure({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal label={t('app.capture.disclosure.title')} onClose={onClose}>
      <div className="capture-disclosure">
        <h2>{t('app.capture.disclosure.title')}</h2>
        <p>{t('app.capture.disclosure.intro')}</p>
        <ul>
          <li>
            <strong>{t('app.capture.disclosure.readsTitle')}</strong>{' '}
            {t('app.capture.disclosure.reads')}
          </li>
          <li>
            <strong>{t('app.capture.disclosure.notTitle')}</strong>{' '}
            {t('app.capture.disclosure.not')}
          </li>
          <li>
            <strong>{t('app.capture.disclosure.whereTitle')}</strong>{' '}
            {t('app.capture.disclosure.where')}
          </li>
          <li>
            <strong>{t('app.capture.disclosure.offTitle')}</strong>{' '}
            {t('app.capture.disclosure.off')}
          </li>
        </ul>
        <div className="button-row">
          <button className="btn-primary review-btn" onClick={onAccept}>
            {t('app.capture.disclosure.accept')}
          </button>
          <button className="btn-secondary review-btn" onClick={onClose}>
            {t('app.capture.disclosure.later')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Whether Android gave the access to the notifications (unknown while it is asked). */
function AccessStatus({
  access,
  onGiveAccess,
}: {
  access: boolean | null;
  onGiveAccess: () => void;
}) {
  const { t } = useI18n();
  if (access === null) return null;
  return access ? (
    <p className="section-success">
      <Icon name="checkCircle" /> {t('app.capture.active')}
    </p>
  ) : (
    <div className="capture-access">
      <p className="form-error">{t('app.capture.needsAccess')}</p>
      <button className="btn-secondary" onClick={onGiveAccess}>
        {t('app.capture.giveAccess')}
      </button>
    </div>
  );
}

/** How to be told about the payments to review, and whether «Para revisar» learns rules. */
function CaptureOptions() {
  const { t } = useI18n();
  const [alert, setAlert] = useState(captureAlert);
  const [learn, setLearn] = useState(learningEnabled);

  const chooseAlert = (next: CaptureAlert) => {
    setCaptureAlert(next);
    setAlert(next);
    void (async () => {
      if (next !== 'off') await requestNotificationPermission().catch(() => false);
      await syncCapture(t);
    })();
  };

  return (
    <>
      <fieldset className="capture-alerts">
        <legend>{t('app.capture.alert.title')}</legend>
        {ALERTS.map((option) => (
          <label key={option} className="setting-row">
            <span>{t(`app.capture.alert.${option}`)}</span>
            <input
              type="radio"
              name="capture-alert"
              checked={alert === option}
              onChange={() => chooseAlert(option)}
            />
          </label>
        ))}
      </fieldset>
      <label className="setting-row">
        <span>
          <strong>{t('app.capture.learn')}</strong>
          <small>{t('app.capture.learnHint')}</small>
        </span>
        <input
          type="checkbox"
          className="toggle"
          checked={learn}
          onChange={(e) => {
            setLearningEnabled(e.target.checked);
            setLearn(e.target.checked);
          }}
        />
      </label>
    </>
  );
}

/** Android only: detect payments from the notifications of the person's bank apps. */
function CaptureSettings() {
  const { t } = useI18n();
  const plan = useOptionalPlan();
  const [enabled, setEnabled] = useState(captureEnabled);
  const [access, setAccess] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const limit = plan?.overview?.limits.resources.captures;
  const used = plan?.overview?.usage.captures ?? 0;

  const refresh = useCallback(async () => {
    try {
      setAccess((await captureStatus()).listenerEnabled);
    } catch {
      setAccess(false);
    }
  }, []);

  useEffect(() => {
    void syncCapture(t);
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // The texts of the alerts only matter when the service is configured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const accept = async () => {
    setAsking(false);
    setCaptureConsent(true);
    setCaptureEnabled(true);
    setEnabled(true);
    await syncCapture(t);
    if (captureAlert() !== 'off') await requestNotificationPermission().catch(() => false);
    if (!access) await openCaptureSettings();
  };

  const toggle = (on: boolean) => {
    if (on) {
      setAsking(true);
      return;
    }
    setCaptureEnabled(false);
    setCaptureConsent(false);
    forgetCaptured();
    setEnabled(false);
    void syncCapture(t);
  };

  const giveAccess = () => {
    if (captureConsented()) void openCaptureSettings();
    else setAsking(true);
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
      {typeof limit === 'number' && (
        <p className="section-hint">{t('app.capture.freeLimit', { used, limit })}</p>
      )}
      {enabled && (
        <>
          <AccessStatus access={access} onGiveAccess={giveAccess} />
          <CaptureOptions />
        </>
      )}
      {asking && (
        <CaptureDisclosure onAccept={() => void accept()} onClose={() => setAsking(false)} />
      )}
    </div>
  );
}

/** Android only: detect payments from the notifications of the person's bank apps (every plan). */
export function CaptureCard() {
  if (!captureSupported()) return null;
  return <CaptureSettings />;
}
