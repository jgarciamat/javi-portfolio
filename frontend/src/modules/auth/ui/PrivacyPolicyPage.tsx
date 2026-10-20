import { useI18n } from '@core/i18n/I18nContext';
import { useGoBack } from '@shared/hooks/useGoBack';
import './css/PrivacyPolicy.css';
import { Icon } from '@shared/components/Icon';

/** The list of a section: `app.privacy.<section>.item1`…`item<count>`. */
function Items({ section, count }: { section: string; count: number }) {
  const { t } = useI18n();
  return (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>{t(`app.privacy.${section}.item${i + 1}`)}</li>
      ))}
    </ul>
  );
}

// Revisar con un abogado: los textos (app.privacy.* en es.json/en.json) describen lo que hace
// el código a 20/10/2026; las dudas abiertas están en docs/legal/RESUMEN-CAMBIOS-PRIVACIDAD.md.
export function PrivacyPolicyPage() {
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
            <h1 className="privacy-title">{t('app.privacy.title')}</h1>
            <p className="privacy-subtitle">{t('app.privacy.updated')}</p>
          </div>
        </header>

        {/* Section 1 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s1.title')}</h2>
          <p>{t('app.privacy.s1.body')}</p>
        </section>

        {/* Section 2 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s2.title')}</h2>
          <p>{t('app.privacy.s2.intro')}</p>
          <Items section="s2" count={17} />
        </section>

        {/* Section 3 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s3.title')}</h2>
          <p>{t('app.privacy.s3.intro')}</p>
          <Items section="s3" count={11} />
          <p>{t('app.privacy.s3.withdraw')}</p>
          <p>
            <em>{t('app.privacy.s3.noMarketing')}</em>
          </p>
        </section>

        {/* Section 4 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s4.title')}</h2>
          <p>{t('app.privacy.s4.p1')}</p>
          <Items section="s4" count={9} />
          <p>{t('app.privacy.s4.p2')}</p>
        </section>

        {/* Section 5 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s5.title')}</h2>
          <p>{t('app.privacy.s5.p1')}</p>
          <Items section="s5" count={10} />
        </section>

        {/* Section 6 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s6.title')}</h2>
          <p>{t('app.privacy.s6.p1')}</p>
          <Items section="s6" count={9} />
        </section>

        {/* Section 7 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s7.title')}</h2>
          <p>{t('app.privacy.s7.intro')}</p>
          <Items section="s7" count={6} />
          <p>{t('app.privacy.s7.how')}</p>
        </section>

        {/* Section 8 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s8.title')}</h2>
          <p>{t('app.privacy.s8.p1')}</p>
          <Items section="s8" count={6} />
          <p>{t('app.privacy.s8.p3')}</p>
          <p>{t('app.privacy.s8.p2')}</p>
        </section>

        {/* Section 9 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s9.title')}</h2>
          <p>{t('app.privacy.s9.p1')}</p>
        </section>

        {/* Section 10 */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s10.title')}</h2>
          <p>{t('app.privacy.s10.p1')}</p>
        </section>

        {/* Section 11 – Account Deletion */}
        <section className="privacy-section">
          <h2 className="privacy-section-title">{t('app.privacy.s11.title')}</h2>
          <p>{t('app.privacy.s11.p1')}</p>
          <p>
            <strong>{t('app.privacy.s11.steps')}</strong>
          </p>
          <ol>
            <li>{t('app.privacy.s11.step1')}</li>
            <li>{t('app.privacy.s11.step2')}</li>
            <li>{t('app.privacy.s11.step3')}</li>
            <li>{t('app.privacy.s11.step4')}</li>
          </ol>
          <p>{t('app.privacy.s11.p2')}</p>
        </section>

        {/* Contact */}
        <div className="privacy-contact">
          <h2 className="privacy-section-title">{t('app.privacy.contact.title')}</h2>
          <p>{t('app.privacy.contact.body')}</p>
          <p>
            <Icon name="mail" />{' '}
            <a href={`mailto:${t('app.privacy.contact.email')}`} className="privacy-link">
              {t('app.privacy.contact.email')}
            </a>
          </p>
          <p>
            🌐{' '}
            <a
              href={t('app.privacy.contact.web')}
              target="_blank"
              rel="noopener noreferrer"
              className="privacy-link"
            >
              {t('app.privacy.contact.web')}
            </a>
          </p>
        </div>

        <footer className="privacy-footer">{t('app.privacy.footer')}</footer>
      </div>
    </div>
  );
}
