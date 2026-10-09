import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { billingApi, offersApi } from '@core/api/billingApi';
import { ApiError, apiRequest } from '@core/api/http';
import {
  reasonFromError,
  useOptionalPlan,
  usePlan,
} from '@modules/billing/application/PlanContext';
import { PlanBanner } from '@modules/billing/ui/PlanBanner';
import { PlanView } from '@modules/billing/ui/PlanView';
import { OffersView } from '@modules/billing/ui/OffersView';
import { PricingPage } from '@modules/billing/ui/PricingPage';
import { formatPrice, yearlySavingPct } from '@modules/billing/ui/pricing';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';

jest.mock('@shared/utils/navigation', () => ({ redirectTo: jest.fn() }));
const { redirectTo } = jest.requireMock('@shared/utils/navigation') as { redirectTo: jest.Mock };

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/');
});
afterEach(() => jest.restoreAllMocks());

const CONSENT = { acceptTerms: true, waiveWithdrawal: true };
const termsBox = () =>
  screen.findByRole('checkbox', { name: new RegExp(tr('billing.acceptTerms')) });
const immediateStartBox = () =>
  screen.findByRole('checkbox', { name: literal(tr('billing.immediateStart')) });

/** Gives both consents (the plan buttons stay disabled until then). */
const acceptTerms = async () => {
  fireEvent.click(await termsBox());
  fireEvent.click(await immediateStartBox());
};

const withPlan = (ui: React.ReactElement, overview = f.billing(), api = createFakeApi()) => {
  api.billingApi.get.mockResolvedValue(overview);
  return renderWithProviders(ui, { api, plan: true, finances: false });
};

describe('billing API', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ url: 'u' }) });
  });

  it('calls the billing and offers endpoints', async () => {
    await billingApi.get();
    await billingApi.plans();
    await billingApi.checkout('yearly', { acceptTerms: true, waiveWithdrawal: true });
    await billingApi.portal();
    await offersApi.list();
    await offersApi.click('bank a');
    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);
    expect(calls).toEqual([
      'GET http://localhost:3000/api/billing',
      'GET http://localhost:3000/api/billing/plans',
      'POST http://localhost:3000/api/billing/checkout',
      'POST http://localhost:3000/api/billing/portal',
      'GET http://localhost:3000/api/offers',
      'POST http://localhost:3000/api/offers/bank%20a/click',
    ]);
  });
});

describe('pricing helpers', () => {
  it('formats prices and the yearly saving', () => {
    expect(formatPrice(49, 'en')).toBe('€49');
    expect(formatPrice(2.99, 'en')).toBe('€2.99');
    expect(yearlySavingPct({ monthly: 0, yearly: 10 })).toBe(0);
    expect(yearlySavingPct({ monthly: 1, yearly: 20 })).toBe(0);
  });

  it('maps API errors to paywall reasons', () => {
    expect(reasonFromError(new ApiError('x', 402, 'PLAN_LIMIT', { resource: 'goals' }))).toEqual({
      kind: 'limit',
      resource: 'goals',
      limit: 0,
    });
  });
});

