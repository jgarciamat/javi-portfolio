import { fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import es from '@locales/es.json';
import en from '@locales/en.json';
import {
  FINANVERSO_VIDEOS,
  HACIENDA_GUIDES,
  OFFICIAL_LINKS,
  OFFICIAL_VIDEOS,
  checkIds,
  findHaciendaGuide,
  guideKey,
  guideTextKeys,
  haciendaPath,
  stepKey,
} from '@modules/guides/domain/hacienda';
import { requestHaciendaGuide } from '@modules/guides/application/haciendaLink';
import { HaciendaGuidePage, HaciendaIndexPage } from '@modules/guides/ui/HaciendaPages';
import { GuidesIndexPage } from '@modules/guides/ui/GuidePages';
import { HaciendaView } from '@modules/finances/ui/views/HaciendaView';
import { LearnView } from '@modules/finances/ui/views/LearnView';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const guide = (slug: string) => findHaciendaGuide(slug)!;
const m303 = guide('modelo-303');
const title = (g = m303) => tr(guideKey(g, 'title'));
const checkbox = (g: typeof m303, step: string, n: number) =>
  screen.getByLabelText(tr(stepKey(g, g.steps.find((s) => s.id === step)!, `c${n}`)));

beforeEach(() => localStorage.clear());

describe('Hacienda paso a paso: content', () => {
  it('has every text in Spanish and English, unique slugs and official https links', () => {
    const slugs = HACIENDA_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of HACIENDA_GUIDES) {
      for (const key of guideTextKeys(g)) {
        expect([key, key in es]).toEqual([key, true]);
        expect([key, key in en]).toEqual([key, true]);
      }
      expect(checkIds(g).length).toBeGreaterThan(0);
    }
    for (const url of [...Object.values(OFFICIAL_LINKS), ...Object.values(OFFICIAL_VIDEOS)]) {
      expect(url).toMatch(
        /^https:\/\/[^/]*(agenciatributaria\.gob\.es|clave\.gob\.es|fnmt\.gob\.es)/
      );
    }
    expect(findHaciendaGuide('nope')).toBeUndefined();
    expect(Object.values(FINANVERSO_VIDEOS).every((v) => v === '')).toBe(true);
  });

  it('cites the source and the date it was checked, with the disclaimer', () => {
    expect(tr('hacienda.source', { date: tr('hacienda.sourceDate') })).toBe(
      'Fuente: Agencia Tributaria (sede.agenciatributaria.gob.es), consultado el 17 de octubre de 2026.'
    );
  });

  it('every guide is published in the sitemap', async () => {
    const { readFileSync } = await import('fs');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(sitemap).toContain('/hacienda-paso-a-paso</loc>');
    for (const g of HACIENDA_GUIDES) expect(sitemap).toContain(`${haciendaPath(g)}</loc>`);
  });
});

