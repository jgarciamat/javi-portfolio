import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { PublicHeader } from '@shared/components/PublicHeader';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { VIDEOS_PATH } from '../domain/videos';
import { GuideCta } from './GuidePages';
import { VideoCatalog, VideoChannelLinks } from './VideoLibrary';
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
          <Link to="/guias">← {t('landing.learn.guides')}</Link>
        </p>
        <h1 className="pricing-title">{t('videos.title')}</h1>
        <p className="pricing-subtitle">{t('videos.hint')}</p>
        <VideoChannelLinks />
        <VideoCatalog />
        <GuideCta />
      </main>
    </div>
  );
}
