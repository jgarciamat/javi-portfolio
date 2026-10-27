import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as notifications from '@core/notifications/notifications';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import * as navigation from '@modules/finances/ui/navigation';
import { DASHBOARD_SECTIONS } from '@modules/finances/ui/navigation';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@core/notifications/notifications', () => ({
  ...jest.requireActual('@core/notifications/notifications'),
  hasNotificationPermission: jest.fn().mockResolvedValue(true),
  showNotification: jest.fn().mockResolvedValue(undefined),
}));

const goTo = (labelKey: string) => {
  fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
  const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
  fireEvent.click(within(menu).getByRole('button', { name: literal(tr(labelKey)) }));
};

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('social links in the header', () => {
  const phone = (matches: boolean) =>
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  afterEach(() => delete (window as Partial<typeof window>).matchMedia);

  it('sit beside the title on a computer', () => {
    phone(false);
    renderWithProviders(<Dashboard />, { plan: true });
    const links = screen.getByRole('navigation', { name: tr('app.social.title') });
    expect(links.parentElement).toHaveClass('header-brand');
    expect(within(links).getAllByRole('link')).toHaveLength(3);
  });

  it('share the line of the Videoteca pill on a phone', () => {
    phone(true);
    renderWithProviders(<Dashboard />, { plan: true });
    const links = screen.getByRole('navigation', { name: tr('app.social.title') });
    expect(links.parentElement).toHaveClass('header');
    expect(within(links).getAllByRole('link')).toHaveLength(3);
  });
});

describe('menu and sections', () => {
  it('opens every section and remembers the last one', async () => {
    jest.spyOn(navigation, 'offersEnabled').mockReturnValue(true);
    const api = createFakeApi();
    renderWithProviders(<Dashboard />, { api, plan: true });
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalled());
    for (const section of DASHBOARD_SECTIONS) {
      goTo(section.labelKey);
      expect(screen.getByRole('region', { name: tr(section.labelKey) })).toBeInTheDocument();
    }
    expect(localStorage.getItem('mm_last_tab')).toBe('settings');
  });

  it('shows every group of the menu in two columns, the names as the screens, «Tu plan» for the tour only while open', async () => {
    renderWithProviders(<Dashboard />, { plan: true });
    const open = screen.getByRole('button', { name: tr('app.menu.open') });
    expect(document.querySelector('[data-tour="plan"]')).toBeNull();
    fireEvent.click(open);
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    expect(within(menu).getByRole('navigation', { name: tr('app.menu.ariaLabel') })).toBeVisible();
    expect(
      within(menu).getByRole('button', { name: literal(tr('app.tabs.plan')) })
    ).toHaveAttribute('data-tour', 'plan');
    fireEvent.click(
      within(menu).getByRole('button', { name: literal(tr('app.tabs.automations')) })
    );
    const region = await screen.findByRole('region', { name: tr('app.tabs.automations') });
    expect(region).toHaveFocus();
    expect(open).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the menu with Escape, the backdrop or the close button', () => {
    const { container } = renderWithProviders(<Dashboard />);
    const openButton = screen.getByRole('button', { name: tr('app.menu.open') });
    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).toBe('');
    fireEvent.click(openButton);
    fireEvent.click(container.querySelector('.burger-overlay')!);
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(openButton);
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.close') }));
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no offers entry while there are no offers', async () => {
    jest.spyOn(navigation, 'offersEnabled').mockReturnValue(false);
    const api = createFakeApi();
    renderWithProviders(<Dashboard />, { api });
    await waitFor(() => expect(api.settingsApi.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    expect(screen.queryByRole('button', { name: literal(tr('app.tabs.offers')) })).toBeNull();
    expect(screen.getByRole('button', { name: literal(tr('app.tabs.learn')) })).toBeInTheDocument();
  });

  it('hides the offers entry when the user turned offers off', async () => {
    jest.spyOn(navigation, 'offersEnabled').mockReturnValue(true);
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ showOffers: false }));
    renderWithProviders(<Dashboard />, { api });
    await waitFor(() => expect(api.settingsApi.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: literal(tr('app.tabs.offers')) })).toBeNull()
    );
  });

  it('restores the stored section, falling back to the month', () => {
    localStorage.setItem('mm_last_tab', 'goals');
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole('region', { name: tr('app.tabs.goals') })).toBeInTheDocument();
  });

  it('opens the section a link points to and removes it from the address', () => {
    localStorage.setItem('mm_last_tab', 'goals');
    window.history.pushState({}, '', '/?tab=renta');
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole('region', { name: tr('app.tabs.renta') })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('ignores a link to a section that does not exist', () => {
    window.history.pushState({}, '', '/?tab=nope');
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole('region', { name: tr('app.tabs.monthly') })).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('opens the Invest section from the menu, free for every account', async () => {
    renderWithProviders(<Dashboard />);
    goTo('app.tabs.invest');
    expect(screen.getByRole('region', { name: tr('app.tabs.invest') })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: tr('app.invest.title') })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('note', { name: tr('app.invest.disclaimer.title') })
    ).toBeInTheDocument();
  });

  it('opens the Videoteca from the menu, free for every account', async () => {
    renderWithProviders(<Dashboard />);
    goTo('app.tabs.videos');
    expect(await screen.findByRole('link', { name: tr('videos.channel') })).toBeInTheDocument();
  });

  it('opens a month from the annual view', async () => {
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockResolvedValue({
      year: 2026,
      months: { 1: { income: 10, expenses: 5, saving: 0, balance: 5 } },
    });
    renderWithProviders(<Dashboard />, { api });
    goTo('app.tabs.annual');
    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: 'Ene' }));
    expect(screen.getByRole('region', { name: tr('app.tabs.monthly') })).toBeInTheDocument();
    await waitFor(() => expect(api.monthApi.get).toHaveBeenLastCalledWith(2026, 1));
  });
});

