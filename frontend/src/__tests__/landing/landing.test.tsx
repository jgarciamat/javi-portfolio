import { Suspense } from 'react';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { HomeGate } from '@modules/landing/ui/HomeGate';
import { FAQ, PLAY_URL, faqJsonLd } from '@modules/landing/domain/landing';
import { LandingPage } from '@modules/landing/ui/LandingPage';
import { renderWithProviders, tr } from '@test-utils/render';

describe('LandingPage', () => {
  it('presents the app with a way to register, to log in and to get the Android app', () => {
    renderWithProviders(<LandingPage />, { authenticated: false });
    expect(
      screen.getByRole('heading', { level: 1, name: tr('landing.hero.title') })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('landing.cta.register') })).toHaveAttribute(
      'href',
      '/login?mode=register'
    );
    expect(screen.getByRole('link', { name: tr('landing.cta.login') })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('link', { name: new RegExp(tr('landing.cta.play')) })).toHaveAttribute(
      'href',
      PLAY_URL
    );
    expect(document.title).toBe(tr('landing.meta.title'));
  });

  it('shows the screenshots, the features, the plans, the questions and the learning links', () => {
    renderWithProviders(<LandingPage />, { authenticated: false });
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBe(15);
    expect(screen.getByRole('link', { name: tr('landing.plans.link') })).toHaveAttribute(
      'href',
      '/pricing'
    );
    for (const id of FAQ) expect(screen.getByText(tr(`landing.faq.${id}.q`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('tools.rule.nav') })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: tr('landing.learn.guides') }).length).toBe(2);
  });

  it('publishes the questions as structured data for search engines', () => {
    renderWithProviders(<LandingPage />, { authenticated: false });
    const script = document.querySelector('script[type="application/ld+json"]')!;
    const data = JSON.parse(script.textContent as string);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity).toHaveLength(FAQ.length);
    expect(data.mainEntity[0].acceptedAnswer.text).toBe(tr('landing.faq.free.a'));
  });

  it('builds the structured data from any language', () => {
    const data = JSON.parse(faqJsonLd((key) => `[${key}]`));
    expect(data.mainEntity[0].name).toBe('[landing.faq.free.q]');
  });
});

describe('HomeGate', () => {
  beforeEach(() => localStorage.clear());

  const home = () => (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomeGate />}>
          <Route index element={<p>the app</p>} />
        </Route>
      </Routes>
    </Suspense>
  );

  it('opens the app for people with a session, never the presentation page', async () => {
    renderWithProviders(home(), { authenticated: true });
    expect(await screen.findByText('the app')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: tr('landing.hero.title') })).toBeNull();
  });

  it('shows the presentation page to people without one', async () => {
    renderWithProviders(home(), { authenticated: false });
    expect(
      await screen.findByRole('heading', { level: 1, name: tr('landing.hero.title') })
    ).toBeInTheDocument();
  });
});
