/**
 * Less common paths: failures, empty data, unusual data and race conditions.
 */
import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@core/i18n/I18nContext';
import { authApi } from '@core/api/authApi';
import { ApiError, apiRequest, tokenStore } from '@core/api/http';
import * as notifications from '@core/notifications/notifications';
import { reasonFromError } from '@modules/billing/application/PlanContext';
import { AnalysisView } from '@modules/finances/ui/views/AnalysisView';
import { AIAdvisor } from '@modules/finances/ui/components/AIAdvisor';
import { CalendarDayModal } from '@modules/finances/ui/components/CalendarDayModal';
import { CategoryChart } from '@modules/finances/ui/components/CategoryChart';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { TransactionCalendarView } from '@modules/finances/ui/components/TransactionCalendarView';
import { TransactionWeekView } from '@modules/finances/ui/components/TransactionWeekView';
import { LoginPage } from '@modules/auth/ui/LoginPage';
import { RegisterPage } from '@modules/auth/ui/RegisterPage';
import { ProfilePage } from '@modules/auth/ui/ProfilePage';
import { VerifyEmailPage } from '@modules/auth/ui/VerifyEmailPage';
import { PricingPage } from '@modules/billing/ui/PricingPage';
import { formatMetricValue } from '@modules/finances/ui/components/alertFormat';
import { monthAlertMessage } from '@modules/finances/ui/components/monthAlertMessage';
import { useAlertNotifications } from '@modules/finances/application/hooks/useAlertNotifications';
import { useTransactionForm } from '@modules/finances/application/hooks/useTransactionForm';
import { buildCalendarMonth } from '@modules/finances/domain/transactionGrouping';
import { intlLocale } from '@shared/utils/format';
import { AuthProvider, useAuth } from '@shared/hooks/useAuth';
import { googleMock } from '../__mocks__/@react-oauth/google';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import {
  fakeAccessToken,
  literal,
  renderWithI18n,
  renderWithProviders,
  tr,
} from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@core/notifications/notifications', () => ({
  ...jest.requireActual('@core/notifications/notifications'),
  hasNotificationPermission: jest.fn(),
  showNotification: jest.fn(),
}));
const mockedNotifications = notifications as jest.Mocked<typeof notifications>;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  googleMock.fail = false;
  freezeTime();
});
afterEach(() => {
  restoreTime();
  jest.restoreAllMocks();
});

// ─── HTTP client ─────────────────────────────────────────────────────────────

