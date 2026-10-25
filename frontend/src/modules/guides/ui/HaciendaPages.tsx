import { Link, Navigate, useParams } from 'react-router-dom';
import { SiteLink } from '@shared/components/SiteLink';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { brandTitle } from '@shared/utils/pageTitle';
import { appTabPath } from '@shared/utils/appLinks';
import {
  HACIENDA_PATH,
  findHaciendaGuide,
  guideKey,
  haciendaPath,
  stepKey,
  type HaciendaGuide,
  type HaciendaTool,
} from '../domain/hacienda';
import { VIDEOS_PATH, haciendaVideo } from '../domain/videos';
import { HACIENDA_COLOR, HaciendaCatalog, HaciendaGuideBody } from './HaciendaGuides';
import './css/Hacienda.css';
import { SignupWall, TeaserOutline, TeaserPreview, useGate } from './SignupWall';
import { haciendaTeaser } from '../domain/signupWall';
import { VideoEmbed } from './VideoEmbed';
import '@modules/tools/ui/css/Tools.css';
import './css/Guides.css';

/** The tools of a step live in the app (only people with an account see the steps). */
function PublicTool({ tool, label }: { tool: HaciendaTool; label: string }) {
  return (
    <Link className="btn-secondary" to={appTabPath(tool)}>
      🧮 {label}
    </Link>
  );
}

/** What people without an account read of a guide: the first step and the titles of the rest. */
function HaciendaTeaserBody({ guide }: { guide: HaciendaGuide }) {
  const { t } = useI18n();
  const { preview, outline } = haciendaTeaser(guide);
  return (
    <div className="hacienda-guide" style={{ ['--cat' as string]: HACIENDA_COLOR }}>
      <p className="guide-kicker">
        <span className="guide-kicker-tag">
          {guide.emoji} {t('hacienda.title')}
        </span>
        <span>{t('hacienda.stepsCount', { n: guide.steps.length })}</span>
      </p>
      <p className="guide-intro">{t(guideKey(guide, 'intro'))}</p>
      <TeaserPreview>
        <ol className="hacienda-steps">
          <li className="hacienda-step" aria-label={t('hacienda.step', { n: 1 })}>
            <h2>
              <span className="hacienda-step-n" aria-hidden="true">
                1
              </span>
              {t(stepKey(guide, preview.step, 'title'))}
            </h2>
            {preview.paragraphs.map((n) => (
              <p key={n}>{t(stepKey(guide, preview.step, `p${n}`))}</p>
            ))}
          </li>
        </ol>
      </TeaserPreview>
      <TeaserOutline
        title={t('wall.outline.hacienda')}
        items={[
          ...outline.map((step, i) => `${i + 2}. ${t(stepKey(guide, step, 'title'))}`),
          t('hacienda.deadlines'),
          t('hacienda.links'),
        ]}
      />
    </div>
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
          <SiteLink className="back-btn" to="/guias">
            ← {t('landing.learn.guides')}
          </SiteLink>
        </p>
        <h1 className="pricing-title">{t('hacienda.title')}</h1>
        <p className="pricing-subtitle">{t('hacienda.hint')}</p>
        <p className="hacienda-banner">
          <span>🎬 {t('videos.banner')}</span>
          <Link className="btn-secondary" to={VIDEOS_PATH}>
            {t('videos.cta')}
          </Link>
        </p>
        <HaciendaCatalog
          renderLink={(g, className, children) => (
            <Link className={className} to={haciendaPath(g)}>
              {children}
            </Link>
          )}
        />
        <SignupWall variant="cta" />
      </main>
    </div>
  );
}

/** One «Hacienda paso a paso» guide. */
export function HaciendaGuidePage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const gate = useGate();
  const guide = findHaciendaGuide(slug);
  usePageMeta(
    guide ? brandTitle(t(guideKey(guide, 'title'))) : t('hacienda.metaTitle'),
    guide ? t(guideKey(guide, 'description')) : t('hacienda.metaDescription'),
    `${HACIENDA_PATH}/${slug}`
  );
  if (!guide) return <Navigate to={HACIENDA_PATH} replace />;
  const video = haciendaVideo(guide.id);

  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <Link className="back-btn" to={HACIENDA_PATH}>
            ← {t('hacienda.back')}
          </Link>
        </p>
        <article className="guide-article">
          <h1 className="pricing-title">{t(guideKey(guide, 'title'))}</h1>
          {gate === 'open' ? (
            <HaciendaGuideBody
              guide={guide}
              renderTool={(tool, label) => <PublicTool tool={tool} label={label} />}
            />
          ) : (
            <HaciendaTeaserBody guide={guide} />
          )}
        </article>
        {gate === 'open' && video && <VideoEmbed video={video} />}
        <SignupWall kicker={t('wall.kicker.hacienda', { n: guide.steps.length })} />
      </main>
    </div>
  );
}
