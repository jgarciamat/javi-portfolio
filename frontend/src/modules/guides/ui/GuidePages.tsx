import { Link, Navigate, useParams } from 'react-router-dom';
import { PublicHeader } from '@shared/components/PublicHeader';
import { useAuth } from '@shared/hooks/useAuth';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { GUIDES, findGuide } from '../domain/guides';
import { GuideBody } from './GuideBody';
import '@modules/tools/ui/css/Tools.css';
import './css/Guides.css';

function GuideCta() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;
  return (
    <section className="tools-cta">
      <h2>Controla tu dinero con Money Manager</h2>
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
  usePageMeta(
    'Guías de finanzas personales y ahorro | Money Manager',
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
        <ul className="guide-list">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link to={`/guias/${g.slug}`}>{g.title}</Link>
              <p>{g.description}</p>
            </li>
          ))}
        </ul>
        <GuideCta />
      </main>
    </div>
  );
}

/** One guide, with a link to its calculator and to related guides. */
export function GuidePage() {
  const { slug } = useParams();
  const guide = findGuide(slug);
  usePageMeta(
    guide ? `${guide.title} | Money Manager` : 'Guías | Money Manager',
    guide ? guide.description : 'Guías de finanzas personales',
    `/guias/${slug}`
  );
  if (!guide) return <Navigate to="/guias" replace />;

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <Link to="/guias">← Todas las guías</Link>
        </p>
        <article className="guide-article">
          <h1 className="pricing-title">{guide.title}</h1>
          <GuideBody guide={guide} />
        </article>
        {guide.tool && (
          <p className="guide-tool">
            <Link className="btn-secondary" to={guide.tool.to}>
              🧮 {guide.tool.label}
            </Link>
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
