import { useI18n } from '@core/i18n/I18nContext';
import { useOnlineStatus } from '@shared/hooks/useOnlineStatus';

/** Warns that nothing will be saved while the device is offline. */
export function OfflineBanner() {
  const { t } = useI18n();
  if (useOnlineStatus()) return null;
  return (
    <div className="offline-banner" role="status">
      <span aria-hidden="true">📡</span> {t('app.offline.banner')}
    </div>
  );
}
