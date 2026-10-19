import { useI18n } from '@core/i18n/I18nContext';
import { usePremiumVideos } from '@modules/guides/application/usePremiumVideos';
import { VIDEOS, isPublished, type VideoEntry } from '@modules/guides/domain/videos';
import { VideoCard } from '@modules/guides/ui/VideoLibrary';

function VideoList({ videos }: { videos: VideoEntry[] }) {
  const { t } = useI18n();
  const premium = usePremiumVideos();
  return (
    <section className="inv-videos" aria-label={t('app.invest.learn.videos')}>
      <h3 className="inv-h">{t('app.invest.learn.videos')}</h3>
      <ul className="video-cards">
        {videos.map((v) => (
          <VideoCard key={v.number} video={v} premium={premium} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Our Videoteca videos on the topic of a chapter, by number. A Premium one is shown locked to
 * whoever has no Premium, as in the Videoteca; one not on YouTube yet is left out (and without
 * any, nothing is shown nor asked to the server).
 */
export function ChapterVideos({ numbers = [] }: { numbers?: number[] }) {
  const videos = VIDEOS.filter((v) => numbers.includes(v.number) && isPublished(v));
  return videos.length > 0 ? <VideoList videos={videos} /> : null;
}