describe('Hacienda paso a paso in the app', () => {
  it('lists the guides and opens one with its steps, deadlines, links and videos', () => {
    renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    expect(screen.getByText(tr('hacienda.free'))).toBeInTheDocument();
    expect(document.querySelectorAll('.guide-card')).toHaveLength(HACIENDA_GUIDES.length);
    fireEvent.click(screen.getByRole('button', { name: title() }));
    expect(screen.getByRole('heading', { name: title() })).toBeInTheDocument();
    expect(document.querySelectorAll('.hacienda-step')).toHaveLength(m303.steps.length);
    expect(screen.getByText(tr('hacienda.m303.deadline1'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: literal(tr('hacienda.link.m303')) })).toHaveAttribute(
      'href',
      OFFICIAL_LINKS.m303
    );
    const video = screen.getByRole('link', {
      name: literal(tr('hacienda.videoOfficial', { label: tr('hacienda.video.all') })),
    });
    expect(video).toHaveAttribute('href', OFFICIAL_VIDEOS.all);
    expect(video).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: literal(tr('hacienda.videoOwn')) })).toBeNull();
    expect(screen.getByText(tr('hacienda.disclaimer'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: literal(`← ${tr('hacienda.back')}`) }));
    expect(screen.getByText(tr('hacienda.hint'))).toBeInTheDocument();
  });

  it('ticks the checklist, keeps it per account and marks finished steps', () => {
    const { unmount } = renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: title() }));
    const reset = screen.getByRole('button', { name: tr('hacienda.reset') });
    expect(reset).toBeDisabled();
    const total = checkIds(m303).length;
    fireEvent.click(checkbox(m303, 'access', 1));
    expect(screen.getAllByText(tr('hacienda.progress', { done: 1, total }))).not.toHaveLength(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    const access = screen.getByRole('listitem', { name: tr('hacienda.step', { n: 2 }) });
    expect(access).toHaveClass('hacienda-step-done');
    expect(within(access).getByText('✓')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('mm_hacienda_checks:u1')!)).toEqual({
      'm303.access.1': true,
    });
    unmount();

    // Reopened: the ticks are still there, and they can be cleared one by one or all at once.
    renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    expect(screen.getByText(tr('hacienda.progress', { done: 1, total }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: title() }));
    expect(checkbox(m303, 'access', 1)).toBeChecked();
    fireEvent.click(checkbox(m303, 'access', 1));
    expect(checkbox(m303, 'access', 1)).not.toBeChecked();
    fireEvent.click(checkbox(m303, 'access', 1));
    fireEvent.click(checkbox(m303, 'numbers', 2));
    fireEvent.click(screen.getByRole('button', { name: tr('hacienda.reset') }));
    expect(checkbox(m303, 'access', 1)).not.toBeChecked();
    expect(localStorage.getItem('mm_hacienda_checks:u1')).toBe('{}');
  });

  it('only clears the ticks of the open guide', () => {
    localStorage.setItem(
      'mm_hacienda_checks:u1',
      JSON.stringify({ 'renta.access.1': true, 'm303.access.1': true })
    );
    renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: title() }));
    fireEvent.click(screen.getByRole('button', { name: tr('hacienda.reset') }));
    expect(JSON.parse(localStorage.getItem('mm_hacienda_checks:u1')!)).toEqual({
      'renta.access.1': true,
    });
  });

  it('opens the section of the app that helps with a step', () => {
    const onOpenTab = jest.fn();
    renderWithProviders(<HaciendaView onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByRole('button', { name: title() }));
    fireEvent.click(screen.getByRole('button', { name: tr('hacienda.m303.numbers.tool') }));
    expect(onOpenTab).toHaveBeenCalledWith('business');
  });

  it('opens the guide another section asked for, once', () => {
    requestHaciendaGuide('modelo-130');
    const { unmount } = renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    expect(screen.getByRole('heading', { name: title(guide('modelo-130')) })).toBeInTheDocument();
    expect(localStorage.getItem('mm_hacienda_open')).toBeNull();
    unmount();
    renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
    expect(screen.getByText(tr('hacienda.hint'))).toBeInTheDocument();
  });

  it('shows our own video when there is one', () => {
    FINANVERSO_VIDEOS.m303 = 'https://www.youtube.com/watch?v=finanverso';
    try {
      requestHaciendaGuide('modelo-303');
      renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />);
      expect(screen.getByRole('link', { name: literal(tr('hacienda.videoOwn')) })).toHaveAttribute(
        'href',
        'https://www.youtube.com/watch?v=finanverso'
      );
    } finally {
      FINANVERSO_VIDEOS.m303 = '';
    }
  });

  it('is shown in English too', () => {
    requestHaciendaGuide('renta-web');
    renderWithProviders(<HaciendaView onOpenTab={jest.fn()} />, { locale: 'en' });
    expect(
      screen.getByRole('heading', { name: 'The Renta in Renta WEB, step by step' })
    ).toBeInTheDocument();
  });
});

