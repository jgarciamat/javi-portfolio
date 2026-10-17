import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import es from '@locales/es.json';
import en from '@locales/en.json';
import {
  VIDEOS,
  VIDEO_SECTIONS,
  YOUTUBE_CHANNEL_URL,
  YOUTUBE_SUBSCRIBE_URL,
  formatDuration,
  guideVideoUrl,
  publishedVideos,
  videoGroups,
  videoThumbnail,
  videoUrl,
  type VideoEntry,
} from '@modules/guides/domain/videos';
import { VideosView } from '@modules/finances/ui/views/VideosView';
import { HaciendaView } from '@modules/finances/ui/views/HaciendaView';
import { VideosPage } from '@modules/guides/ui/VideosPage';
import { GuidesIndexPage } from '@modules/guides/ui/GuidePages';
import { HaciendaIndexPage } from '@modules/guides/ui/HaciendaPages';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const entry = (over: Partial<VideoEntry>): VideoEntry => ({
  number: 99,
  section: 'home',
  title: 'Un vídeo',
  ...over,
});

describe('Videoteca: catalogue', () => {
  it('has unique numbers, known sections, names in both languages and a thumbnail file', () => {
    const numbers = VIDEOS.map((v) => v.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    for (const s of VIDEO_SECTIONS) {
      expect(`videos.section.${s.id}` in es).toBe(true);
      expect(`videos.section.${s.id}` in en).toBe(true);
    }
    for (const v of VIDEOS) {
      expect(VIDEO_SECTIONS.some((s) => s.id === v.section)).toBe(true);
      const thumb = videoThumbnail(v);
      expect(thumb && existsSync(join(__dirname, '../../../public', thumb))).toBe(true);
    }
  });

  it('shows only the published videos and hides empty sections', () => {
    const list = [
      entry({ number: 1, section: 'start', youtubeId: 'a' }),
      entry({ number: 2, section: 'start' }),
      entry({ number: 3, section: 'invest' }),
    ];
    expect(publishedVideos(list).map((v) => v.number)).toEqual([1]);
    expect(videoGroups(list).map((g) => g.section.id)).toEqual(['start']);
    expect(publishedVideos().every((v) => v.youtubeId)).toBe(true);
    expect(videoGroups()[0].section.id).toBe('start');
  });

  it('builds links, thumbnails and durations', () => {
    expect(videoUrl(entry({ youtubeId: 'xyz' }))).toBe('https://www.youtube.com/watch?v=xyz');
    expect(videoThumbnail(entry({ number: 7 }))).toBe('/videos/07.webp');
    expect(videoThumbnail(entry({ thumbnail: false }))).toBeUndefined();
    expect(formatDuration(302)).toBe('5:02');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(YOUTUBE_SUBSCRIBE_URL).toBe(`${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`);
  });

  it('links each Hacienda guide to its video once it is published', () => {
    const list = [entry({ guide: 'm303', youtubeId: 'm303id' }), entry({ guide: 'm130' })];
    expect(guideVideoUrl('m303', list)).toBe('https://www.youtube.com/watch?v=m303id');
    expect(guideVideoUrl('m130', list)).toBe('');
    expect(VIDEOS.filter((v) => v.guide).map((v) => [v.number, v.guide])).toEqual([
      [21, 'renta'],
      [22, 'm303'],
      [23, 'm130'],
      [24, 'start'],
    ]);
  });
});

describe('Videoteca in the app', () => {
  it('links to the channel and to every published video, in a new tab', () => {
    renderWithProviders(<VideosView />);
    expect(screen.getByRole('heading', { name: tr('videos.title') })).toBeInTheDocument();
    const channel = screen.getByRole('link', { name: tr('videos.channel') });
    expect(channel).toHaveAttribute('href', YOUTUBE_CHANNEL_URL);
    expect(channel).toHaveAttribute('target', '_blank');
    expect(channel).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: tr('videos.subscribe') })).toHaveAttribute(
      'href',
      YOUTUBE_SUBSCRIBE_URL
    );

    const first = VIDEOS[0];
    const card = screen.getByRole('link', { name: literal(`${first.title} (5:03)`) });
    expect(card).toHaveAttribute('href', `https://www.youtube.com/watch?v=${first.youtubeId}`);
    expect(card).toHaveAttribute('target', '_blank');
    expect(card).toHaveAttribute('rel', 'noopener noreferrer');
    const img = within(card).getByRole('img', { name: first.title });
    expect(img).toHaveAttribute('src', '/videos/01.webp');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '480');
    expect(within(card).getByText(tr('videos.watch'))).toBeInTheDocument();

    expect(screen.getAllByRole('link', { name: literal(tr('videos.opens')) })).toHaveLength(
      publishedVideos().length
    );
    // Not on YouTube yet: neither the video nor its section are shown.
    expect(screen.queryByText(VIDEOS[20].title)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: tr('videos.section.home') })
    ).not.toBeInTheDocument();
  });

  it('shows a plain tile and no badge when a video has no thumbnail or duration', () => {
    VIDEOS.push(entry({ youtubeId: 'new', thumbnail: false }));
    try {
      renderWithProviders(<VideosView />);
      expect(screen.getByRole('heading', { name: tr('videos.section.home') })).toBeInTheDocument();
      const card = screen.getByRole('link', { name: `Un vídeo. ${tr('videos.opens')}` });
      expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    } finally {
      VIDEOS.pop();
    }
  });

  it('is shown in English too', () => {
    renderWithProviders(<VideosView />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: 'Video library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the YouTube channel' })).toBeInTheDocument();
  });

  it('is announced in «Hacienda paso a paso»', () => {
    const onOpenTab = jest.fn();
    renderWithProviders(<HaciendaView onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByRole('button', { name: tr('videos.cta') }));
    expect(onOpenTab).toHaveBeenCalledWith('videos');
  });
});

describe('Videoteca on the public site', () => {
  const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
  const renderAt = (route: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/guias" element={<GuidesIndexPage />} />
        <Route path="/hacienda-paso-a-paso" element={<HaciendaIndexPage />} />
        <Route path="/videoteca" element={<VideosPage />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      { authenticated: false, route }
    );

  it('has its own page with the videos', () => {
    renderAt('/videoteca');
    expect(screen.getByRole('heading', { name: tr('videos.title'), level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: literal(VIDEOS[0].title) })).toBeInTheDocument();
    expect(document.title).toBe(tr('videos.metaTitle'));
  });

  it('is linked from the guides and from «Hacienda paso a paso»', () => {
    for (const route of ['/guias', '/hacienda-paso-a-paso']) {
      const { unmount } = renderAt(route);
      fireEvent.click(screen.getByRole('link', { name: tr('videos.cta') }));
      expect(
        screen.getByRole('heading', { name: tr('videos.title'), level: 1 })
      ).toBeInTheDocument();
      unmount();
    }
  });
});