describe('PlanProvider', () => {
  it('opens the paywall on any 402 and closes it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({
        error: 'x',
        code: 'PREMIUM_REQUIRED',
        details: { feature: 'insights' },
      }),
    });
    withPlan(<p>app</p>);
    await act(async () => {
      await apiRequest('/x').catch(() => undefined);
    });
    expect(
      screen.getByText(tr('billing.reason.feature', { feature: tr('billing.feature.insights') }))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('counts an unknown plan as Premium and requires its provider', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockRejectedValue(new Error('down'));
    renderWithProviders(<p>app</p>, { api, plan: true, finances: false });
    await waitFor(() => expect(api.billingApi.get).toHaveBeenCalled());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => usePlan())).toThrow('usePlan must be used inside PlanProvider');
    expect(renderHook(() => useOptionalPlan()).result.current).toBeNull();
  });

  it('polls after a successful payment until Premium arrives', async () => {
    jest.useFakeTimers();
    window.history.replaceState(null, '', '/?billing=success');
    const api = createFakeApi();
    api.billingApi.get
      .mockResolvedValueOnce(f.billing())
      .mockResolvedValueOnce(f.billing())
      .mockResolvedValue(
        f.billing({
          subscription: { ...f.billing().subscription, source: 'stripe', status: 'active' },
        })
      );
    renderWithProviders(<PlanBanner onOpenPlan={jest.fn()} />, {
      api,
      plan: true,
      finances: false,
    });
    expect(window.location.search).toBe('');
    expect(screen.getByText(tr('billing.notice.processing'))).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    }
    expect(await screen.findByText(tr('billing.notice.success'))).toBeInTheDocument();
    const calls = api.billingApi.get.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(api.billingApi.get.mock.calls.length).toBe(calls);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('status')).toBeNull();
    jest.useRealTimers();
  });

  it('stops polling after ten tries', async () => {
    jest.useFakeTimers();
    window.history.replaceState(null, '', '/?billing=success');
    const api = createFakeApi();
    renderWithProviders(<PlanBanner onOpenPlan={jest.fn()} />, {
      api,
      plan: true,
      finances: false,
    });
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    }
    expect(api.billingApi.get).toHaveBeenCalledTimes(11);
    jest.useRealTimers();
  });

  it.each([
    ['cancel', 'billing.notice.cancel'],
    ['portal', 'billing.notice.portal'],
  ])('shows the %s notice', async (notice, key) => {
    window.history.replaceState(null, '', `/?billing=${notice}`);
    withPlan(<PlanBanner onOpenPlan={jest.fn()} />);
    expect(screen.getByText(tr(key))).toBeInTheDocument();
  });

  it('ignores unknown notices and survives a broken URL API', () => {
    window.history.replaceState(null, '', '/?billing=other');
    withPlan(<PlanBanner onOpenPlan={jest.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('PlanBanner', () => {
  it('reminds that the trial is ending', async () => {
    const onOpenPlan = jest.fn();
    withPlan(<PlanBanner onOpenPlan={onOpenPlan} />, f.billing({ trialDaysLeft: 2 }));
    fireEvent.click(await screen.findByRole('button', { name: tr('billing.seePlans') }));
    expect(onOpenPlan).toHaveBeenCalled();
  });

  it('recaps the trial and what the free plan would no longer let them add', async () => {
    withPlan(
      <PlanBanner onOpenPlan={jest.fn()} />,
      f.billing({
        trialDaysLeft: 4,
        usage: {
          accounts: 2,
          budgets: 5,
          goals: 1,
          recurringRules: 4,
          customAlerts: 0,
          movements: 37,
        },
      })
    );
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent(/registrado 37 movimientos/);
    expect(banner).toHaveTextContent(
      /5 presupuestos \(gratis: 3\), 4 movimientos automáticos \(gratis: 3\)/
    );
    expect(banner).not.toHaveTextContent(/cuentas \(gratis/);
  });

  it('only recaps the movements when everything fits in the free plan', async () => {
    withPlan(<PlanBanner onOpenPlan={jest.fn()} />, f.billing({ trialDaysLeft: 1 }));
    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent(/registrado 5 movimientos/);
    expect(banner).not.toHaveTextContent(/no podrás añadir más/);
  });

  it('says nothing outside the provider or with a long trial', () => {
    const { container, unmount } = renderWithProviders(<PlanBanner onOpenPlan={jest.fn()} />, {
      finances: false,
    });
    expect(container).toBeEmptyDOMElement();
    unmount();
    withPlan(<PlanBanner onOpenPlan={jest.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('PlanView', () => {
  const sub = f.billing().subscription;

  it.each([
    [
      'lifetime',
      f.billing({ subscription: { ...sub, lifetime: true, source: 'lifetime', status: 'active' } }),
      tr('billing.status.lifetime'),
    ],
    [
      'past due',
      f.billing({ subscription: { ...sub, source: 'stripe', status: 'past_due' } }),
      tr('billing.status.pastDue'),
    ],
    [
      'renewing',
      f.billing({
        subscription: {
          ...sub,
          source: 'stripe',
          status: 'active',
          currentPeriodEnd: '2026-04-15T00:00:00Z',
        },
      }),
      tr('billing.status.renewsOn', { date: '15 abr 2026' }),
    ],
    [
      'ending',
      f.billing({
        subscription: {
          ...sub,
          source: 'stripe',
          status: 'active',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: null,
        },
      }),
      tr('billing.status.endsOn', { date: '' }),
    ],
    ['trial', f.billing(), tr('billing.status.trial', { days: 10 })],
    [
      'free',
      f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free }),
      tr('billing.status.free'),
    ],
  ])('describes the %s status', async (_name, overview, text) => {
    withPlan(<PlanView />, overview);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('opens the payment and the customer portal', async () => {
    const api = createFakeApi();
    api.billingApi.portal
      .mockRejectedValueOnce(new Error('Portal caído'))
      .mockResolvedValue({ url: 'https://portal' });
    withPlan(<PlanView />, f.billing({ subscription: { ...sub, canManage: true } }), api);
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tr('billing.manage')) }));
    expect(await screen.findByText('Portal caído')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('billing.manage')) }));
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://portal'));
    await acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('billing.monthly')) }));
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://checkout.test'));
  });

  it('shows the loading and error states', async () => {
    const api = createFakeApi();
    let fail!: (e: Error) => void;
    api.billingApi.get.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    renderWithProviders(<PlanView />, { api, plan: true, finances: false });
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
    await act(async () => fail(new Error('down')));
    expect(screen.getByText(tr('billing.loadError'))).toBeInTheDocument();
  });
});

