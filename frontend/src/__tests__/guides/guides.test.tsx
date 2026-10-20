import { screen, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import { GUIDES, findGuide, inlineParts } from '@modules/guides/domain/guides';
import { GuidePage, GuidesIndexPage } from '@modules/guides/ui/GuidePages';
import { OPEN_GUIDES, guideTeaser, isOpenGuide } from '@modules/guides/domain/signupWall';
import { track } from '@core/analytics';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@core/analytics', () => ({ track: jest.fn() }));

const GATED = GUIDES.filter((g) => !isOpenGuide(g.slug));
const OPEN = GUIDES.filter((g) => isOpenGuide(g.slug));

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

/** The guides as people with an account see them (`authenticated`) or without one. */
const renderAt = (route: string, authenticated = true) =>
  renderWithProviders(
    <Routes>
      <Route path="/guias" element={<GuidesIndexPage />} />
      <Route path="/guias/:slug" element={<GuidePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { authenticated, route }
  );

describe('guide content', () => {
  it('has unique slugs, real related guides and tools that point to a calculator', () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of GUIDES) {
      expect(g.sections.length).toBeGreaterThan(1);
      expect(g.description.length).toBeLessThan(200);
      g.related.forEach((r) => expect(slugs).toContain(r));
      if (g.tool) expect(TOOL_PAGES.map((p) => p.path)).toContain(g.tool.to);
    }
    expect(findGuide('nope')).toBeUndefined();
    expect(findGuide(undefined)).toBeUndefined();
  });

  it('every guide is published in the sitemap', async () => {
    const { readFileSync } = await import('fs');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(sitemap).toContain('https://finanverso.app/guias</loc>');
    for (const tool of TOOL_PAGES) expect(sitemap).toContain(`${tool.path}</loc>`);
    for (const g of GUIDES) expect(sitemap).toContain(`/guias/${g.slug}</loc>`);
  });
});

const NEW_GUIDES = [
  'modelo-130-paso-a-paso',
  'cuota-autonomos-2026-por-tramos',
  'gastos-deducibles-autonomo',
  'fechas-modelos-trimestrales-autonomos-2026',
  'deduccion-maternidad-modelo-140',
  'familia-numerosa-deduccion-modelo-143',
  'deducciones-renta-castilla-y-leon',
  'deducciones-renta-comunitat-valenciana',
  'como-leer-borrador-renta',
  'renta-a-pagar-o-a-devolver',
  'deduccion-alquiler-vivienda-habitual-renta',
  'planes-de-pensiones-limite-renta',
];

const words = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .split(/\s+/)
    .filter(Boolean).length;

describe('tax and self-employed guides', () => {
  it.each(NEW_GUIDES)('%s is a full article with a disclaimer and valid inline links', (slug) => {
    const guide = findGuide(slug)!;
    expect(guide).toBeDefined();
    const text = [
      guide.title,
      guide.intro,
      ...guide.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ].join(' ');
    expect(words(text)).toBeGreaterThanOrEqual(700);
    expect(words(text)).toBeLessThanOrEqual(1100);
    expect(guide.description.length).toBeLessThan(200);
    expect(text).toMatch(/orientativas/);
    expect(guide.tool).toBeDefined();
    expect(guide.related.length).toBeGreaterThanOrEqual(3);
    const targets = guide.sections
      .flatMap((s) => s.paragraphs)
      .flatMap(inlineParts)
      .filter((p) => typeof p !== 'string')
      .map((p) => (p as { to: string }).to);
    expect(targets.length).toBeGreaterThan(0);
    for (const to of targets) {
      const ok = to.startsWith('/guias/')
        ? GUIDES.some((g) => `/guias/${g.slug}` === to)
        : TOOL_PAGES.some((t) => t.path === to);
      expect(ok).toBe(true);
    }
  });
});

describe('inlineParts', () => {
  it('splits text and internal links', () => {
    expect(inlineParts('Lee [esta guía](/guias/x) y [otra](/calculadora-iva).')).toEqual([
      'Lee ',
      { label: 'esta guía', to: '/guias/x' },
      ' y ',
      { label: 'otra', to: '/calculadora-iva' },
      '.',
    ]);
    expect(inlineParts('Sin enlaces')).toEqual(['Sin enlaces']);
    expect(inlineParts('[a](/b)')).toEqual([{ label: 'a', to: '/b' }]);
    expect(inlineParts('[fuera](https://x.com)')).toEqual(['[fuera](https://x.com)']);
  });

  it('renders inline links inside the guide body', () => {
    renderAt('/guias/modelo-130-paso-a-paso');
    expect(screen.getByRole('link', { name: 'gastos deducibles de un autónomo' })).toHaveAttribute(
      'href',
      '/guias/gastos-deducibles-autonomo'
    );
    expect(
      screen.getByRole('link', { name: /Ver en YouTube: Modelo 130 para tontos/ })
    ).toHaveAttribute('href', expect.stringContaining('https://www.youtube.com/watch?v='));
    expect(screen.getByRole('link', { name: /Videoteca/ })).toHaveAttribute('href', '/videoteca');
  });
});

