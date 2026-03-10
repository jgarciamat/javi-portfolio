import { useI18n } from '@core/i18n/I18nContext';
import { useNavigate } from 'react-router-dom';
import './css/PrivacyPolicy.css';

export function PrivacyPolicyPage() {
    const { t } = useI18n();
    const navigate = useNavigate();

    return (
        <div className="privacy-page">
            <div className="privacy-container">

                <header className="privacy-header">
                    <button
                        className="privacy-back-btn"
                        onClick={() => navigate(-1)}
                        type="button"
                    >
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
                    <ul>
                        <li>{t('app.privacy.s2.item1')}</li>
                        <li>{t('app.privacy.s2.item2')}</li>
                        <li>{t('app.privacy.s2.item3')}</li>
                        <li>{t('app.privacy.s2.item4')}</li>
                        <li>{t('app.privacy.s2.item5')}</li>
                    </ul>
                </section>

                {/* Section 3 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s3.title')}</h2>
                    <p>{t('app.privacy.s3.intro')}</p>
                    <ul>
                        <li>{t('app.privacy.s3.item1')}</li>
                        <li>{t('app.privacy.s3.item2')}</li>
                        <li>{t('app.privacy.s3.item3')}</li>
                    </ul>
                    <p><em>{t('app.privacy.s3.noMarketing')}</em></p>
                </section>

                {/* Section 4 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s4.title')}</h2>
                    <p>{t('app.privacy.s4.p1')}</p>
                    <ul>
                        <li>{t('app.privacy.s4.item1')}</li>
                        <li>{t('app.privacy.s4.item2')}</li>
                        <li>{t('app.privacy.s4.item3')}</li>
                    </ul>
                </section>

                {/* Section 5 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s5.title')}</h2>
                    <p>{t('app.privacy.s5.p1')}</p>
                </section>

                {/* Section 6 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s6.title')}</h2>
                    <p>{t('app.privacy.s6.p1')}</p>
                    <ul>
                        <li>{t('app.privacy.s6.item1')}</li>
                        <li>{t('app.privacy.s6.item2')}</li>
                        <li>{t('app.privacy.s6.item3')}</li>
                        <li>{t('app.privacy.s6.item4')}</li>
                    </ul>
                </section>

                {/* Section 7 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s7.title')}</h2>
                    <p>{t('app.privacy.s7.intro')}</p>
                    <ul>
                        <li>{t('app.privacy.s7.item1')}</li>
                        <li>{t('app.privacy.s7.item2')}</li>
                        <li>{t('app.privacy.s7.item3')}</li>
                        <li>{t('app.privacy.s7.item4')}</li>
                        <li>{t('app.privacy.s7.item5')}</li>
                        <li>{t('app.privacy.s7.item6')}</li>
                    </ul>
                </section>

                {/* Section 8 */}
                <section className="privacy-section">
                    <h2 className="privacy-section-title">{t('app.privacy.s8.title')}</h2>
                    <p>{t('app.privacy.s8.p1')}</p>
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
                    <p><strong>{t('app.privacy.s11.steps')}</strong></p>
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
                        📧{' '}
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
