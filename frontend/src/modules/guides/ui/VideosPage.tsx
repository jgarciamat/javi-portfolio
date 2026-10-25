import { SiteLink } from '@shared/components/SiteLink';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { VIDEOS_PATH } from '../domain/videos';
import { PUBLIC_PREMIUM_VIDEOS } from '../application/usePremiumVideos';
import { SignupWall } from './SignupWall';
import { VideoCatalog, VideoChannelLinks, VideoSectionNav } from './VideoLibrary';
import '@modules/tools/ui/css/Tools.css';

/** Public «Videoteca»: our YouTube tutorials. */
export function VideosPage() {
  const { t } = useI18n();
  usePageMeta(t('videos.metaTitle'), t('videos.metaDescription'), VIDEOS_PATH);
  return (
    <div className="pricing-page">
      <PublicHeader />
      <main className="pricing-main tools-main guide-main">
        <p className="guide-back">
          <SiteLink className="back-btn" to="/guias">
            ← {t('landing.learn.guides')}
          </SiteLink>
        </p>
        <h1 className="pricing-title">{t('videos.title')}</h1>
        <p className="pricing-subtitle">{t('videos.hint')}</p>
        <VideoChannelLinks />
        <VideoSectionNav />
        <VideoCatalog premium={PUBLIC_PREMIUM_VIDEOS} />
        <SignupWall variant="cta" />
      </main>
    </div>
  );
}