describe('guide pages', () => {
  it('lists every guide on the index and sets the page title', () => {
    localStorage.clear();
    renderAt('/guias', false);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Guías de finanzas');
    for (const g of GUIDES) {
      expect(screen.getByRole('link', { name: g.title })).toHaveAttribute(
        'href',
        `/guias/${g.slug}`
      );
    }
    expect(document.title).toContain('Guías de finanzas personales');
    // The list is public; the invitation has no way back (there is nothing to come back to).
    expect(screen.getByRole('link', { name: tr('wall.register') })).toHaveAttribute(
      'href',
      '/login?mode=register'
    );
  });

  it.each(GUIDES.map((g) => [g.slug, g] as const))('renders the guide %s', (_slug, guide) => {
    renderAt(`/guias/${guide.slug}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(guide.title);
    expect(document.title).toContain(guide.title);
    guide.sections.forEach((s) => expect(screen.getByText(s.heading)).toBeInTheDocument());
    if (guide.tool) {
      expect(
        screen.getByRole('link', { name: new RegExp(`🧮.*${guide.tool.label}`) })
      ).toHaveAttribute(
        'href',
        guide.tool.to === '/calculadora-renta' ? '/?tab=renta' : guide.tool.to
      );
    } else {
      expect(screen.queryByText(/🧮/)).toBeNull();
    }
    for (const r of guide.related) {
      expect(screen.getByRole('link', { name: findGuide(r)!.title })).toBeInTheDocument();
    }
  });

  it('sends unknown guides back to the index', () => {
    renderAt('/guias/no-existe');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Guías de finanzas');
  });

  it('skips related guides that no longer exist', () => {
    const guide = GUIDES[0];
    const original = guide.related;
    guide.related = ['borrada', ...original];
    renderAt(`/guias/${guide.slug}`);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    guide.related = original;
  });

  it('shows the sign-up panel to visitors but not to people who are signed in', () => {
    localStorage.clear();
    const { unmount } = renderAt('/guias', false);
    expect(screen.getByRole('link', { name: tr('wall.register') })).toBeInTheDocument();
    unmount();
    renderAt('/guias');
    expect(screen.queryByRole('link', { name: tr('wall.register') })).toBeNull();
  });
});

describe('links of the guides to the app', () => {
  beforeEach(() => localStorage.clear());

  const toolSlug = GUIDES.find((g) => g.tool?.to === '/calculadora-renta')!.slug;
  const inlineSlug = GUIDES.find((g) =>
    g.sections.some((s) => s.paragraphs.some((p) => p.includes('(/calculadora-renta)')))
  )!.slug;

  it('sends visitors through the login to the section of the app from the preview', () => {
    const [first] = GATED[0].sections;
    const original = first.paragraphs;
    first.paragraphs = ['Usa la [calculadora de la Renta](/calculadora-renta).', ...original];
    renderAt(`/guias/${GATED[0].slug}`, false);
    expect(screen.getByRole('link', { name: 'calculadora de la Renta' })).toHaveAttribute(
      'href',
      '/login?next=%2F%3Ftab%3Drenta'
    );
    first.paragraphs = original;
  });

  it('sends people who are signed in straight to the section of the app', () => {
    renderAt(`/guias/${toolSlug}`);
    expect(screen.getByRole('link', { name: /Calculadora de la Renta/ })).toHaveAttribute(
      'href',
      '/?tab=renta'
    );
  });

  it('does the same with the links inside the text and leaves the others alone', () => {
    renderAt(`/guias/${inlineSlug}`);
    expect(screen.getByRole('link', { name: 'calculadora de la Renta' })).toHaveAttribute(
      'href',
      '/?tab=renta'
    );
    expect(screen.getByRole('link', { name: 'si te sale a pagar o a devolver' })).toHaveAttribute(
      'href',
      '/guias/renta-a-pagar-o-a-devolver'
    );
  });
});

describe('guides for visitors without an account', () => {
  beforeEach(() => localStorage.clear());

  it.each(GATED.map((g) => [g.slug, g] as const))(
    '%s shows its beginning, what follows and the wall, never the rest',
    (_slug, guide) => {
      renderAt(`/guias/${guide.slug}`, false);
      const teaser = guideTeaser(guide);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(guide.title);
      expect(document.title).toContain(guide.title);
      expect(screen.getByRole('heading', { level: 2, name: teaser.preview.heading })).toBeVisible();
      const outline = screen
        .getByRole('heading', { name: tr('wall.outline.guide') })
        .closest('section') as HTMLElement;
      for (const heading of teaser.outline) {
        expect(within(outline).getByText(heading)).toBeInTheDocument();
        // Only as an item of the outline, never as a section of the text.
        expect(screen.queryByRole('heading', { name: heading })).toBeNull();
      }
      const page = document.body.textContent as string;
      const shown = teaser.preview.paragraphs;
      for (const s of guide.sections) {
        for (const p of s.paragraphs.filter((x) => !shown.includes(x))) {
          expect(page).not.toContain(p.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 50));
        }
      }
      // No player, no YouTube link, no calculator button: only the wall, with its way back.
      expect(document.querySelector('iframe')).toBeNull();
      expect(screen.queryByRole('link', { name: /Ver en YouTube/ })).toBeNull();
      expect(screen.queryByText(/🧮/)).toBeNull();
      expect(screen.getByText(tr('wall.kicker.guide'))).toBeInTheDocument();
      expect(screen.getByRole('link', { name: tr('wall.register') })).toHaveAttribute(
        'href',
        `/login?mode=register&next=${encodeURIComponent(`/guias/${guide.slug}`)}`
      );
      for (const r of guide.related) {
        expect(screen.getByRole('link', { name: findGuide(r)!.title })).toBeInTheDocument();
      }
    }
  );
});

describe('open guides (experiment D3)', () => {
  beforeEach(() => localStorage.clear());
  beforeEach(() => jest.mocked(track).mockClear());

  it('lists only real guides', () => {
    for (const slug of OPEN_GUIDES) expect(findGuide(slug)).toBeDefined();
    expect(OPEN).toHaveLength(OPEN_GUIDES.length);
    expect(isOpenGuide(undefined)).toBe(false);
    expect(isOpenGuide('no-existe')).toBe(false);
  });

  it.each(OPEN.map((g) => [g.slug, g] as const))(
    '%s is read whole without an account, with a soft invitation and no wall',
    (_slug, guide) => {
      renderAt(`/guias/${guide.slug}`, false);
      for (const s of guide.sections) {
        expect(screen.getByRole('heading', { level: 2, name: s.heading })).toBeVisible();
      }
      // Nothing locked, no outline, no kicker of the wall; the invitation is at the end.
      expect(screen.queryByRole('heading', { name: tr('wall.outline.guide') })).toBeNull();
      expect(screen.queryByText(tr('wall.kicker.guide'))).toBeNull();
      expect(screen.getByRole('heading', { name: tr('wall.soft.title') })).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: tr('wall.benefitsLabel') })).toBeNull();
      expect(screen.getByRole('link', { name: tr('wall.register') })).toHaveAttribute(
        'href',
        `/login?mode=register&next=${encodeURIComponent(`/guias/${guide.slug}`)}`
      );
      // The tool is still behind the account: visitors go through the login.
      if (guide.tool) {
        expect(
          screen.getByRole('link', { name: new RegExp(`🧮.*${guide.tool.label}`) })
        ).toBeTruthy();
      }
      expect(document.querySelector('iframe')).toBeNull();
      expect(screen.queryByRole('link', { name: /Ver en YouTube/ })).toBeNull();
    }
  );

  it('shows no invitation to people with an account', () => {
    renderAt(`/guias/${OPEN[0].slug}`);
    expect(screen.queryByRole('heading', { name: tr('wall.soft.title') })).toBeNull();
  });

  it('counts anonymously the views and the clicks on «Crear cuenta», nothing else', () => {
    const { unmount } = renderAt(`/guias/${OPEN[0].slug}`, false);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('guide_view', { guide: OPEN[0].slug });
    const register = screen.getByRole('link', { name: tr('wall.register') });
    register.addEventListener('click', (e) => e.preventDefault());
    register.click();
    expect(track).toHaveBeenLastCalledWith('guide_cta_click', { guide: OPEN[0].slug });
    unmount();
    // A guide behind the wall is not part of the experiment.
    jest.mocked(track).mockClear();
    renderAt(`/guias/${GATED[0].slug}`, false);
    expect(track).not.toHaveBeenCalled();
  });
});
