import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteLink } from '@shared/components/SiteLink';

const renderAt = (pathname: string, to: string) => {
  window.history.pushState(null, '', pathname);
  render(
    <MemoryRouter>
      <SiteLink to={to} className="x">
        Guías
      </SiteLink>
    </MemoryRouter>
  );
  return screen.getByRole('link', { name: 'Guías' });
};

afterEach(() => window.history.pushState(null, '', '/'));

describe('SiteLink', () => {
  it('is a router link on the Spanish pages', () => {
    expect(renderAt('/pricing', '/guias').getAttribute('href')).toBe('/guias');
  });

  it('goes straight to the Spanish guides from the English pages', () => {
    const link = renderAt('/en/pricing', '/guias/fondo-de-emergencia');
    expect(link.getAttribute('href')).toBe('/guias/fondo-de-emergencia');
    expect(link.className).toBe('x');
  });

  it('keeps the router link for pages that do have an English version', () => {
    expect(renderAt('/en/pricing', '/calculadora-iva').getAttribute('href')).toBe(
      '/calculadora-iva'
    );
  });
});