describe('header', () => {
  it('shows the user, opens the profile and logs out', async () => {
    const { authApi } = jest.requireActual('@core/api/authApi');
    const logout = jest.spyOn(authApi, 'logout').mockResolvedValue(undefined);
    const user = f.user({ avatar: '🦊' });
    localStorage.setItem('mm_user', JSON.stringify(user));
    renderWithProviders(<Dashboard />);
    // The profile lives in the menu, under the account group.
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    fireEvent.click(
      within(menu).getByRole('button', {
        name: tr('app.header.openProfileOf', { name: user.name }),
      })
    );
    expect(
      await screen.findByRole('dialog', { name: tr('app.profile.title') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.header.logout') }));
    expect(logout).toHaveBeenCalledWith('refresh-token');
    expect(localStorage.getItem('mm_token')).toBeNull();
  });

  it('goes from the profile to the settings and the plan sections, closing it', async () => {
    const user = f.user();
    renderWithProviders(<Dashboard />, { plan: true, user });
    const openProfile = () => {
      fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
      fireEvent.click(
        within(screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') })).getByRole('button', {
          name: tr('app.header.openProfileOf', { name: user.name }),
        })
      );
    };
    openProfile();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.profile.settings.title') }));
    expect(screen.queryByRole('dialog', { name: tr('app.profile.title') })).toBeNull();
    expect(screen.getByRole('region', { name: tr('app.tabs.settings') })).toBeInTheDocument();
    openProfile();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.profile.plan.open') }));
    expect(screen.queryByRole('dialog', { name: tr('app.profile.title') })).toBeNull();
    expect(screen.getByRole('region', { name: tr('app.tabs.plan') })).toBeInTheDocument();
  });
});

describe('invite from the menu', () => {
  it('opens the invitation link in a dialog, with its subtitle, and closes it', async () => {
    renderWithProviders(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    const menu = screen.getByRole('dialog', { name: tr('app.menu.ariaLabel') });
    expect(within(menu).getByText(tr('app.menu.inviteSub'))).toBeInTheDocument();
    fireEvent.click(within(menu).getByTestId('menu-invite'));
    const dialog = await screen.findByRole('dialog', { name: tr('billing.invite.title') });
    expect(await within(dialog).findByText('https://finanverso.app/?ref=ABCD2345')).toBeVisible();
    expect(within(dialog).getByText(tr('billing.invite.subtitle'))).toBeVisible();
    fireEvent.click(within(dialog).getAllByRole('button', { name: tr('app.common.close') })[0]);
    expect(screen.queryByRole('dialog', { name: tr('billing.invite.title') })).toBeNull();
  });
});

describe('import', () => {
  it('opens the importer for Premium and reloads after importing', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [f.transaction()] }));
    renderWithProviders(<Dashboard />, { api, plan: true });
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.import.open')) }));
    const dialog = await screen.findByRole('dialog', { name: tr('app.import.title') });
    fireEvent.click(within(dialog).getAllByRole('button', { name: tr('app.common.close') })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reads the balances of the accounts again after an import, not only the month', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [f.transaction()] }));
    const accounts = (principal: number) => ({
      accounts: [
        f.account({ id: 'a1', name: 'Principal', isDefault: true, balance: principal }),
        f.account({ id: 'a2', name: 'Otra', balance: 1000 }),
      ],
      total: principal + 1000,
    });
    api.accountApi.getAll.mockResolvedValue(accounts(5017.96));
    api.transactionApi.import
      .mockResolvedValueOnce({ dryRun: true, imported: 1, duplicates: 0, invalid: 0, rows: [] })
      .mockResolvedValueOnce({ dryRun: false, imported: 1, duplicates: 0, invalid: 0, rows: [] });
    renderWithProviders(<Dashboard />, { api });
    expect(await screen.findByText(/5\.017,96/)).toBeInTheDocument();
    const calls = api.accountApi.getAll.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.import.open')) }));
    const dialog = await screen.findByRole('dialog', { name: tr('app.import.title') });
    fireEvent.click(
      within(dialog).getByRole('tab', { name: literal(tr('app.import.source.paste')) })
    );
    fireEvent.change(within(dialog).getByLabelText(tr('app.import.paste.label')), {
      target: { value: '12/03/2026 Bar -3,00 €' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: literal(tr('app.import.paste.read')) })
    );
    fireEvent.click(await within(dialog).findByRole('button', { name: tr('app.import.preview') }));
    api.accountApi.getAll.mockResolvedValue(accounts(5014.96));
    fireEvent.click(
      await within(dialog).findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    await waitFor(() => expect(api.accountApi.getAll.mock.calls.length).toBeGreaterThan(calls));
    expect(await screen.findByText(/5\.014,96/)).toBeInTheDocument();
  });

  it('opens the importer on the free plan however many statements were imported', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({
        plan: 'free',
        trialDaysLeft: 0,
        limits: f.catalog().limits.free,
        usage: { ...f.billing().usage, imports: 7 },
      })
    );
    renderWithProviders(<Dashboard />, { api, plan: true });
    await waitFor(() => expect(api.billingApi.get).toHaveBeenCalled());
    await act(async () => undefined);
    // An empty month: its panel opens the importer.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.emptyMonth.import')) }));
    expect(await screen.findByRole('dialog', { name: tr('app.import.title') })).toBeInTheDocument();
  });
});

describe('budget alert notifications', () => {
  it('notifies each alert once when enabled', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ notificationsEnabled: true }));
    api.monthApi.get.mockResolvedValue(
      f.overview({
        alerts: [
          f.monthAlert(),
          f.monthAlert({ kind: 'category_budget', categoryName: 'Ocio', level: 'danger' }),
        ],
      })
    );
    renderWithProviders(<Dashboard />, { api });
    await waitFor(() => expect(notifications.showNotification).toHaveBeenCalledTimes(2));
    expect(JSON.parse(localStorage.getItem('mm_notified_alerts')!)).toHaveLength(2);
  });
});
