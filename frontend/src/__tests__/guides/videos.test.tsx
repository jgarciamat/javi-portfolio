import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, screen, within } from '@testing-library/react';
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
  isPublished,
  publishedVideos,
  videoGroups,
  videoThumbnail,
  videoUrl,
  watchId,
  youtubeUrl,
  type VideoEntry,
} from '@modules/guides/domain/videos';
import { VideosView } from '@modules/finances/ui/views/VideosView';
import { HaciendaView } from '@modules/finances/ui/views/HaciendaView';
import { VideosPage } from '@modules/guides/ui/VideosPage';
import { GuidesIndexPage } from '@modules/guides/ui/GuidePages';
import { HaciendaIndexPage } from '@modules/guides/ui/HaciendaPages';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
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
    expect(publishedVideos().every(isPublished)).toBe(true);
    expect(videoGroups()[0].section.id).toBe('start');
  });

  it('marks the Premium videos and keeps their YouTube ids out of the web app', () => {
    const premium = VIDEOS.filter((v) => v.premium);
    expect(premium.map((v) => v.number)).toEqual([
      17, 18, 19, 20, 27, 28, 29, 39, 40, 41, 42, 43, 44,
    ]);
    expect(premium.every((v) => !v.youtubeId && !v.guide)).toBe(true);
    // `published` only means something on a Premium video.
    expect(VIDEOS.filter((v) => v.published).every((v) => v.premium)).toBe(true);
    expect(premium.filter(isPublished).map((v) => v.number)).toEqual([17, 18, 19, 20, 27, 28, 29]);
    // Shown (locked) once published, even without an id here.
    expect(isPublished(entry({ premium: true, published: true }))).toBe(true);
    expect(isPublished(entry({ premium: true }))).toBe(false);
    expect(isPublished(entry({ published: true }))).toBe(false);
    expect(videoGroups([entry({ premium: true, published: true })])).toHaveLength(1);
  });

  it('takes the id of a Premium video from what the server gave', () => {
    const premium = entry({ number: 17, premium: true, published: true });
    expect(watchId(premium, null)).toBeUndefined();
    expect(watchId(premium, { 18: 'b' })).toBeUndefined();
    expect(watchId(premium, { 17: 'a' })).toBe('a');
    expect(watchId(entry({ youtubeId: 'own' }), { 99: 'x' })).toBe('own');
    expect(youtubeUrl('a')).toBe('https://www.youtube.com/watch?v=a');
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
    const list = [
      entry({ guide: 'm303', youtubeId: 'm303id' }),
      entry({ guide: 'm130' }),
      entry({ guide: 'renta', premium: true, published: true }),
    ];
    expect(guideVideoUrl('m303', list)).toBe('https://www.youtube.com/watch?v=m303id');
    expect(guideVideoUrl('m130', list)).toBe('');
    // The guides are public: never a Premium video.
    expect(guideVideoUrl('renta', list)).toBe('');
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

    // Outside the plan provider the Premium videos are locked.
    expect(screen.getAllByRole('link', { name: literal(tr('videos.opens')) })).toHaveLength(
      VIDEOS.filter((v) => v.youtubeId).length
    );
    // Not on YouTube yet: neither the video nor its section are shown.
    expect(screen.queryByText(VIDEOS.find((v) => !isPublished(v))!.title)).not.toBeInTheDocument();
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

  it('has a button per shown section that scrolls to it and moves the focus there', () => {
    const scroll = jest.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scroll;
    try {
      renderWithProviders(<VideosView />);
      const nav = screen.getByRole('navigation', { name: tr('videos.jump') });
      const buttons = within(nav).getAllByRole('button');
      expect(buttons).toHaveLength(videoGroups().length);
      // Sections without published videos get no button.
      expect(
        within(nav).queryByRole('button', { name: literal(tr('videos.section.home')) })
      ).not.toBeInTheDocument();

      const { section } = videoGroups()[1];
      fireEvent.click(
        within(nav).getByRole('button', { name: literal(tr(`videos.section.${section.id}`)) })
      );
      const target = screen.getByRole('region', { name: tr(`videos.section.${section.id}`) });
      expect(target).toHaveAttribute('id', `video-section-${section.id}`);
      expect(target).toHaveAttribute('tabindex', '-1');
      expect(target).toHaveFocus();
      expect(scroll).toHaveBeenCalledTimes(1);
      expect(scroll.mock.contexts[0]).toBe(target);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    } finally {
      Element.prototype.scrollIntoView = original;
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

describe('Videoteca: Premium videos', () => {
  const premiumTitle = VIDEOS.find((v) => v.number === 17)!.title;
  const lockedTitle = VIDEOS.find((v) => v.number === 27)!.title;
  const unlockName = (title: string) => `${tr('videos.premium.unlock')}: ${title}`;
  const youtubeLinks = () =>
    screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.includes('watch?v='));

  it('opens them on YouTube for Premium users, with the ids from the server', async () => {
    const api = createFakeApi();
    renderWithProviders(<VideosView />, { api, plan: true });
    const card = await screen.findByRole('link', { name: literal(premiumTitle) });
    expect(card).toHaveAttribute('href', 'https://www.youtube.com/watch?v=premium17');
    expect(card).toHaveAttribute('target', '_blank');
    expect(within(card).getByText(tr('videos.premium.badge'))).toBeInTheDocument();
    expect(api.videosApi.premium).toHaveBeenCalledTimes(1);
    // One the server did not give stays locked, with nothing to buy.
    expect(screen.queryByRole('link', { name: literal(lockedTitle) })).not.toBeInTheDocument();
    expect(screen.getByText(lockedTitle)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: unlockName(lockedTitle) })).not.toBeInTheDocument();
  });

  it('leaves them locked when the server refuses', async () => {
    const api = createFakeApi();
    api.videosApi.premium.mockRejectedValue(new Error('403'));
    renderWithProviders(<VideosView />, { api, plan: true });
    await act(async () => undefined);
    expect(api.videosApi.premium).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: literal(premiumTitle) })).not.toBeInTheDocument();
    expect(screen.getByText(premiumTitle)).toBeInTheDocument();
  });

  it('shows them locked to free users, with a way to Premium and no YouTube link', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'free', trialDaysLeft: 0 }));
    renderWithProviders(<VideosView />, { api, plan: true });
    const unlock = await screen.findByRole('button', { name: unlockName(premiumTitle) });
    expect(unlock).toHaveTextContent(tr('videos.premium.unlock'));
    expect(api.videosApi.premium).not.toHaveBeenCalled();
    expect(youtubeLinks()).not.toContain('https://www.youtube.com/watch?v=premium17');
    expect(youtubeLinks()).toHaveLength(VIDEOS.filter((v) => v.youtubeId).length);

    // Locked cards: a text badge (the lock is decoration) and their thumbnail.
    const card = unlock.closest('li') as HTMLElement;
    const badge = within(card).getByText(tr('videos.premium.badge'));
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(within(card).getByRole('img', { name: premiumTitle })).toBeInTheDocument();

    fireEvent.click(unlock);
    expect(screen.getByRole('dialog', { name: tr('billing.upgradeTitle') })).toBeInTheDocument();
  });

  it('waits for the plan before offering anything', () => {
    const api = createFakeApi();
    api.billingApi.get.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<VideosView />, { api, plan: true });
    expect(screen.getByText(premiumTitle)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: unlockName(premiumTitle) })
    ).not.toBeInTheDocument();
    expect(api.videosApi.premium).not.toHaveBeenCalled();
  });

  it('shows a locked video without a thumbnail as a plain tile', () => {
    VIDEOS.push(entry({ premium: true, published: true, thumbnail: false }));
    try {
      renderWithProviders(<VideosView />);
      const card = screen.getByRole('link', { name: unlockName('Un vídeo') }).closest('li')!;
      expect(within(card as HTMLElement).queryByRole('img')).not.toBeInTheDocument();
    } finally {
      VIDEOS.pop();
    }
  });

  it('on the public page, keeps a section of locked videos and leads to the plans', () => {
    const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
    renderWithProviders(
      <Routes>
        <Route path="/videoteca" element={<VideosPage />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      { authenticated: false, route: '/videoteca' }
    );
    // «Inversión» only has Premium videos so far: still there, as a hook.
    const nav = screen.getByRole('navigation', { name: tr('videos.jump') });
    expect(
      within(nav).getByRole('button', { name: literal(tr('videos.section.invest')) })
    ).toBeInTheDocument();
    const invest = screen.getByRole('region', { name: tr('videos.section.invest') });
    expect(within(invest).queryByRole('link', { name: literal(tr('videos.opens')) })).toBeNull();
    expect(within(invest).getAllByText(tr('videos.premium.badge')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('link', { name: unlockName(premiumTitle) }));
    expect(screen.getByTestId('where')).toHaveTextContent('/pricing');
  });
});
