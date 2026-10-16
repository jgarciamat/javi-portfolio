import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { FAQ, PLAY_URL, faqJsonLd } from '../domain/landing';
import './css/Landing.css';

const FEATURES = [
  { icon: 'calendar', key: 'overview' },
  { icon: 'target', key: 'budgets' },
  { icon: 'trend', key: 'forecast' },
  { icon: 'repeat', key: 'subscriptions' },
  { icon: 'upload', key: 'import' },
  { icon: 'handshake', key: 'together' },
  { icon: 'sparkles', key: 'ai' },
  { icon: 'heart', key: 'health' },
  { icon: 'target', key: 'debts' },
  { icon: 'file', key: 'renta' },
  { icon: 'briefcase', key: 'autonomos' },
  { icon: 'coins', key: 'invest' },
  { icon: 'book', key: 'learn' },
  { icon: 'mail', key: 'receipts' },
  { icon: 'lock', key: 'privacy' },
] as const;

const SHOTS = ['home', 'budgets', 'forecast', 'subscriptions'] as const;
/** What visitors without a session see at the home address: what the app does and why to try it. */
export function LandingPage() {
  const { t } = useI18n();
  usePageMeta(t('landing.meta.title'), t('landing.meta.description'), '/');

  return (
    <div className="landing">
      <PublicHeader />
      <main>
        <section className="landing-hero">
          <h1>{t('landing.hero.title')}</h1>
          <p>{t('landing.hero.subtitle')}</p>
          <div className="landing-cta">
            <Link className="btn-primary" to="/login?mode=register">
              {t('landing.cta.register')}
            </Link>
            <Link className="btn-secondary" to="/login">
              {t('landing.cta.login')}
            </Link>
          </div>
          <p className="landing-note">{t('landing.cta.note')}</p>
          <a className="landing-play" href={PLAY_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="download" /> {t('landing.cta.play')}
          </a>
        </section>

        <section className="landing-shots" aria-label={t('landing.shots.title')}>
          {SHOTS.map((s) => (
            <figure key={s}>
              <img
                src={`/landing/${s}.webp`}
                alt={t(`landing.shots.${s}`)}
                width="360"
                height="640"
                loading="lazy"
              />
            </figure>
          ))}
        </section>

        <section className="landing-section">
          <h2>{t('landing.features.title')}</h2>
          <ul className="landing-features">
            {FEATURES.map((f) => (
              <li key={f.key}>
                <Icon name={f.icon} size={22} />
                <h3>{t(`landing.features.${f.key}.title`)}</h3>
                <p>{t(`landing.features.${f.key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-section landing-plans">
          <h2>{t('landing.plans.title')}</h2>
          <p>{t('landing.plans.body')}</p>
          <Link className="btn-secondary" to="/pricing">
            {t('landing.plans.link')}
          </Link>
        </section>

        <section className="landing-section">
          <h2>{t('landing.faq.title')}</h2>
          <div className="landing-faq">
            {FAQ.map((id) => (
              <details key={id}>
                <summary>{t(`landing.faq.${id}.q`)}</summary>
                <p>{t(`landing.faq.${id}.a`)}</p>
              </details>
            ))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(t) }} />
        </section>

        <section className="landing-section">
          <h2>{t('landing.learn.title')}</h2>
          <ul className="landing-links">
            <li>
              <Link to="/guias">{t('landing.learn.guides')}</Link>
            </li>
            <li>
              <Link to="/calculadora-50-30-20">{t('tools.rule.nav')}</Link>
            </li>
            <li>
              <Link to="/simulador-ahorro">{t('tools.savings.nav')}</Link>
            </li>
          </ul>
        </section>
      </main>
      <footer className="landing-footer">
        <Link to="/privacy">{t('app.privacy.link')}</Link>
        <Link to="/terms">{t('billing.terms')}</Link>
        <Link to="/pricing">{t('pricing.link')}</Link>
        <Link to="/guias">{t('landing.learn.guides')}</Link>
      </footer>
    </div>
  );
}
