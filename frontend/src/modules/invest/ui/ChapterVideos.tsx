import { useI18n } from '@core/i18n/I18nContext';
import { usePremiumVideos } from '@modules/guides/application/usePremiumVideos';
import { VIDEOS, isPublished } from '@modules/guides/domain/videos';
import { VideoCard } from '@modules/guides/ui/VideoLibrary';

/**
 * Our Videoteca videos on the topic of a chapter, by number. A Premium one is shown locked to
 * whoever has no Premium, as in the Videoteca; one not on YouTube yet is left out.
 */
export function ChapterVideos({ numbers }: { numbers: number[] }) {
  const { t } = useI18n();
  const premium = usePremiumVideos();
  const videos = VIDEOS.filter((v) => numbers.includes(v.number) && isPublished(v));
  if (videos.length === 0) return null;
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
