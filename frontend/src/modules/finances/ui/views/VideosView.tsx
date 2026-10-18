import { useI18n } from '@core/i18n/I18nContext';
import { VideoCatalog, VideoChannelLinks, VideoSectionNav } from '@modules/guides/ui/VideoLibrary';
import { usePremiumVideos } from '@modules/guides/application/usePremiumVideos';
import { Icon } from '@shared/components/Icon';
import '../css/Sections.css';

/** «Videoteca»: our YouTube tutorials. Free for everybody, some only with Premium. */
export function VideosView() {
  const { t } = useI18n();
  const premium = usePremiumVideos();
  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="video" /> {t('videos.title')}
        </h2>
        <p className="section-hint">{t('videos.hint')}</p>
        <VideoChannelLinks />
        <VideoSectionNav />
        <VideoCatalog premium={premium} />
      </div>
    </div>
  );
}