describe('links to Hacienda paso a paso', () => {
  it('from the self-employed draft, to the guides of forms 303 and 130', async () => {
    const onOpenTab = jest.fn();
    renderWithProviders(<BusinessView onOpenTab={onOpenTab} />);
    expect(await screen.findByText(tr('hacienda.howToFile'), { exact: false })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: literal(tr('hacienda.openGuide', { name: tr('hacienda.m130.short') })),
      })
    );
    expect(onOpenTab).toHaveBeenCalledWith('hacienda');
    expect(localStorage.getItem('mm_hacienda_open')).toBe('modelo-130');
  });

  it('from the Renta section, to the Renta WEB guide', async () => {
    const onOpenTab = jest.fn();
    renderWithProviders(<RentaView onOpenTab={onOpenTab} />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: literal(tr('hacienda.openGuide', { name: tr('hacienda.renta.short') })),
      })
    );
    expect(onOpenTab).toHaveBeenCalledWith('hacienda');
    expect(localStorage.getItem('mm_hacienda_open')).toBe('renta-web');
  });

  it('from the savings guides of the app', () => {
    const onOpenTab = jest.fn();
    renderWithProviders(<LearnView onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByRole('button', { name: tr('hacienda.cta') }));
    expect(onOpenTab).toHaveBeenCalledWith('hacienda');
  });
});

describe('Hacienda paso a paso on the public site', () => {
  const Where = () => <p data-testid="where">{useLocation().pathname + useLocation().search}</p>;
  const renderAt = (route: string, authenticated = false) =>
    renderWithProviders(
      <Routes>
        <Route path="/guias" element={<GuidesIndexPage />} />
        <Route path="/hacienda-paso-a-paso" element={<HaciendaIndexPage />} />
        <Route path="/hacienda-paso-a-paso/:slug" element={<HaciendaGuidePage />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      { authenticated, route }
    );

  it('is announced on the guides page and lists every guide', () => {
    renderAt('/guias');
    fireEvent.click(screen.getByRole('link', { name: tr('hacienda.cta') }));
    expect(
      screen.getByRole('heading', { level: 1, name: tr('hacienda.title') })
    ).toBeInTheDocument();
    expect(document.title).toBe(tr('hacienda.metaTitle'));
    fireEvent.click(screen.getByRole('link', { name: title() }));
    expect(screen.getByRole('heading', { level: 1, name: title() })).toBeInTheDocument();
    expect(document.title).toBe(`${title()} | Finanverso`);
    // The self-employed draft is only in the app: through the login page.
    expect(
      screen.getAllByRole('link', { name: literal(tr('hacienda.m303.numbers.tool')) })[0]
    ).toHaveAttribute('href', '/login?next=%2F%3Ftab%3Dbusiness');
    fireEvent.click(screen.getByRole('link', { name: literal(`← ${tr('hacienda.back')}`) }));
    expect(
      screen.getByRole('heading', { level: 1, name: tr('hacienda.title') })
    ).toBeInTheDocument();
  });

  it('links the Renta steps to the app, through the login page when signed out', () => {
    const renta = guide('renta-web');
    const { unmount } = renderAt(haciendaPath(renta));
    expect(
      screen.getByRole('link', { name: literal(tr('hacienda.renta.prepare.tool')) })
    ).toHaveAttribute('href', '/login?next=%2F%3Ftab%3Drenta');
    unmount();
    renderAt(haciendaPath(renta), true);
    expect(
      screen.getByRole('link', { name: literal(tr('hacienda.renta.prepare.tool')) })
    ).toHaveAttribute('href', '/?tab=renta');
  });

  it('links the self-employed steps straight to the app when signed in', () => {
    renderAt(haciendaPath(m303), true);
    expect(
      screen.getByRole('link', { name: literal(tr('hacienda.m303.numbers.tool')) })
    ).toHaveAttribute('href', '/?tab=business');
  });

  it('keeps the ticks of people without an account on this device', () => {
    renderAt(haciendaPath(m303));
    fireEvent.click(checkbox(m303, 'file', 1));
    expect(JSON.parse(localStorage.getItem('mm_hacienda_checks:guest')!)).toEqual({
      'm303.file.1': true,
    });
  });

  it('sends unknown guides back to the list', () => {
    renderAt('/hacienda-paso-a-paso/no-existe');
    expect(
      screen.getByRole('heading', { level: 1, name: tr('hacienda.title') })
    ).toBeInTheDocument();
  });
});
