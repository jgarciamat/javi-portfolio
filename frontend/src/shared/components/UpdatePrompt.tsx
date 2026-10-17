import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '@core/i18n/I18nContext';
import { isNativeApp } from '@shared/utils/platform';
import './css/UpdatePrompt.css';

/**
 * Banner shown when a new version of the PWA is ready. The mobile apps carry their own files:
 * they register no service worker and drop the one older versions installed.
 */
export function UpdatePrompt() {
  return isNativeApp() ? <DropServiceWorker /> : <WebUpdatePrompt />;
}

function DropServiceWorker() {
  useEffect(() => {
    void navigator.serviceWorker
      ?.getRegistrations()
      .then((registrations) => registrations.forEach((r) => void r.unregister()));
  }, []);
  return null;
}

function WebUpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <span className="update-prompt__text">🆕 {t('app.update.available')}</span>
      <div className="update-prompt__actions">
        <button
          className="update-prompt__btn update-prompt__btn--update"
          onClick={() => updateServiceWorker(true)}
        >
          {t('app.update.reload')}
        </button>
        <button
          className="update-prompt__btn update-prompt__btn--dismiss"
          onClick={() => setNeedRefresh(false)}
        >
          {t('app.update.later')}
        </button>
      </div>
    </div>
  );
}