describe('HTTP client', () => {
  const response = (status: number, body: unknown, type = 'application/json') => ({
    ok: status < 400,
    status,
    headers: { get: () => type },
    json: async () => body,
    text: async () => String(body),
  });

  it('reads text answers', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, 'hola', 'text/plain'));
    await expect(apiRequest('/x')).resolves.toBe('hola');
  });

  it('ends the session on a 401 without refresh token', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(401, {}));
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('keeps the old token when an expired one cannot be refreshed', async () => {
    tokenStore.setSession('h.e30.s', 'refresh');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response(500, {}))
      .mockResolvedValueOnce(response(200, { ok: true }));
    await expect(apiRequest('/x')).resolves.toEqual({ ok: true });
    const [, init] = (global.fetch as jest.Mock).mock.calls[1];
    expect(init.headers.Authorization).toBe('Bearer h.e30.s');
  });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('auth edge cases', () => {
  it('reports Google errors on login and register', async () => {
    googleMock.fail = true;
    const { unmount } = renderWithProviders(
      <LoginPage onSwitch={jest.fn()} onForgot={jest.fn()} />,
      {
        authenticated: false,
      }
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.login.google') }));
    expect(screen.getByText(tr('app.auth.error.google'))).toBeInTheDocument();
    unmount();
    renderWithProviders(<RegisterPage onSwitch={jest.fn()} />, { authenticated: false });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.register.google') }));
    expect(screen.getByText(tr('app.auth.error.google'))).toBeInTheDocument();
  });

  it('verifies only once under StrictMode', async () => {
    const verify = jest.spyOn(authApi, 'verifyEmail').mockResolvedValue({ message: 'ok' });
    // Effects run twice only under a root-level StrictMode (as in main.tsx).
    render(
      <StrictMode>
        <I18nProvider>
          <MemoryRouter initialEntries={['/verify-email?token=t']}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </StrictMode>
    );
    expect(await screen.findByText(tr('app.auth.verify.success'))).toBeInTheDocument();
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('shows a generic error when resending the verification fails oddly', async () => {
    jest
      .spyOn(authApi, 'verifyEmail')
      .mockRejectedValue(new ApiError('Caducado', 400, 'TOKEN_EXPIRED'));
    jest.spyOn(authApi, 'resendVerification').mockRejectedValue('x');
    renderWithProviders(
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>,
      { authenticated: false, route: '/verify-email?token=t' }
    );
    fireEvent.change(await screen.findByPlaceholderText(tr('app.auth.login.email')), {
      target: { value: 'a@b.c' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.auth.verify.resend') }));
    expect(await screen.findByText(tr('app.auth.error.generic'))).toBeInTheDocument();
  });

  it('copes with a session whose user is missing on the device', async () => {
    tokenStore.setSession(fakeAccessToken(), 'refresh');
    const updateName = jest.spyOn(authApi, 'updateName').mockResolvedValue({ name: 'Ana' });
    // Tokens without a stored user: the provider starts signed in with no user.
    renderWithProviders(<ProfilePage onClose={jest.fn()} />, {
      authenticated: false,
      finances: false,
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.profile.name.label')) }));
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.profile.name.label') }), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.profile.name.save') }));
    await waitFor(() => expect(updateName).toHaveBeenCalledWith('Ana'));
  });

  describe('AuthProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    it('keeps an expired session while offline', async () => {
      tokenStore.setSession('h.e30.s', 'refresh');
      localStorage.setItem('mm_user', JSON.stringify(f.user()));
      global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.status).toBe('loading');
      await waitFor(() => expect(result.current.status).toBe('authenticated'));
      expect(result.current.token).toBe('h.e30.s');
    });

    it('ignores a refresh that finishes after unmounting', async () => {
      tokenStore.setSession('h.e30.s', 'refresh');
      let finish!: (v: unknown) => void;
      global.fetch = jest.fn().mockReturnValue(new Promise((r) => (finish = r)));
      const { result, unmount } = renderHook(() => useAuth(), { wrapper });
      unmount();
      await act(async () =>
        finish({ ok: true, status: 200, json: async () => ({ accessToken: 'new' }) })
      );
      expect(result.current.status).toBe('loading');
    });

    it('logs out without a refresh token', () => {
      tokenStore.setAccess(fakeAccessToken());
      const logout = jest.spyOn(authApi, 'logout');
      const { result } = renderHook(() => useAuth(), { wrapper });
      act(() => result.current.logout());
      expect(logout).not.toHaveBeenCalled();
      expect(result.current.status).toBe('anonymous');
    });
  });
});

// ─── Billing ─────────────────────────────────────────────────────────────────

