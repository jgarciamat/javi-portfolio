import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SiteLink } from '@shared/components/SiteLink';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { brandTitle } from '@shared/utils/pageTitle';
import { findGuide, type Guide } from '../domain/guides';
import { categoryOf } from '../domain/guideCategories';
import { guideTeaser, isOpenGuide } from '../domain/signupWall';
import { GuideCatalog } from './GuideCatalog';
import { GuideBody, GuideHeader, GuideSectionView } from './GuideBody';
import { SignupWall, TeaserOutline, TeaserPreview, useGate } from './SignupWall';
import { VideoEmbed } from './VideoEmbed';
import { PublicGuideLink } from './GuideLinks';
import { HACIENDA_PATH } from '../domain/hacienda';
import { VIDEOS_PATH, youtubeUrl } from '../domain/videos';
import { guideVideo } from '../domain/guideLinks';
import { track } from '@core/analytics';
import { useI18n } from '@core/i18n/I18nContext';
import './css/Hacienda.css';
import '@modules/tools/ui/css/Tools.css';
import './css/Guides.css';

/** What people without an account read of a guide: its beginning and what comes next. */
function GuideTeaserBody({ guide }: { guide: Guide }) {
  const { t } = useI18n();
  const teaser = guideTeaser(guide);
  return (
    <div style={{ ['--cat' as string]: categoryOf(guide.slug).color }}>
      <GuideHeader guide={guide} />
      <TeaserPreview>
        <GuideSectionView
          section={teaser.preview}
          renderLink={(to, label) => (
            <PublicGuideLink to={to} authenticated={false}>
              {label}
            </PublicGuideLink>
          )}
        />
      </TeaserPreview>
      <TeaserOutline title={t('wall.outline.guide')} items={teaser.outline} />
    </div>
  );
}

/** Index of the guides. */
export function GuidesIndexPage() {
  const { t } = useI18n();
  usePageMeta(
    'Guías de finanzas personales y ahorro | Finanverso',
    'Guías claras y cortas para ordenar tu dinero: presupuesto, ahorro, método 50/30/20, fondo de emergencia, interés compuesto y deudas.',
    '/guias',
    false
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
            <SiteLink className={className} to={`/guias/${g.slug}`}>
              {children}
            </SiteLink>
          )}
        />
        <SignupWall variant="cta" />
      </main>
    </div>
  );
}

/** One guide, with a link to its calculator and to related guides. */
export function GuidePage() {
  const { slug } = useParams();
  const gate = useGate();
  const { t } = useI18n();
  const guide = findGuide(slug);
  const video = guide && guideVideo(guide.slug);
  const signedIn = gate === 'open';
  // Open guides (OPEN_GUIDES) are read whole by everybody; the rest, only with an account.
  const whole = signedIn || isOpenGuide(guide?.slug);
  const countView = !!guide && isOpenGuide(guide.slug);
  useEffect(() => {
    if (countView) track('guide_view', { guide: slug as string });
  }, [countView, slug]);
  usePageMeta(
    guide ? brandTitle(guide.title) : 'Guías | Finanverso',
    guide ? guide.description : 'Guías de finanzas personales',
    `/guias/${slug}`,
    false
  );
  if (!guide) return <Navigate to="/guias" replace />;

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <SiteLink className="back-btn" to="/guias">
            ← Todas las guías
          </SiteLink>
        </p>
        {whole ? (
          <>
            <article className="guide-article">
              <h1 className="pricing-title">{guide.title}</h1>
              <GuideBody
                guide={guide}
                renderLink={(to, label) => (
                  <PublicGuideLink to={to} authenticated={signedIn}>
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
                  authenticated={signedIn}
                >
                  🧮 {guide.tool.label}
                </PublicGuideLink>
              </p>
            )}
            {signedIn && video && <VideoEmbed video={video} />}
            {signedIn && video && (
              <p className="guide-tool">
                <a
                  className="btn-secondary"
                  href={youtubeUrl(video.youtubeId as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🎬 Ver en YouTube: {video.title}
                </a>
              </p>
            )}
            {!signedIn && gate === 'closed' && (
              <SignupWall
                variant="soft"
                onRegister={() => track('guide_cta_click', { guide: guide.slug })}
              />
            )}
          </>
        ) : (
          <>
            <article className="guide-article">
              <h1 className="pricing-title">{guide.title}</h1>
              <GuideTeaserBody guide={guide} />
            </article>
            <SignupWall kicker={t('wall.kicker.guide')} />
          </>
        )}
        <section className="guide-related">
          <h2>Sigue leyendo</h2>
          <ul>
            {guide.related.map((slugOfRelated) => {
              const related = findGuide(slugOfRelated);
              return (
                related && (
                  <li key={slugOfRelated}>
                    <SiteLink to={`/guias/${slugOfRelated}`}>{related.title}</SiteLink>
                  </li>
                )
              );
            })}
          </ul>
          <p>
            <Link to={VIDEOS_PATH}>🎬 {t('videos.title')}</Link> ·{' '}
            <Link to={HACIENDA_PATH}>🏛️ {t('hacienda.title')}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
