import { useI18n } from '@core/i18n/I18nContext';
import { storeListingUrl } from '@core/review/review';
import { Icon } from '@shared/components/Icon';
import '../css/Sections.css';

/**
 * «Danos tu opinión» in the settings: the same two ways for everybody, the Play listing and an
 * e-mail, with no question before (Google Play's rules for reviews). The review sheet itself is
 * only requested after an achievement (`askForReview`), never from a button.
 */
export function RatePrompt() {
  const { t } = useI18n();
  return (
    <div className="card rate-prompt" role="region" aria-label={t('app.rate.title')}>
      <h2 className="section-title">
        <Icon name="star" /> {t('app.rate.title')}
      </h2>
      <p className="section-hint">{t('app.rate.hint')}</p>
      <div className="button-row">
        <a
          className="btn-secondary"
          href={storeListingUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('app.rate.store')}
        </a>
        <a
          className="btn-secondary"
          href="mailto:support@finanverso.app?subject=Finanverso%3A%20sugerencias"
        >
          {t('app.rate.write')}
        </a>
      </div>
    </div>
  );
}
