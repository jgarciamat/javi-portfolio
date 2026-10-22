import { useId, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import {
  appleDevice,
  currentBrowser,
  dismissInstallHint,
  shouldShowInstallHint,
} from '@core/install/iosInstall';
import { InstallGuideDialog } from './InstallGuide';
import './css/InstallGuide.css';

/**
 * A discreet, non-blocking notice for whoever opens the web on an iPhone or iPad in Chrome or Safari:
 * how to put Finanverso on the home screen. Not shown once opened from the icon, nor after "Not now"
 * or "Show me how" on this device.
 */
export function IosInstallHint() {
  const { t } = useI18n();
  const titleId = useId();
  const [visible, setVisible] = useState(() => shouldShowInstallHint());
  const [guide, setGuide] = useState(false);
  const [device] = useState(() => appleDevice(currentBrowser()) ?? 'iphone');

  const close = (showGuide: boolean) => {
    dismissInstallHint();
    setVisible(false);
    setGuide(showGuide);
  };

  if (guide) return <InstallGuideDialog onClose={() => setGuide(false)} />;
  if (!visible) return null;
  return (
    <section className="install-hint" aria-labelledby={titleId}>
      <h2 id={titleId} className="install-hint-title">
        {t(`install.hint.title.${device}`)}
      </h2>
      <p className="install-hint-body">{t('install.hint.body')}</p>
      <div className="install-hint-actions">
        <button
          type="button"
          className="btn-secondary install-big-btn"
          onClick={() => close(false)}
        >
          {t('install.hint.dismiss')}
        </button>
        <button type="button" className="btn-primary install-big-btn" onClick={() => close(true)}>
          {t('install.hint.show')}
        </button>
      </div>
    </section>
  );
}
