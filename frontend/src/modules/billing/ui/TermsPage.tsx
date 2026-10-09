import { useI18n } from '@core/i18n/I18nContext';
import { useGoBack } from '@shared/hooks/useGoBack';
import '@modules/auth/ui/css/PrivacyPolicy.css';

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11'];

/** Terms of sale. The seller's legal details are filled in from the locale files. */
export function TermsPage() {
  const { t } = useI18n();
  const goBack = useGoBack();

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <button className="privacy-back-btn" onClick={goBack} type="button">
            {t('app.privacy.back')}
          </button>
          <div className="privacy-header-text">
            <h1 className="privacy-title">{t('terms.title')}</h1>
            <p className="privacy-subtitle">{t('terms.updated')}</p>
          </div>
        </header>
        {SECTIONS.map((s) => (
          <section key={s} className="privacy-section">
            <h2 className="privacy-section-title">{t(`terms.${s}.title`)}</h2>
            <p>{t(`terms.${s}.body`)}</p>
          </section>
        ))}
        <footer className="privacy-footer">{t('app.privacy.footer')}</footer>
      </div>
    </div>
  );
}
