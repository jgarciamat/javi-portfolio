import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '@core/i18n/I18nContext';
import './css/UpdatePrompt.css';

/** Banner shown when a new version of the PWA is ready. */
export function UpdatePrompt() {
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
