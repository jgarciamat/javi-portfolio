import { Link, Navigate, useParams } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { useAuth } from '@shared/hooks/useAuth';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { appTarget } from '@shared/utils/appLinks';
import {
  HACIENDA_PATH,
  findHaciendaGuide,
  guideKey,
  haciendaPath,
  type HaciendaTool,
} from '../domain/hacienda';
import { HaciendaCatalog, HaciendaGuideBody } from './HaciendaGuides';
import { GuideCta } from './GuidePages';
import '@modules/tools/ui/css/Tools.css';
import './css/Guides.css';

/** The tools of a step live in the app: straight there when signed in, through the login page if not. */
function PublicTool({ tool, label }: { tool: HaciendaTool; label: string }) {
  const { isAuthenticated } = useAuth();
  return (
    <Link className="btn-secondary" to={appTarget(tool, isAuthenticated)}>
      🧮 {label}
    </Link>
  );
}

/** Index of the «Hacienda paso a paso» guides. */
export function HaciendaIndexPage() {
  const { t } = useI18n();
  usePageMeta(t('hacienda.metaTitle'), t('hacienda.metaDescription'), HACIENDA_PATH);
  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <Link to="/guias">← {t('landing.learn.guides')}</Link>
        </p>
        <h1 className="pricing-title">{t('hacienda.title')}</h1>
        <p className="pricing-subtitle">{t('hacienda.hint')}</p>
        <HaciendaCatalog
          renderLink={(g, className, children) => (
            <Link className={className} to={haciendaPath(g)}>
              {children}
            </Link>
          )}
        />
        <GuideCta />
      </main>
    </div>
  );
}

/** One «Hacienda paso a paso» guide. */
export function HaciendaGuidePage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const guide = findHaciendaGuide(slug);
  usePageMeta(
    guide ? `${t(guideKey(guide, 'title'))} | Finanverso` : t('hacienda.metaTitle'),
    guide ? t(guideKey(guide, 'description')) : t('hacienda.metaDescription'),
    `${HACIENDA_PATH}/${slug}`
  );
  if (!guide) return <Navigate to={HACIENDA_PATH} replace />;

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <Link to={HACIENDA_PATH}>← {t('hacienda.back')}</Link>
        </p>
        <article className="guide-article">
          <h1 className="pricing-title">{t(guideKey(guide, 'title'))}</h1>
          <HaciendaGuideBody
            guide={guide}
            renderTool={(tool, label) => <PublicTool tool={tool} label={label} />}
          />
        </article>
        <GuideCta />
      </main>
    </div>
  );
}
