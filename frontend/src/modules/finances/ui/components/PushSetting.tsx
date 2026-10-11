import { useEffect, useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import {
  currentSubscription,
  pushSupported,
  subscribePush,
  unsubscribePush,
} from '@core/push/push';
import { errorMessage } from '@shared/utils/errors';
import '../css/Sections.css';

/**
 * Settings: push notifications on this device (bills due tomorrow and the Monday summary).
 * Shown where the browser can receive them and the server has the keys.
 */
export function PushSetting() {
  const { pushApi } = useApi();
  const { t } = useI18n();
  const supported = pushSupported();
  const [key, setKey] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let current = true;
    void (async () => {
      try {
        const info = await pushApi.key();
        if (!current || !info.enabled) return;
        setKey(info.publicKey);
        setOn((await currentSubscription()) !== null && Notification.permission === 'granted');
      } catch {
        /* no push: the row stays hidden */
      }
    })();
    return () => {
      current = false;
    };
  }, [supported, pushApi]);

  if (!supported || !key) return null;

  const toggle = async (enable: boolean) => {
    setBusy(true);
    setMessage(null);
    setDenied(false);
    try {
      if (enable) {
        const subscription = await subscribePush(key);
        if (!subscription) {
          setDenied(true);
        } else {
          await pushApi.subscribe(
            subscription as { endpoint: string; keys: { p256dh: string; auth: string } }
          );
          setOn(true);
        }
      } else {
        const endpoint = await unsubscribePush();
        if (endpoint) await pushApi.unsubscribe(endpoint);
        setOn(false);
      }
    } catch (e) {
      setMessage(errorMessage(e, t('app.push.error')));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setMessage(null);
    try {
      const { sent } = await pushApi.test();
      setMessage(t(sent > 0 ? 'app.push.sent' : 'app.push.notSent'));
    } catch (e) {
      setMessage(errorMessage(e, t('app.push.error')));
    }
  };

  return (
    <>
      <label className="setting-row">
        <span>
          <strong>{t('app.push.title')}</strong>
          <small>{t('app.push.hint')}</small>
        </span>
        <input
          type="checkbox"
          className="toggle"
          disabled={busy}
          checked={on}
          onChange={(e) => void toggle(e.target.checked)}
        />
      </label>
      {on && (
        <div className="button-row">
          <button type="button" className="btn-secondary" onClick={() => void test()}>
            {t('app.push.test')}
          </button>
        </div>
      )}
      {denied && <p className="form-error">{t('app.push.denied')}</p>}
      {message && <p className="plan-note">{message}</p>}
    </>
  );
}
