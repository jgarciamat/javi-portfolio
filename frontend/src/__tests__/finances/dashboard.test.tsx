import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as notifications from '@core/notifications/notifications';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
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
  const menu = screen.getByRole('complementary', { name: tr('app.menu.ariaLabel') });
  fireEvent.click(within(menu).getByRole('button', { name: literal(tr(labelKey)) }));
};

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('menu and sections', () => {
  it('opens every section and remembers the last one', async () => {
    const api = createFakeApi();
    renderWithProviders(<Dashboard />, { api, plan: true });
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalled());
    for (const section of DASHBOARD_SECTIONS) {
      goTo(section.labelKey);
      expect(screen.getByRole('region', { name: tr(section.labelKey) })).toBeInTheDocument();
    }
    expect(localStorage.getItem('mm_last_tab')).toBe('settings');
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

  it('hides the offers entry when the user turned offers off', async () => {
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
    localStorage.setItem('mm_user', JSON.stringify(f.user({ avatarUrl: 'data:x' })));
    renderWithProviders(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: tr('app.header.openProfile') }));
    expect(screen.getByRole('dialog', { name: tr('app.profile.title') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.header.logout') }));
    expect(logout).toHaveBeenCalledWith('refresh-token');
    expect(localStorage.getItem('mm_token')).toBeNull();
  });
});

describe('import', () => {
  it('opens the importer for Premium and reloads after importing', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: [f.transaction()] }));
    renderWithProviders(<Dashboard />, { api, plan: true });
    await screen.findByText('Cena');
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.import.open')) }));
    const dialog = screen.getByRole('dialog', { name: tr('app.import.title') });
    fireEvent.click(within(dialog).getAllByRole('button', { name: tr('app.common.close') })[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the paywall on the free plan', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing({ plan: 'free', trialDaysLeft: 0 }));
    renderWithProviders(<Dashboard />, { api, plan: true });
    await waitFor(() => expect(api.billingApi.get).toHaveBeenCalled());
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.import.open')) }));
    expect(
      await screen.findByRole('dialog', { name: tr('billing.upgradeTitle') })
    ).toBeInTheDocument();
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
