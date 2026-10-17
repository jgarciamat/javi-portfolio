import { Link, Navigate, useParams } from 'react-router-dom';
import { PublicHeader } from '@shared/components/PublicHeader';
import { useAuth } from '@shared/hooks/useAuth';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { findGuide } from '../domain/guides';
import { GuideCatalog } from './GuideCatalog';
import { GuideBody } from './GuideBody';
import { PublicGuideLink } from './GuideLinks';
import { HACIENDA_PATH } from '../domain/hacienda';
import { VIDEOS_PATH } from '../domain/videos';
import { useI18n } from '@core/i18n/I18nContext';
import './css/Hacienda.css';
import '@modules/tools/ui/css/Tools.css';
import './css/Guides.css';

/** Invitation to sign up, for people who read the guides without an account. */
export function GuideCta() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;
  return (
    <section className="tools-cta">
      <h2>Controla tu dinero con Finanverso</h2>
      <p>
        Registra tus gastos, pon presupuestos y metas de ahorro y mira cómo evolucionas cada mes.
        Gratis para empezar, con 14 días de Premium de regalo.
      </p>
      <Link className="btn-primary" to="/login?mode=register">
        Crear mi cuenta gratis
      </Link>
    </section>
  );
}

/** Index of the guides. */
export function GuidesIndexPage() {
  const { t } = useI18n();
  usePageMeta(
    'Guías de finanzas personales y ahorro | Finanverso',
    'Guías claras y cortas para ordenar tu dinero: presupuesto, ahorro, método 50/30/20, fondo de emergencia, interés compuesto y deudas.',
    '/guias'
  );
  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <h1 className="pricing-title">Guías de finanzas personales</h1>
        <p className="pricing-subtitle">
          Explicaciones cortas y sin jerga para ahorrar mejor y controlar tus gastos.
        </p>
        <p className="hacienda-banner">
          <span>🏛️ {t('hacienda.banner')}</span>
          <Link className="btn-secondary" to={HACIENDA_PATH}>
            {t('hacienda.cta')}
          </Link>
        </p>
        <p className="hacienda-banner">
          <span>🎬 {t('videos.banner')}</span>
          <Link className="btn-secondary" to={VIDEOS_PATH}>
            {t('videos.cta')}
          </Link>
        </p>
        <GuideCatalog
          renderLink={(g, className, children) => (
            <Link className={className} to={`/guias/${g.slug}`}>
              {children}
            </Link>
          )}
        />
        <GuideCta />
      </main>
    </div>
  );
}

/** One guide, with a link to its calculator and to related guides. */
export function GuidePage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const guide = findGuide(slug);
  usePageMeta(
    guide ? `${guide.title} | Finanverso` : 'Guías | Finanverso',
    guide ? guide.description : 'Guías de finanzas personales',
    `/guias/${slug}`
  );
  if (!guide) return <Navigate to="/guias" replace />;

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <Link className="back-btn" to="/guias">
            ← Todas las guías
          </Link>
        </p>
        <article className="guide-article">
          <h1 className="pricing-title">{guide.title}</h1>
          <GuideBody
            guide={guide}
            renderLink={(to, label) => (
              <PublicGuideLink to={to} authenticated={isAuthenticated}>
                {label}
              </PublicGuideLink>
            )}
          />
        </article>
        {guide.tool && (
          <p className="guide-tool">
            <PublicGuideLink
              className="btn-secondary"
              to={guide.tool.to}
              authenticated={isAuthenticated}
            >
              🧮 {guide.tool.label}
            </PublicGuideLink>
          </p>
        )}
        <GuideCta />
        <section className="guide-related">
          <h2>Sigue leyendo</h2>
          <ul>
            {guide.related.map((slugOfRelated) => {
              const related = findGuide(slugOfRelated);
              return (
                related && (
                  <li key={slugOfRelated}>
                    <Link to={`/guias/${slugOfRelated}`}>{related.title}</Link>
                  </li>
                )
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
