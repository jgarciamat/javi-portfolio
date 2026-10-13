import { cleanup, screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import App from '../App';
import * as f from '@test-utils/fixtures';
import { signIn, tr } from '@test-utils/render';

/** Real API modules, answered by a fake fetch. */
function mockFetch() {
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const path = String(url).replace('http://localhost:3000/api', '');
    const body: Record<string, unknown> = {
      '/settings': f.settings(),
      '/billing': f.billing(),
      '/billing/plans': f.catalog(),
      '/months/2026/3': f.overview(),
      '/accounts': { accounts: [], total: 0 },
    };
    const value = Object.entries(body).find(([p]) => path.startsWith(p))?.[1] ?? [];
    return { ok: true, status: 200, json: async () => value } as Response;
  }) as typeof fetch;
}

const visit = (path: string) => {
  window.history.pushState(null, '', path);
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
  mockFetch();
});

describe('App routes', () => {
  it('shows the presentation page to anonymous visitors at the home address', async () => {
    visit('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: tr('landing.hero.title') })
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('sends anonymous visitors of the mobile apps straight to the login page', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    visit('/');
    expect(
      await screen.findByRole('button', { name: tr('app.auth.login.submit') })
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    jest.restoreAllMocks();
  });

  it.each([
    ['/pricing', 'pricing.title'],
    ['/terms', 'terms.title'],
    ['/privacy', 'app.privacy.title'],
    ['/verify-email', 'app.auth.verify.error'],
    ['/reset-password', 'app.auth.reset.title'],
    ['/calculadora-50-30-20', 'tools.rule.title'],
    ['/simulador-ahorro', 'tools.savings.title'],
    ['/calculadora-hipoteca', 'tools.loan.title'],
    ['/calculadora-iva', 'tools.vat.title'],
    ['/calculadora-inflacion', 'tools.inflation.title'],
    ['/calculadora-objetivo-ahorro', 'tools.goal.title'],
  ])('serves the public page %s', async (path, key) => {
    visit(path);
    expect(await screen.findByRole('heading', { name: tr(key) })).toBeInTheDocument();
  });

  it('serves the guides and each guide', async () => {
    visit('/guias');
    expect(
      await screen.findByRole('heading', { name: 'Guías de finanzas personales' })
    ).toBeInTheDocument();
    cleanup();
    visit('/guias/metodo-50-30-20');
    expect(
      await screen.findByRole('heading', { name: /Método 50\/30\/20/, level: 1 })
    ).toBeInTheDocument();
  });

  it('redirects unknown paths and shows the dashboard when signed in', async () => {
    signIn();
    visit('/nothing-here');
    expect(
      await screen.findByRole('heading', { name: tr('app.header.title') })
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