describe('billing edge cases', () => {
  it('maps API errors without details', () => {
    expect(reasonFromError(new ApiError('x', 402, 'PLAN_LIMIT'))).toEqual({ kind: 'generic' });
    expect(reasonFromError(new ApiError('x', 402))).toEqual({ kind: 'generic' });
  });

  it('shows the founder plan, free features and starts the trial from the pricing page', async () => {
    const api = createFakeApi();
    const catalog = f.catalog();
    catalog.limits.free.features.import = true;
    api.billingApi.plans.mockResolvedValue(catalog);
    renderWithProviders(
      <Routes>
        <Route path="/" element={<PricingPage />} />
        <Route path="/login" element={<p>registro</p>} />
      </Routes>,
      { api, authenticated: false }
    );
    expect(await screen.findByText(/quedan 87 plazas/)).toBeInTheDocument();
    // Import is free in this catalog: four ticks instead of three (import, analysis, forecast, advisor).
    expect(screen.getAllByText('✓')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: tr('pricing.cta', { days: 14 }) }));
    expect(screen.getByText('registro')).toBeInTheDocument();
  });

  it('locks the analysis on the free plan and waits for the plan', async () => {
    const api = createFakeApi();
    let resolve!: (v: ReturnType<typeof f.billing>) => void;
    api.billingApi.get.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithProviders(<AnalysisView />, { api, plan: true });
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
    await act(async () => resolve(f.billing({ plan: 'free', trialDaysLeft: 0 })));
    fireEvent.click(screen.getByRole('button', { name: tr('billing.seePlans') }));
    expect(
      screen.getByText(tr('billing.reason.feature', { feature: tr('billing.feature.insights') }))
    ).toBeInTheDocument();
    expect(api.insightsApi.trends).not.toHaveBeenCalled();
  });

  it('offers Premium from the automatic analysis', async () => {
    const api = createFakeApi();
    api.insightsApi.advice.mockResolvedValue(
      f.advice({ source: 'rules', reason: 'premium_required' })
    );
    renderWithProviders(<AIAdvisor year={2026} month={3} />, { api, plan: true });
    fireEvent.click(screen.getByRole('button', { name: tr('app.ai.btn.analyze') }));
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('billing.seePlans')) })
    );
    expect(screen.getByRole('dialog', { name: tr('billing.upgradeTitle') })).toBeInTheDocument();
  });

  it('shows offers while loading and hides the empty text on errors', async () => {
    const { OffersView } = await import('@modules/billing/ui/OffersView');
    const api = createFakeApi();
    api.offersApi.list.mockRejectedValue(new Error('Sin ofertas'));
    renderWithProviders(<OffersView />, { api, finances: false });
    expect(screen.getByText(tr('app.common.loading'))).toBeInTheDocument();
    expect(await screen.findByText('Sin ofertas')).toBeInTheDocument();
    expect(screen.queryByText(tr('offers.empty'))).toBeNull();
  });
});

// ─── Finances ────────────────────────────────────────────────────────────────

