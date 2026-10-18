import { Link } from 'react-router-dom';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { scrollBehavior } from '@shared/utils/motion';
import {
  YOUTUBE_CHANNEL_URL,
  YOUTUBE_SUBSCRIBE_URL,
  formatDuration,
  videoGroups,
  videoThumbnail,
  watchId,
  youtubeUrl,
  type VideoEntry,
  type VideoSectionId,
} from '../domain/videos';
import type { PremiumUnlock, PremiumVideos } from '../application/usePremiumVideos';
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

/** The id of a section of the catalogue, the target of its button in {@link VideoSectionNav}. */
const sectionId = (id: VideoSectionId) => `video-section-${id}`;

/** One button per section shown in the catalogue: it scrolls to it and moves the focus there. */
export function VideoSectionNav() {
  const { t } = useI18n();
  const jump = (id: VideoSectionId) => {
    // Every button has its section: both lists come from videoGroups().
    const target = document.getElementById(sectionId(id)) as HTMLElement;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  };
  return (
    <nav className="video-jump" aria-label={t('videos.jump')}>
      <ul>
        {videoGroups().map(({ section }) => (
          <li key={section.id}>
            <button
              type="button"
              className="video-jump-chip"
              style={{ ['--cat' as string]: section.color }}
              onClick={() => jump(section.id)}
            >
              <span aria-hidden="true">{section.emoji}</span> {t(`videos.section.${section.id}`)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Thumbnail (or a plain tile) with the duration on it. */
function VideoThumb({ video, duration }: { video: VideoEntry; duration: string | null }) {
  const thumbnail = videoThumbnail(video);
  return (
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
  );
}

/** «Premium», with a lock that is only decoration. */
function PremiumBadge() {
  const { t } = useI18n();
  return (
    <span className="video-premium">
      <Icon name="lock" size={14} /> {t('videos.premium.badge')}
    </span>
  );
}

/** A Premium video for someone without Premium: no link to YouTube, a way to Premium instead. */
function LockedVideoCard({
  video,
  duration,
  unlock,
}: {
  video: VideoEntry;
  duration: string | null;
  unlock: PremiumUnlock | null;
}) {
  const { t } = useI18n();
  const text = t('videos.premium.unlock');
  const label = `${text}: ${video.title}`;
  return (
    <li className="video-card video-card-locked">
      <div className="video-card-body">
        <VideoThumb video={video} duration={duration} />
        <span className="video-title">{video.title}</span>
        <PremiumBadge />
        {unlock &&
          ('to' in unlock ? (
            <Link className="btn-primary video-unlock" to={unlock.to} aria-label={label}>
              {text}
            </Link>
          ) : (
            <button
              type="button"
              className="btn-primary video-unlock"
              onClick={unlock.onClick}
              aria-label={label}
            >
              {text}
            </button>
          ))}
      </div>
    </li>
  );
}

/** One video: the whole card opens it on YouTube in a new tab (locked when it is Premium). */
function VideoCard({ video, premium }: { video: VideoEntry; premium: PremiumVideos }) {
  const { t } = useI18n();
  const duration = video.durationSeconds ? formatDuration(video.durationSeconds) : null;
  const id = watchId(video, premium.ids);
  if (!id) return <LockedVideoCard video={video} duration={duration} unlock={premium.unlock} />;
  const label = `${video.title}${duration ? ` (${duration})` : ''}. ${t('videos.opens')}`;
  return (
    <li className="video-card">
      <a href={youtubeUrl(id)} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <VideoThumb video={video} duration={duration} />
        <span className="video-title">{video.title}</span>
        {video.premium && <PremiumBadge />}
        <span className="video-watch">
          <Icon name="youtube" size={16} /> {t('videos.watch')}
        </span>
      </a>
    </li>
  );
}

/**
 * The published videos grouped by section; sections without any are left out. Premium videos are
 * shown to everybody, locked unless `premium` has their ids.
 */
export function VideoCatalog({ premium }: { premium: PremiumVideos }) {
  const { t } = useI18n();
  return (
    <div className="guide-catalog">
      {videoGroups().map(({ section, videos }) => (
        <section
          key={section.id}
          id={sectionId(section.id)}
          tabIndex={-1}
          aria-labelledby={`${sectionId(section.id)}-title`}
          className="guide-group video-group"
          style={{ ['--cat' as string]: section.color }}
        >
          <header className="guide-group-head">
            <span className="guide-group-emoji" aria-hidden="true">
              {section.emoji}
            </span>
            <div>
              <h2 id={`${sectionId(section.id)}-title`}>{t(`videos.section.${section.id}`)}</h2>
              <p>{t('videos.count', { n: videos.length })}</p>
            </div>
          </header>
          <ul className="video-cards">
            {videos.map((v) => (
              <VideoCard key={v.number} video={v} premium={premium} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