describe('Cancelling', () => {
  const paying = f.billing({
    trialDaysLeft: 0,
    subscription: {
      ...f.billing().subscription,
      source: 'stripe',
      status: 'active',
      currentPeriodEnd: '2026-04-15T00:00:00Z',
      canManage: true,
    },
  });

  it('only offers to cancel the renewal, keeping Premium until the end of the period', async () => {
    withPlan(<PlanView />, paying);
    expect(await screen.findByText(tr('billing.cancelHint'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(tr('billing.manage')) })
    ).toBeInTheDocument();
  });

  it('hides the payment portal inside the store apps', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    withPlan(<PlanView />, paying);
    expect(
      await screen.findByText(tr('billing.status.renewsOn', { date: '15 abr 2026' }))
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(tr('billing.manage')) })).toBeNull();
    expect(screen.queryByText(tr('billing.cancelHint'))).toBeNull();
  });
});

describe('PlanOptions', () => {
  it('reports checkout errors and hides the founder plan when sold out', async () => {
    const api = createFakeApi();
    api.billingApi.checkout
      .mockRejectedValueOnce(new Error('Pago no disponible'))
      .mockRejectedValueOnce('x');
    withPlan(
      <PlanView />,
      f.billing({ catalog: f.catalog({ lifetime: { available: false, remaining: 0 } }) }),
      api
    );
    const yearly = await screen.findByRole('button', { name: new RegExp(tr('billing.yearly')) });
    expect(screen.queryByRole('button', { name: literal(tr('billing.lifetime')) })).toBeNull();
    expect(yearly).toBeDisabled();
    expect(screen.getByText(tr('billing.acceptTermsFirst'))).toBeInTheDocument();
    // One box is not enough: both consents are needed.
    fireEvent.click(await termsBox());
    expect(yearly).toBeDisabled();
    fireEvent.click(await termsBox());
    fireEvent.click(await immediateStartBox());
    expect(yearly).toBeDisabled();
    fireEvent.click(await termsBox());
    expect(screen.queryByText(tr('billing.acceptTermsFirst'))).toBeNull();
    fireEvent.click(yearly);
    expect(await screen.findByText('Pago no disponible')).toBeInTheDocument();
    fireEvent.click(yearly);
    expect(await screen.findByText(tr('billing.checkoutError'))).toBeInTheDocument();
  });

  it('buys the founder plan', async () => {
    const api = createFakeApi();
    withPlan(<PlanView />, f.billing(), api);
    await acceptTerms();
    fireEvent.click(await screen.findByRole('button', { name: literal(tr('billing.lifetime')) }));
    await waitFor(() => expect(api.billingApi.checkout).toHaveBeenCalledWith('lifetime', CONSENT));
    expect(screen.getByText(tr('billing.redirecting'))).toBeInTheDocument();
  });

  it('defers to the web in the native apps and when payments are off', async () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const { unmount } = withPlan(<PlanView />);
    expect(await screen.findByText(tr('billing.nativeNote'))).toBeInTheDocument();
    // Nothing in the app talks about buying: not even the trial reminder.
    expect(screen.queryByText(literal(tr('billing.trialKeeps', { days: 10 })))).toBeNull();
    unmount();
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    withPlan(<PlanView />, f.billing({ catalog: f.catalog({ paymentsEnabled: false }) }));
    expect(await screen.findByText(tr('billing.paymentsDisabled'))).toBeInTheDocument();
  });
});

