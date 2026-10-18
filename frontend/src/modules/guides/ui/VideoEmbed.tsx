import { useState } from 'react';
import { embedUrl, formatDuration, videoThumbnail, type VideoEntry } from '../domain/videos';
import './css/Guides.css';

/**
 * A public video on the page of its guide. Privacy first: only the thumbnail (our own copy) and a
 * play button are shown, and the YouTube player (`youtube-nocookie.com`) is not loaded, so no
 * request and no cookie goes to YouTube, until the person presses play.
 */
export function VideoEmbed({ video }: { video: VideoEntry }) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = videoThumbnail(video);
  return (
    <figure className="video-embed">
      {playing ? (
        <iframe
          className="video-embed-frame"
          src={embedUrl(video.youtubeId as string)}
          title={video.title}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          className="video-embed-play"
          onClick={() => setPlaying(true)}
          aria-label={`Reproducir el vídeo: ${video.title}`}
        >
          {thumbnail && (
            <img src={thumbnail} alt="" width={480} height={270} loading="lazy" decoding="async" />
          )}
          <span className="video-embed-button" aria-hidden="true">
            ▶
          </span>
          {video.durationSeconds && (
            <span className="video-embed-time">{formatDuration(video.durationSeconds)}</span>
          )}
        </button>
      )}
      <figcaption>
        🎬 {video.title}
        {!playing && ' · al pulsar, el vídeo se carga desde YouTube'}
      </figcaption>
    </figure>
  );
}