describe('finances edge cases', () => {
  it('formats alert values and month alert messages', () => {
    const format = {
      money: (n: number) => `${n}€`,
      percent: (n: number, d?: number) => `${n.toFixed(d)}%`,
    };
    expect(formatMetricValue(format as never, 'percent', 12.5)).toBe('12.5%');
    expect(formatMetricValue(format as never, 'percent', 12)).toBe('12%');
    const t = (k: string, v?: Record<string, unknown>) => `${k}${JSON.stringify(v)}`;
    expect(monthAlertMessage(f.monthAlert({ level: 'danger' }), t, (n) => n)).toContain(
      'globalDanger'
    );
    expect(
      monthAlertMessage(
        f.monthAlert({ kind: 'category_budget', categoryName: null }),
        t,
        (n) => `[${n}]`
      )
    ).toContain('budgetWarning');
    expect(intlLocale('fr')).toBe('fr');
  });

  it('notifies alerts only with permission, once, and survives failures', async () => {
    const props = {
      enabled: true,
      isCurrentPeriod: true,
      year: 2026,
      month: 3,
      alerts: [f.monthAlert()],
      title: 'T',
      message: () => 'M',
    };
    mockedNotifications.hasNotificationPermission.mockResolvedValueOnce(false);
    renderHook(() => useAlertNotifications(props));
    await act(async () => undefined);
    expect(mockedNotifications.showNotification).not.toHaveBeenCalled();

    localStorage.setItem('mm_notified_alerts', JSON.stringify(['2026-3-available-all-warning']));
    mockedNotifications.hasNotificationPermission.mockResolvedValue(true);
    renderHook(() => useAlertNotifications(props));
    await act(async () => undefined);
    expect(mockedNotifications.showNotification).not.toHaveBeenCalled();

    localStorage.clear();
    mockedNotifications.showNotification.mockRejectedValueOnce(new Error('blocked'));
    renderHook(() => useAlertNotifications(props));
    await act(async () => undefined);
    expect(mockedNotifications.showNotification).toHaveBeenCalledTimes(1);

    // Unmounted before the permission check answers: nothing is shown.
    let allow!: (v: boolean) => void;
    mockedNotifications.hasNotificationPermission.mockReturnValueOnce(
      new Promise((r) => (allow = r))
    );
    const { unmount } = renderHook(() => useAlertNotifications(props));
    unmount();
    await act(async () => allow(true));
    expect(mockedNotifications.showNotification).toHaveBeenCalledTimes(1);
  });

  it('keeps an account the user picked when the default changes', () => {
    const { result, rerender } = renderHook(
      ({ id }) =>
        useTransactionForm({
          availableBalance: 0,
          onSubmit: jest.fn(),
          defaultDate: '2026-03-15',
          defaultAccountId: id,
          formatMoney: String,
          t: (k) => k,
        }),
      { initialProps: { id: null as string | null } }
    );
    act(() => result.current.setAccountId('mine'));
    rerender({ id: 'a1' });
    expect(result.current.fields.accountId).toBe('mine');
  });

  it('shows days with a negative balance, empty weeks and closes stale calendar days', () => {
    const expense = f.transaction({ id: 'x', amount: 30, date: '2026-03-04' });
    renderWithProviders(
      <CalendarDayModal dayKey="2026-03-04" items={[expense]} onClose={jest.fn()} />,
      {
        finances: false,
      }
    );
    expect(
      screen.getByText(/−30,00/, { selector: '.cal-modal-summary-amount--balance' })
    ).toBeInTheDocument();
  });

  it('closes the calendar popup when the day loses its movements', () => {
    const tx = f.transaction({ date: '2026-03-04' });
    const { rerender } = renderWithI18n(
      <TransactionCalendarView
        calendarRows={buildCalendarMonth(2026, 3, [tx])}
        year={2026}
        month={3}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^4/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    rerender(
      <TransactionCalendarView
        calendarRows={buildCalendarMonth(2026, 3, [])}
        year={2026}
        month={3}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the empty week view and category charts without totals', () => {
    renderWithI18n(<TransactionWeekView weekGroups={[]} />);
    expect(screen.getByText(tr('app.transaction.table.empty'))).toBeInTheDocument();
    renderWithI18n(
      <CategoryChart
        summary={f.summary({
          incomeByCategory: {},
          savingByCategory: { Ahorro: 0 },
          totalSaving: 0,
        })}
      />
    );
    expect(screen.queryByText(tr('app.categoryChart.income'))).toBeNull();
    expect(screen.getByText(tr('app.categoryChart.saving'))).toBeInTheDocument();
  });

  it('draws long net worth series with sparse labels and reports trend errors', async () => {
    const api = createFakeApi();
    api.insightsApi.trends.mockRejectedValue(new Error('Sin tendencias'));
    api.insightsApi.netWorth.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        year: 2026,
        month: i + 1,
        available: i * 10,
        saved: i,
        netWorth: i * 11,
      }))
    );
    renderWithProviders(<AnalysisView />, { api });
    expect(await screen.findByText('Sin tendencias')).toBeInTheDocument();
    const chart = await screen.findByRole('img', { name: tr('app.analysis.netWorthTitle') });
    expect(within(chart).getAllByText(/^(Ene|Mar|May|Jul|Ago)$/)).toHaveLength(5);
  });
});

