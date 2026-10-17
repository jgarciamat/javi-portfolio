import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import {
  YOUTUBE_CHANNEL_URL,
  YOUTUBE_SUBSCRIBE_URL,
  formatDuration,
  videoGroups,
  videoThumbnail,
  videoUrl,
  type VideoEntry,
} from '../domain/videos';
import './css/Guides.css';
import './css/Videos.css';

/** «Ver el canal de YouTube» and «Suscribirme». */
export function VideoChannelLinks() {
  const { t } = useI18n();
  return (
    <p className="video-channel">
      <a
        className="btn-primary"
        href={YOUTUBE_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name="youtube" /> {t('videos.channel')}
      </a>
      <a
        className="btn-secondary"
        href={YOUTUBE_SUBSCRIBE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('videos.subscribe')}
      </a>
    </p>
  );
}

/** One video: the whole card opens it on YouTube in a new tab. */
function VideoCard({ video }: { video: VideoEntry }) {
  const { t } = useI18n();
  const duration = video.durationSeconds ? formatDuration(video.durationSeconds) : null;
  const thumbnail = videoThumbnail(video);
  const label = `${video.title}${duration ? ` (${duration})` : ''}. ${t('videos.opens')}`;
  return (
    <li className="video-card">
      <a href={videoUrl(video)} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <span className="video-thumb">
          {thumbnail ? (
            <img src={thumbnail} alt={video.title} width={480} height={270} loading="lazy" />
          ) : (
            <span className="video-thumb-empty" aria-hidden="true">
              <Icon name="video" size={32} />
            </span>
          )}
          {duration && <span className="video-duration">{duration}</span>}
        </span>
        <span className="video-title">{video.title}</span>
        <span className="video-watch">
          <Icon name="youtube" size={16} /> {t('videos.watch')}
        </span>
      </a>
    </li>
  );
}

/** The published videos grouped by section; sections without any are left out. */
export function VideoCatalog() {
  const { t } = useI18n();
  return (
    <div className="guide-catalog">
      {videoGroups().map(({ section, videos }) => (
        <section
          key={section.id}
          className="guide-group"
          style={{ ['--cat' as string]: section.color }}
        >
          <header className="guide-group-head">
            <span className="guide-group-emoji" aria-hidden="true">
              {section.emoji}
            </span>
            <div>
              <h2>{t(`videos.section.${section.id}`)}</h2>
              <p>{t('videos.count', { n: videos.length })}</p>
            </div>
          </header>
          <ul className="video-cards">
            {videos.map((v) => (
              <VideoCard key={v.number} video={v} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
