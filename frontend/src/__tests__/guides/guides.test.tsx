import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import { GUIDES, findGuide, inlineParts } from '@modules/guides/domain/guides';
import { GuidePage, GuidesIndexPage } from '@modules/guides/ui/GuidePages';
import { renderWithProviders } from '@test-utils/render';

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/guias" element={<GuidesIndexPage />} />
      <Route path="/guias/:slug" element={<GuidePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { authenticated: false, route }
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
    renderAt('/guias');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Guías de finanzas');
    for (const g of GUIDES) {
      expect(screen.getByRole('link', { name: g.title })).toHaveAttribute(
        'href',
        `/guias/${g.slug}`
      );
    }
    expect(document.title).toContain('Guías de finanzas personales');
    expect(screen.getByRole('link', { name: /Crear mi cuenta gratis/ })).toBeInTheDocument();
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
        guide.tool.to === '/calculadora-renta' ? '/login?next=%2F%3Ftab%3Drenta' : guide.tool.to
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
    const { unmount } = renderAt('/guias');
    expect(screen.getByRole('link', { name: /Crear mi cuenta/ })).toBeInTheDocument();
    unmount();
    renderWithProviders(
      <Routes>
        <Route path="/guias" element={<GuidesIndexPage />} />
      </Routes>,
      { authenticated: true, route: '/guias' }
    );
    expect(screen.queryByRole('link', { name: /Crear mi cuenta/ })).toBeNull();
  });
});

describe('links of the guides to the app', () => {
  beforeEach(() => localStorage.clear());

  const toolSlug = GUIDES.find((g) => g.tool?.to === '/calculadora-renta')!.slug;
  const inlineSlug = GUIDES.find((g) =>
    g.sections.some((s) => s.paragraphs.some((p) => p.includes('(/calculadora-renta)')))
  )!.slug;

  it('sends visitors through the login to the section of the app', () => {
    renderAt(`/guias/${toolSlug}`);
    expect(screen.getByRole('link', { name: /Calculadora de la Renta/ })).toHaveAttribute(
      'href',
      '/login?next=%2F%3Ftab%3Drenta'
    );
  });

  it('sends people who are signed in straight to the section of the app', () => {
    renderWithProviders(
      <Routes>
        <Route path="/guias/:slug" element={<GuidePage />} />
      </Routes>,
      { authenticated: true, route: `/guias/${toolSlug}` }
    );
    expect(screen.getByRole('link', { name: /Calculadora de la Renta/ })).toHaveAttribute(
      'href',
      '/?tab=renta'
    );
  });

  it('does the same with the links inside the text and leaves the others alone', () => {
    renderAt(`/guias/${inlineSlug}`);
    expect(screen.getByRole('link', { name: 'calculadora de la Renta' })).toHaveAttribute(
      'href',
      '/login?next=%2F%3Ftab%3Drenta'
    );
    expect(screen.getByRole('link', { name: 'si te sale a pagar o a devolver' })).toHaveAttribute(
      'href',
      '/guias/renta-a-pagar-o-a-devolver'
    );
  });
});