describe('dashboard edge cases', () => {
  const sub = f.billing().subscription;

  it('manages categories, budgets, avatar, plan banner and imports from the dashboard', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(
      f.overview({
        budgets: [f.budgetLine()],
        transactions: [f.transaction({ notes: null, accountId: undefined })],
      })
    );
    api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Ocio' })]);
    api.categoryApi.create.mockResolvedValue(f.category({ id: 'c2', name: 'Viajes' }));
    api.categoryApi.update.mockResolvedValue(f.category({ id: 'c1', name: 'Diversión' }));
    api.billingApi.get.mockResolvedValue(f.billing({ trialDaysLeft: 2, subscription: { ...sub } }));
    renderWithProviders(<Dashboard />, { api, plan: true, user: f.user({ avatarUrl: 'data:x' }) });
    expect(document.querySelector('img.header-avatar')).not.toBeNull();

    // Trial reminder → plan section.
    fireEvent.click(await screen.findByRole('button', { name: tr('billing.seePlans') }));
    expect(screen.getByRole('region', { name: tr('app.tabs.plan') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: literal(tr('app.tabs.monthly')),
      })
    );

    // Budget panel → budgets section and back.
    fireEvent.click(await screen.findByRole('button', { name: tr('app.budgets.manage') }));
    expect(screen.getByRole('region', { name: tr('app.tabs.budgets') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: literal(tr('app.tabs.monthly')),
      })
    );

    // Category manager: create, rename, close.
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.transaction.form.title')) })
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: tr('app.transaction.form.category.placeholder') }),
      { target: { value: '__manage__' } }
    );
    const manager = await screen.findByRole('dialog', { name: tr('app.category.manager.title') });
    fireEvent.change(
      within(manager).getByRole('textbox', { name: tr('app.category.manager.name.placeholder') }),
      { target: { value: 'Viajes' } }
    );
    fireEvent.click(
      within(manager).getByRole('button', { name: tr('app.category.manager.create') })
    );
    await waitFor(() => expect(within(manager).getByText('Viajes')).toBeInTheDocument());
    fireEvent.click(
      within(manager).getByRole('button', {
        name: `${tr('app.category.manager.rename')} ${tr('app.categories.Ocio')}`,
      })
    );
    fireEvent.keyDown(
      within(manager).getByRole('textbox', { name: tr('app.category.manager.rename') }),
      { key: 'Enter' }
    );
    await waitFor(() => expect(api.categoryApi.update).toHaveBeenCalled());
    fireEvent.click(
      within(manager).getByRole('button', {
        name: `${tr('app.category.manager.delete.title')} Viajes`,
      })
    );
    await waitFor(() => expect(api.categoryApi.delete).toHaveBeenCalledWith('c2', undefined));
    fireEvent.click(
      within(manager).getAllByRole('button', { name: tr('app.category.manager.close') })[0]
    );
    expect(screen.queryByRole('dialog', { name: tr('app.category.manager.title') })).toBeNull();

    // Edit a movement without notes nor account: the API error is shown.
    api.transactionApi.update.mockRejectedValueOnce(new Error('No guardado'));
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` })
    );
    const dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    fireEvent.change(dialog.querySelector('input[type="date"]')!, {
      target: { value: '2026-03-12' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    expect(await within(dialog).findByText('No guardado')).toBeInTheDocument();
  });

  it('starts a non-current month on its first day while it loads', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(screen.getByRole('button', { name: `‹ ${tr('app.nav.prev')}` }));
    fireEvent.click(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    );
    expect(screen.getByRole('button', { name: tr('app.transaction.form.date') })).toHaveTextContent(
      '1 feb 2026'
    );
  });
});

// ─── Remaining branches ──────────────────────────────────────────────────────

describe('more edge cases', () => {
  it('shows offers in Spanish', async () => {
    const { OffersView } = await import('@modules/billing/ui/OffersView');
    const api = createFakeApi();
    api.offersApi.list.mockResolvedValue({
      enabled: true,
      offers: [
        {
          id: 'o1',
          category: 'savings',
          name: 'Banco',
          icon: '💶',
          title: { es: 'Cuenta remunerada', en: 'Savings account' },
          description: { es: 'Desc', en: 'Desc' },
          highlight: null,
          url: 'https://x.test',
          active: true,
        },
      ],
    });
    renderWithProviders(<OffersView />, { api, finances: false });
    expect(await screen.findByText('Cuenta remunerada')).toBeInTheDocument();
  });

  it('edits a global alert and creates another one', async () => {
    const { CustomAlertsTab } = await import('@modules/finances/ui/components/CustomAlertsTab');
    const api = createFakeApi();
    api.customAlertApi.getAll.mockResolvedValue([f.customAlert({ id: 'g1', name: 'Global' })]);
    renderWithProviders(<CustomAlertsTab categories={[]} />, { api });
    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(tr('app.customAlerts.edit')) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.form.save') }));
    await waitFor(() =>
      expect(api.customAlertApi.update).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ category: null })
      )
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.new') }));
    fireEvent.change(screen.getByLabelText(tr('app.customAlerts.form.name')), {
      target: { value: 'Ahorro' },
    });
    fireEvent.change(screen.getByLabelText(new RegExp(tr('app.customAlerts.form.threshold'))), {
      target: { value: '10.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.customAlerts.form.create') }));
    await waitFor(() =>
      expect(api.customAlertApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ category: null })
      )
    );
  });

  it('exports every movement, with account names and unknown types', async () => {
    const { SettingsView } = await import('@modules/finances/ui/views/SettingsView');
    const { captureDownloads } = await import('@test-utils/dom');
    const downloads = captureDownloads();
    const api = createFakeApi();
    api.dataApi.exportAll.mockResolvedValue({
      transactions: [
        {
          date: '2026-03-01',
          description: 'A',
          category: 'Ocio',
          type: 'EXPENSE',
          amount: 1,
          notes: null,
          accountName: 'Principal',
        },
        {
          date: '2026-03-02',
          description: 'B',
          category: 'Ocio',
          type: 'TRANSFER',
          amount: 2,
          notes: 'n',
          account: 'a2',
        },
        {
          date: '2026-03-03',
          description: 'C',
          category: 'Ocio',
          type: 'INCOME',
          amount: 3,
          notes: null,
        },
      ],
    });
    api.settingsApi.get.mockResolvedValue(f.settings({ defaultAccountId: null }));
    api.accountApi.getAll.mockResolvedValue({
      accounts: [f.account({ id: 'a1' }), f.account({ id: 'a2' })],
      total: 0,
    });
    renderWithProviders(<SettingsView onOpenProfile={jest.fn()} onStartTour={jest.fn()} />, {
      api,
    });
    // No default account yet: the select has no matching option.
    expect(
      await screen.findByRole('combobox', { name: new RegExp(tr('app.settings.defaultAccount')) })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.settings.exportCsv')) }));
    await waitFor(() => expect(downloads.names).toHaveLength(1));
    const [csv] = await downloads.text();
    expect(csv).toContain('"Principal"');
    expect(csv).toContain('"TRANSFER"');
    expect(csv).toContain('"a2"');
    downloads.restore();
  });

  it('maps any column and imports into the default account of the API', async () => {
    const { ImportModal } = await import('@modules/finances/ui/components/ImportModal');
    const api = createFakeApi();
    api.transactionApi.import.mockResolvedValue({
      dryRun: true,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [
        {
          index: 0,
          status: 'imported',
          date: '2026-03-01',
          description: 'X',
          amount: 1,
          type: 'EXPENSE',
        },
      ],
    });
    renderWithProviders(<ImportModal accounts={[]} onClose={jest.fn()} onImported={jest.fn()} />, {
      api,
      finances: false,
    });
    const bytes = new TextEncoder().encode('Fecha;;Importe\n01/03/2026;Pan;-1\n');
    const file = Object.assign(new File([bytes as BlobPart], 'x.csv'), {
      arrayBuffer: async () => bytes.buffer,
    });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    const description = await screen.findByRole('combobox', {
      name: tr('app.import.col.description'),
    });
    expect(within(description).getByRole('option', { name: '#2' })).toBeInTheDocument();
    fireEvent.change(description, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await waitFor(() =>
      expect(api.transactionApi.import).toHaveBeenCalledWith(expect.any(Array), {
        accountId: null,
        dryRun: true,
      })
    );
    // A row without category data still renders.
    expect(await screen.findByText('X')).toBeInTheDocument();
  });

  it('does not save notes twice when Enter and blur happen together', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [f.transaction({ id: 't1' })] }));
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.transaction.table.notes.placeholder') })
    );
    const input = screen.getByRole('textbox', { name: tr('app.transaction.table.notes') });
    fireEvent.change(input, { target: { value: 'nota' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);
    });
    await waitFor(() => expect(api.transactionApi.patch).toHaveBeenCalledTimes(1));
  });

  it('reads short CSV rows and odd Norma 43 movements', async () => {
    const { rowsFromCSV, parseNorma43 } = await import('@modules/finances/domain/importParsers');
    const mapping = { date: 0, description: 1, amount: 2, debit: -1, credit: -1, category: 5 };
    expect(rowsFromCSV([['h'], ['01/03/2026', 'Pan', '-1']], mapping).rows).toEqual([
      { date: '2026-03-01', description: 'Pan', amount: -1, category: null },
    ]);
    const line = (s: string) => s.padEnd(80, ' ');
    const movement = (amount: string, refs = '') =>
      line(
        '22' +
          '    ' +
          '1234' +
          '260303' +
          '260303' +
          '02' +
          '000' +
          '2' +
          amount +
          '0000000002' +
          refs
      );
    const text = [
      line('11' + '0049'),
      movement('00000000001000', 'REFERENCIA'),
      movement('00000000002000'),
      movement('00000000000000'),
      line('88'),
    ].join('\n');
    expect(parseNorma43(text)).toEqual({
      rows: [
        { date: '2026-03-03', description: 'REFERENCIA', amount: 10 },
        { date: '2026-03-03', description: 'Movimiento', amount: 20 },
      ],
      skipped: [4],
    });
  });

  it('keeps an archived account selectable for its movements and handles no account', async () => {
    const api = createFakeApi();
    api.accountApi.getAll.mockResolvedValue({
      accounts: [
        f.account({ id: 'a1' }),
        f.account({ id: 'a2', name: 'Efectivo' }),
        f.account({ id: 'old', name: 'Vieja', archived: true }),
      ],
      total: 0,
    });
    api.monthApi.get.mockResolvedValue(
      f.overview({
        transactions: [
          f.transaction({ id: 't1', accountId: 'old' }),
          f.transaction({ id: 't2', description: 'Sin cuenta', accountId: undefined }),
        ],
      })
    );
    renderWithProviders(<Dashboard />, { api });
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.transaction.table.edit')}: Cena` })
    );
    let dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    expect(within(dialog).getByRole('option', { name: /Vieja/ })).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getAllByRole('button', { name: tr('app.transaction.form.cancel') })[0]
    );
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Sin cuenta` })
    );
    dialog = screen.getByRole('dialog', { name: tr('app.transaction.edit.title') });
    expect(within(dialog).queryByRole('option', { name: /Vieja/ })).toBeNull();
  });

  it('shows budget and goal loading errors', async () => {
    const { BudgetsView } = await import('@modules/finances/ui/views/BudgetsView');
    const { GoalsView } = await import('@modules/finances/ui/views/GoalsView');
    const api = createFakeApi();
    api.budgetApi.getAll.mockRejectedValue(new Error('Sin presupuestos'));
    api.goalApi.getAll.mockRejectedValue(new Error('Sin metas'));
    renderWithProviders(
      <>
        <BudgetsView />
        <GoalsView />
      </>,
      { api }
    );
    expect(await screen.findByText('Sin presupuestos')).toBeInTheDocument();
    expect(await screen.findByText('Sin metas')).toBeInTheDocument();
  });

  it('pages search results and clears filters', async () => {
    const { SearchView } = await import('@modules/finances/ui/views/SearchView');
    const api = createFakeApi();
    const page = (id: string) => ({
      items: [f.transaction({ id, description: id })],
      total: 3,
      totals: { income: 0, expenses: 0, saving: 0 },
    });
    api.transactionApi.search
      .mockResolvedValueOnce(page('uno'))
      .mockResolvedValueOnce(page('dos'))
      .mockResolvedValueOnce(page('tres'));
    renderWithProviders(<SearchView onEdit={jest.fn()} />, { api });
    await screen.findByText('uno');
    fireEvent.click(screen.getByRole('button', { name: tr('app.search.more') }));
    await screen.findByText('dos');
    fireEvent.click(screen.getByRole('button', { name: tr('app.search.more') }));
    expect(await screen.findByText('tres')).toBeInTheDocument();
    expect(screen.getByText('uno')).toBeInTheDocument();

    const max = screen.getByRole('spinbutton', { name: tr('app.search.max') });
    fireEvent.change(max, { target: { value: '50' } });
    fireEvent.change(max, { target: { value: '' } });
    const text = screen.getByRole('searchbox');
    fireEvent.change(text, { target: { value: 'x' } });
    fireEvent.change(text, { target: { value: '  ' } });
    await waitFor(
      () =>
        expect(api.transactionApi.search).toHaveBeenLastCalledWith(
          expect.objectContaining({ max: undefined })
        ),
      { timeout: 2000 }
    );
  });

  it('ignores a failed logout request', async () => {
    tokenStore.setSession(fakeAccessToken(), 'refresh');
    jest.spyOn(authApi, 'logout').mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
    act(() => result.current.logout());
    await act(async () => undefined);
    expect(result.current.status).toBe('anonymous');
  });

  it('refreshes the month after importing from the dashboard', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [f.transaction()] }));
    api.transactionApi.import
      .mockResolvedValueOnce({ dryRun: true, imported: 1, duplicates: 0, invalid: 0, rows: [] })
      .mockResolvedValueOnce({ dryRun: false, imported: 1, duplicates: 0, invalid: 0, rows: [] });
    renderWithProviders(<Dashboard />, { api });
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.import.open')) }));
    await screen.findByRole('dialog', { name: tr('app.import.title') });
    const bytes = new TextEncoder().encode('Fecha;Concepto;Importe\n01/03/2026;Pan;-1\n');
    const file = Object.assign(new File([bytes as BlobPart], 'x.csv'), {
      arrayBuffer: async () => bytes.buffer,
    });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.import.preview') }));
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalledTimes(2));
  });
});

describe('calendar and search details', () => {
  it('shows a positive day balance and custom period titles', () => {
    const income = f.transaction({ id: 'i', type: 'INCOME', amount: 50, date: '2026-03-04' });
    const range = { start: '2026-03-25', end: '2026-04-24' };
    const { rerender } = renderWithI18n(
      <TransactionCalendarView
        calendarRows={buildCalendarMonth(2026, 3, [income], range)}
        year={2026}
        month={3}
        range={range}
      />
    );
    expect(screen.getByText('25 mar – 24 abr')).toBeInTheDocument();
    rerender(
      <TransactionCalendarView
        calendarRows={buildCalendarMonth(2026, 3, [income])}
        year={2026}
        month={3}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^4/ }));
    expect(
      screen.getByText(/\+50,00/, { selector: '.cal-modal-summary-amount--balance' })
    ).toBeInTheDocument();
    // Another month: the open day is not in the grid any more.
    rerender(
      <TransactionCalendarView
        calendarRows={buildCalendarMonth(2026, 4, [])}
        year={2026}
        month={4}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('searches typed text and loads more after changing filters', async () => {
    const { SearchView } = await import('@modules/finances/ui/views/SearchView');
    const api = createFakeApi();
    const page = (id: string) => ({
      items: [f.transaction({ id, description: id })],
      total: 2,
      totals: { income: 0, expenses: 0, saving: 0 },
    });
    api.transactionApi.search.mockImplementation(async (filters) =>
      page(`p${filters.offset}-${filters.sort}`)
    );
    renderWithProviders(<SearchView onEdit={jest.fn()} />, { api });
    await screen.findByText('p0-date_desc');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' taxi ' } });
    await waitFor(
      () =>
        expect(api.transactionApi.search).toHaveBeenLastCalledWith(
          expect.objectContaining({ q: 'taxi' })
        ),
      { timeout: 2000 }
    );
    // Clearing the text removes the filter.
    const calls = api.transactionApi.search.mock.calls.length;
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '   ' } });
    await waitFor(() => expect(api.transactionApi.search.mock.calls.length).toBe(calls + 1), {
      timeout: 2000,
    });
    expect(api.transactionApi.search.mock.calls[calls][0].q).toBeUndefined();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.search.sort') }), {
      target: { value: 'date_asc' },
    });
    await screen.findByText('p0-date_asc');
    fireEvent.click(screen.getByRole('button', { name: tr('app.search.more') }));
    expect(await screen.findByText('p1-date_asc')).toBeInTheDocument();
  });
});
