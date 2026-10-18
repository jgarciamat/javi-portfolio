import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { tokenStore } from '@core/api/http';
import { VIDEOS, type VideoEntry } from '@modules/guides/domain/videos';
import { GUIDES } from '@modules/guides/domain/guides';
import { HACIENDA_GUIDES, type HaciendaGuide } from '@modules/guides/domain/hacienda';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import {
  PREVIEW_PARAGRAPHS,
  WELCOME_VIDEO_NUMBER,
  guideTeaser,
  haciendaTeaser,
  loginHref,
  minutesOf,
  registerHref,
  wallNumbers,
  welcomeVideo,
} from '@modules/guides/domain/signupWall';
import { GuidePage } from '@modules/guides/ui/GuidePages';
import { renderWithProviders, tr } from '@test-utils/render';

beforeEach(() => localStorage.clear());

describe('the teaser of the guides', () => {
  it('cuts the first section and lists the headings of the rest, sources included', () => {
    const guide = GUIDES.find((g) => g.sources)!;
    const teaser = guideTeaser(guide);
    expect(teaser.preview.heading).toBe(guide.sections[0].heading);
    expect(teaser.preview.paragraphs).toEqual(
      guide.sections[0].paragraphs.slice(0, PREVIEW_PARAGRAPHS)
    );
    expect(teaser.outline).toEqual([
      ...guide.sections.slice(1).map((s) => s.heading),
      'Fuentes oficiales',
    ]);
    const plain = GUIDES.find((g) => !g.sources)!;
    expect(guideTeaser(plain).outline).not.toContain('Fuentes oficiales');
  });

  it('shows at most two paragraphs of the first step of a Hacienda guide', () => {
    const [guide] = HACIENDA_GUIDES;
    expect(haciendaTeaser(guide).preview.paragraphs).toEqual([1, 2]);
    expect(haciendaTeaser(guide).outline).toEqual(guide.steps.slice(1));
    const short: HaciendaGuide = {
      ...guide,
      steps: [{ ...guide.steps[0], paragraphs: 1 }, ...guide.steps.slice(1)],
    };
    expect(haciendaTeaser(short).preview.paragraphs).toEqual([1]);
  });
});

describe('the wall', () => {
  it('signs up or in and comes back to the page', () => {
    expect(registerHref('/guias/x')).toBe('/login?mode=register&next=%2Fguias%2Fx');
    expect(loginHref('/calculadora-iva')).toBe('/login?next=%2Fcalculadora-iva');
  });

  it('counts its numbers from the catalogues', () => {
    expect(wallNumbers()).toEqual({
      guides: GUIDES.length,
      hacienda: HACIENDA_GUIDES.length,
      tools: TOOL_PAGES.length,
    });
  });

  it('only offers the welcome video while it is public', () => {
    const video = welcomeVideo()!;
    expect(video.number).toBe(WELCOME_VIDEO_NUMBER);
    expect(video.youtubeId).toBeTruthy();
    expect(minutesOf(video)).toBe(Math.round((video.durationSeconds as number) / 60));
    const premium: VideoEntry = { ...video, premium: true };
    expect(welcomeVideo([premium])).toBeUndefined();
    expect(welcomeVideo([{ ...video, youtubeId: undefined }])).toBeUndefined();
    expect(welcomeVideo([])).toBeUndefined();
    expect(minutesOf({ ...video, durationSeconds: undefined })).toBe(1);
    expect(minutesOf({ ...video, durationSeconds: 10 })).toBe(1);
    expect(VIDEOS.filter((v) => v.number === WELCOME_VIDEO_NUMBER)).toHaveLength(1);
  });

  const renderGuide = (authenticated: boolean) =>
    renderWithProviders(
      <Routes>
        <Route path="/guias/:slug" element={<GuidePage />} />
      </Routes>,
      { authenticated, route: `/guias/${GUIDES[0].slug}` }
    );

  it('is a landmark with a heading, benefits, the video and both ways in', () => {
    renderGuide(false);
    const wall = screen.getByRole('region', { name: tr('wall.title') });
    expect(wall).toBeInTheDocument();
    expect(screen.getByRole('list', { name: tr('wall.benefitsLabel') }).children).toHaveLength(5);
    expect(screen.getByText(tr('wall.benefit.guides', { n: GUIDES.length }))).toBeInTheDocument();
    expect(screen.getByText(tr('wall.benefit.trial'))).toBeInTheDocument();
    // Click to load: nothing from YouTube until then.
    expect(document.querySelector('iframe')).toBeNull();
    expect(
      screen.getByRole('button', { name: new RegExp(welcomeVideo()!.title.slice(0, 20)) })
    ).toBeInTheDocument();
    expect(screen.getByText(tr('wall.note'))).toBeInTheDocument();
    // The outline says what is locked to screen readers too.
    expect(screen.getAllByText(`(${tr('wall.locked')})`, { exact: false }).length).toBeGreaterThan(
      0
    );
  });

  it('shows neither the wall nor the guide while a stored session is being restored', () => {
    tokenStore.setSession('expired.token.x', 'refresh-token');
    renderGuide(false);
    expect(screen.getByRole('status')).toHaveTextContent(tr('wall.checking'));
    expect(screen.queryByRole('heading', { name: tr('wall.title') })).toBeNull();
    expect(screen.queryByText(GUIDES[0].sections[1].heading, { selector: 'h2' })).toBeNull();
  });

  it('is not there for people with an account, who get the whole guide', () => {
    renderGuide(true);
    expect(screen.queryByRole('heading', { name: tr('wall.title') })).toBeNull();
    for (const s of GUIDES[0].sections) {
      expect(screen.getByRole('heading', { level: 2, name: s.heading })).toBeInTheDocument();
    }
  });
});