describe('UpgradeModal', () => {
  function Opener() {
    const { openUpgrade } = usePlan();
    return (
      <>
        <button onClick={() => openUpgrade()}>generic</button>
        <button onClick={() => openUpgrade({ kind: 'limit', resource: 'accounts', limit: 1 })}>
          limit
        </button>
      </>
    );
  }

  it('explains the reason, waits for the plan and blocks paying twice', async () => {
    const api = createFakeApi();
    let resolve!: (v: ReturnType<typeof f.billing>) => void;
    api.billingApi.get.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithProviders(<Opener />, { api, plan: true, finances: false });
    fireEvent.click(screen.getByRole('button', { name: 'limit' }));
    expect(
      screen.getByText(
        tr('billing.reason.limit', { limit: 1, resource: tr('billing.resource.accounts') })
      )
    ).toBeInTheDocument();
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
    await act(async () =>
      resolve(
        f.billing({
          trialDaysLeft: 0,
          subscription: { ...f.billing().subscription, source: 'stripe', status: 'active' },
        })
      )
    );
    expect(screen.getByRole('button', { name: new RegExp(tr('billing.monthly')) })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'generic' }));
    expect(screen.queryByText(/El plan gratuito/)).toBeNull();
  });
});

describe('OffersView', () => {
  const offer = {
    id: 'bank-a',
    category: 'banking' as const,
    name: 'Banco A',
    icon: '🏦',
    title: { es: 'Cuenta sin comisiones', en: 'No-fee account' },
    description: { es: 'Descripción', en: 'Description' },
    highlight: { es: '200 € de bienvenida', en: '€200 welcome' },
    url: 'https://partner.example/a',
    active: true,
  };

  it('shows sponsored offers in the user language and records clicks', async () => {
    const api = createFakeApi();
    api.offersApi.list.mockResolvedValue({ enabled: true, offers: [offer] });
    api.offersApi.click.mockRejectedValue(new Error('ignored'));
    api.settingsApi.get.mockResolvedValue(f.settings({ locale: 'en' }));
    renderWithProviders(<OffersView />, { api, finances: false, locale: 'en' });
    expect(await screen.findByText('No-fee account')).toBeInTheDocument();
    expect(screen.getByText(/€200 welcome/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /See offer/ }));
    expect(api.offersApi.click).toHaveBeenCalledWith('bank-a');
  });

  it('shows the empty, hidden and error states', async () => {
    const api = createFakeApi();
    api.offersApi.list
      .mockResolvedValueOnce({ enabled: true, offers: [] })
      .mockResolvedValueOnce({ enabled: false, offers: [] })
      .mockRejectedValueOnce(new Error('Sin ofertas'));
    const first = renderWithProviders(<OffersView />, { api, finances: false });
    expect(await screen.findByText(tr('offers.empty'))).toBeInTheDocument();
    first.unmount();
    const second = renderWithProviders(<OffersView />, { api, finances: false });
    expect(await screen.findByText(tr('offers.disabled'))).toBeInTheDocument();
    second.unmount();
    renderWithProviders(<OffersView />, { api, finances: false });
    expect(await screen.findByText('Sin ofertas')).toBeInTheDocument();
  });
});

describe('PricingPage', () => {
  it('shows an error when the plans cannot be loaded', async () => {
    const api = createFakeApi();
    api.billingApi.plans.mockRejectedValue(new Error('x'));
    renderWithProviders(<PricingPage />, { api, authenticated: false });
    expect(await screen.findByText(tr('billing.loadError'))).toBeInTheDocument();
  });

  it('hides the founder line when sold out', async () => {
    const api = createFakeApi();
    api.billingApi.plans.mockResolvedValue(
      f.catalog({ lifetime: { available: false, remaining: 0 } })
    );
    renderWithProviders(<PricingPage />, { api, authenticated: false });
    await screen.findByText(tr('pricing.cta', { days: 14 }));
    expect(screen.queryByText(/fundador/i)).toBeNull();
  });
});
