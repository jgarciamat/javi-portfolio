import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TOOL_PAGES } from '@modules/tools/domain/toolPages';
import { GUIDES, findGuide } from '@modules/guides/domain/guides';
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
    expect(sitemap).toContain('https://www.winjgm.com/guias</loc>');
    for (const tool of TOOL_PAGES) expect(sitemap).toContain(`${tool.path}</loc>`);
    for (const g of GUIDES) expect(sitemap).toContain(`/guias/${g.slug}</loc>`);
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
      expect(screen.getByRole('link', { name: new RegExp(guide.tool.label) })).toHaveAttribute(
        'href',
        guide.tool.to
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
