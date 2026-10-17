import { useI18n } from '@core/i18n/I18nContext';
import { VideoCatalog, VideoChannelLinks, VideoSectionNav } from '@modules/guides/ui/VideoLibrary';
import { Icon } from '@shared/components/Icon';
import '../css/Sections.css';

/** «Videoteca»: our YouTube tutorials. Free for everybody. */
export function VideosView() {
  const { t } = useI18n();
  return (
    <div className="section-view">
      <div className="card">
        <h2 className="section-title">
          <Icon name="video" /> {t('videos.title')}
        </h2>
        <p className="section-hint">{t('videos.hint')}</p>
        <VideoChannelLinks />
        <VideoSectionNav />
        <VideoCatalog />
      </div>
    </div>
  );
}
