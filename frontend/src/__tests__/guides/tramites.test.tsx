import { fireEvent, render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { readFileSync } from 'fs';
import { GUIDES, findGuide, inlineParts, longDate } from '@modules/guides/domain/guides';
import { GUIDES_TRAMITES } from '@modules/guides/domain/guidesTramites';
import { guideVideo } from '@modules/guides/domain/guideLinks';
import { categoryOf } from '@modules/guides/domain/guideCategories';
import { HACIENDA_GUIDES, haciendaPath } from '@modules/guides/domain/hacienda';
import { VIDEOS, embedUrl, haciendaVideo, type VideoEntry } from '@modules/guides/domain/videos';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import { GuidePage } from '@modules/guides/ui/GuidePages';
import { HaciendaGuidePage } from '@modules/guides/ui/HaciendaPages';
import { VideoEmbed } from '@modules/guides/ui/VideoEmbed';
import { renderWithProviders } from '@test-utils/render';

const VIDEO_OF: Record<string, number> = {
  'alta-autonomo-paso-a-paso': 25,
  'verifactu-que-es': 30,
  'ingreso-minimo-vital': 48,
  'bono-social-electrico': 47,
  'bono-alquiler-joven': 46,
};

const public0: VideoEntry = {
  number: 25,
  section: 'autonomos',
  title: 'Vídeo de prueba',
  durationSeconds: 125,
  youtubeId: 'abc123',
};

describe('guides by search intent', () => {
  it('has the nine guides, each with an «Actualizado» date and official sources', () => {
    expect(GUIDES_TRAMITES).toHaveLength(9);
    for (const g of GUIDES_TRAMITES) {
      expect(GUIDES).toContain(g);
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.sources!.length).toBeGreaterThan(0);
      for (const source of g.sources!) expect(source.url).toMatch(/^https:\/\/[a-z0-9.-]+\//);
      expect(categoryOf(g.slug).id).not.toBe('otras');
      g.related.forEach((r) => expect(findGuide(r)).toBeDefined());
    }
  });

  it('gives every guide a date, and only links to pages that exist', () => {
    const hacienda = HACIENDA_GUIDES.map(haciendaPath);
    for (const g of GUIDES) {
      expect(g.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const targets = g.sections
        .flatMap((s) => s.paragraphs)
        .flatMap(inlineParts)
        .filter((p) => typeof p !== 'string')
        .map((p) => (p as { to: string }).to);
      for (const to of targets) {
        const ok =
          to === '/videoteca' ||
          hacienda.includes(to) ||
          to === '/hacienda-paso-a-paso' ||
          GUIDES.some((x) => `/guias/${x.slug}` === to) ||
          TOOL_PAGES.some((t) => t.path === to);
        expect([g.slug, to, ok]).toEqual([g.slug, to, true]);
      }
    }
  });

  it('pairs the guides with their public videos', () => {
    for (const [slug, number] of Object.entries(VIDEO_OF)) {
      const video = guideVideo(slug);
      expect(video?.number).toBe(number);
      expect(video?.premium).toBeUndefined();
      expect(video?.youtubeId).toBeTruthy();
    }
  });

  it('writes dates in Spanish', () => {
    expect(longDate('2026-10-18')).toBe('18 de octubre de 2026');
  });
});

describe('guide pages with date, sources and video', () => {
  const renderGuide = (slug: string) =>
    renderWithProviders(
      <Routes>
        <Route path="/guias/:slug" element={<GuidePage />} />
      </Routes>,
      { authenticated: true, route: `/guias/${slug}` }
    );

  it('shows when the guide was updated, its sources and the notice', () => {
    renderGuide('plazos-renta-2025');
    const updated = screen.getByText('18 de octubre de 2026', { selector: 'time' });
    expect(updated).toHaveAttribute('datetime', '2026-10-18');
    expect(screen.getByRole('heading', { name: 'Fuentes oficiales' })).toBeInTheDocument();
    expect(screen.getByText(/Consultadas el 18 de octubre de 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AEAT: Renta' })).toHaveAttribute(
      'href',
      'https://sede.agenciatributaria.gob.es/Sede/Renta.html'
    );
    expect(screen.getByText(/Contenido orientativo/)).toBeInTheDocument();
  });

  it('shows the date of an older guide, without a sources block', () => {
    renderGuide('metodo-50-30-20');
    expect(screen.getByText('11 de octubre de 2026', { selector: 'time' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fuentes oficiales' })).toBeNull();
  });

  it('embeds the video without loading YouTube until it is played', () => {
    const { container } = renderGuide('alta-autonomo-paso-a-paso');
    expect(container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Reproducir el vídeo/ }));
    const frame = container.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toBe(embedUrl('Wlo53zACXmI'));
    expect(frame.getAttribute('src')).toContain('https://www.youtube-nocookie.com/embed/');
  });

  it('shows no player in a guide without a public video', () => {
    renderGuide('planes-de-pensiones-limite-renta');
    expect(screen.queryByRole('button', { name: /Reproducir/ })).toBeNull();
  });

  it('embeds the video of a Hacienda guide too', () => {
    renderWithProviders(
      <Routes>
        <Route path="/hacienda-paso-a-paso/:slug" element={<HaciendaGuidePage />} />
      </Routes>,
      { authenticated: true, route: '/hacienda-paso-a-paso/modelo-303' }
    );
    expect(screen.getByRole('button', { name: /Reproducir el vídeo/ })).toBeInTheDocument();
    expect(
      screen.getByText('Actualizado: 17 de octubre de 2026', { selector: 'time' })
    ).toHaveAttribute('datetime', '2026-10-17');
  });
});

describe('VideoEmbed', () => {
  it('shows the thumbnail and the length, and loads the player on click', () => {
    const { container } = render(<VideoEmbed video={public0} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/videos/25.webp');
    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByText(/al pulsar, el vídeo se carga desde YouTube/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(container.querySelector('iframe')).toHaveAttribute('title', 'Vídeo de prueba');
    expect(screen.queryByText(/al pulsar/)).toBeNull();
  });

  it('works without thumbnail or length', () => {
    const { container } = render(
      <VideoEmbed video={{ ...public0, thumbnail: false, durationSeconds: undefined }} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('2:05')).toBeNull();
  });
});

describe('public videos of the Hacienda guides', () => {
  it('finds the public video of a guide, never a Premium one', () => {
    expect(haciendaVideo('m303')?.number).toBe(22);
    const premium: VideoEntry[] = [
      { number: 22, section: 'hacienda', title: 'x', premium: true, guide: 'm303' },
    ];
    expect(haciendaVideo('m303', premium)).toBeUndefined();
    expect(VIDEOS.length).toBeGreaterThan(0);
  });
});

describe('Content-Security-Policy', () => {
  it('lets pages embed only Google sign-in and youtube-nocookie', () => {
    const caddy = readFileSync('../deploy/Caddyfile', 'utf8');
    const csp = /Content-Security-Policy[^"\n]* "([^"]+)"/.exec(caddy)![1];
    const frameSrc = /frame-src ([^;]+);/.exec(csp)![1].split(' ');
    expect(frameSrc).toEqual(['https://accounts.google.com', 'https://www.youtube-nocookie.com']);
    expect(csp).not.toContain('youtube.com ');
  });
});
