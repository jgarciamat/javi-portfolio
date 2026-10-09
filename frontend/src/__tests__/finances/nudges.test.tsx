import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const NEW_USER = f.billing({
  usage: { accounts: 1, budgets: 0, goals: 0, recurringRules: 0, customAlerts: 0, movements: 1 },
});
const SETTLED = f.billing({
  usage: { accounts: 1, budgets: 1, goals: 1, recurringRules: 1, customAlerts: 0, movements: 20 },
  ai: { used: 2, quota: 30 },
});

function setup(billing = SETTLED, previous = f.overview({ month: 2 }), settings = f.settings()) {
  const api = createFakeApi();
  api.settingsApi.get.mockResolvedValue(settings);
  api.billingApi.get.mockResolvedValue(billing);
  api.monthApi.get.mockResolvedValue(previous);
  const view = renderWithProviders(<Dashboard />, { api, plan: true });
  return { ...view, api };
}

describe('Getting started', () => {
  it('guides a new user, opens the section of a step and can be hidden for good', async () => {
    setup(NEW_USER);
    const card = await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(
      within(card).getByText(tr('app.gettingStarted.progress', { done: 0, total: 5 }))
    ).toBeVisible();
    expect(within(card).getAllByRole('button', { name: tr('app.gettingStarted.go') })).toHaveLength(
      3
    );
    expect(screen.queryByRole('region', { name: /Resumen de/ })).toBeNull();

    fireEvent.click(within(card).getAllByRole('button', { name: tr('app.gettingStarted.go') })[0]);
    expect(await screen.findByRole('region', { name: tr('app.tabs.budgets') })).toBeInTheDocument();
  });

  it('shows the progress and stays hidden once the user hides it', async () => {
    const partly = f.billing({
      usage: {
        accounts: 1,
        budgets: 1,
        goals: 0,
        recurringRules: 0,
        customAlerts: 0,
        movements: 4,
      },
    });
    const { unmount } = setup(partly);
    const card = await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(
      within(card).getByText(tr('app.gettingStarted.progress', { done: 2, total: 5 }))
    ).toBeVisible();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    fireEvent.click(within(card).getByRole('button', { name: tr('app.gettingStarted.hide') }));
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
    unmount();

    setup(partly);
    await screen.findByText(tr('app.nav.currentMonth'));
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
  });

  it('is not shown once everything was tried', async () => {
    setup(SETTLED);
    await screen.findByText(tr('app.nav.currentMonth'));
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
  });
});

describe('Month recap', () => {
  const recap = () => screen.findByRole('region', { name: /Resumen de febrero/i });

  it('closes the previous month once and remembers it was seen', async () => {
    const { api, unmount } = setup();
    const card = await recap();
    expect(api.monthApi.get).toHaveBeenCalledWith(2026, 2);
    expect(
      within(card).getByText(/Ingresaste .*2\.?000.*gastaste .*500.* ahorraste .*200/)
    ).toBeVisible();
    expect(within(card).getByText(/Cerraste el mes con .*1\.?300.* a tu favor/)).toBeVisible();
    expect(within(card).getByText(/mayor gasto fue .*Ocio.*300/)).toBeVisible();
    expect(within(card).getByText(/tasa de ahorro fue del 10/)).toBeVisible();
    fireEvent.click(within(card).getByRole('button', { name: tr('app.recap.dismiss') }));
    expect(screen.queryByRole('region', { name: /Resumen de febrero/i })).toBeNull();
    unmount();

    const again = setup();
    await screen.findByText(tr('app.nav.currentMonth'));
    expect(screen.queryByRole('region', { name: /Resumen de febrero/i })).toBeNull();
    // Nothing was requested for a recap that is already seen.
    expect(again.api.monthApi.get).not.toHaveBeenCalledWith(2026, 2);
  });

  it('reports an overspent month without a top expense or savings rate', async () => {
    setup(
      SETTLED,
      f.overview({
        month: 2,
        summary: f.summary({
          totalIncome: 0,
          totalExpenses: 90,
          totalSaving: 0,
          balance: -90,
          expensesByCategory: {},
          transactionCount: 1,
        }),
      })
    );
    const card = await recap();
    expect(within(card).getByText(/Cerraste el mes con .*90.* de más gastado/)).toBeVisible();
    expect(within(card).queryByText(/mayor gasto/)).toBeNull();
    expect(within(card).queryByText(/tasa de ahorro/)).toBeNull();
  });

  it('says nothing when the previous month had no movements', async () => {
    setup(SETTLED, f.overview({ month: 2, summary: f.summary({ transactionCount: 0 }) }));
    await waitFor(() => expect(screen.getByText(tr('app.nav.currentMonth'))).toBeVisible());
    await screen.findByRole('button', { name: new RegExp(tr('app.nav.prev')) });
    expect(screen.queryByRole('region', { name: /Resumen de/ })).toBeNull();
  });

  it('looks at December of the previous year in January', async () => {
    const january = f.settings({
      currentPeriod: { year: 2026, month: 1, start: '2026-01-01', end: '2026-01-31' },
    });
    const { api } = setup(SETTLED, f.overview({ year: 2025, month: 12 }), january);
    await screen.findByRole('region', { name: /Resumen de diciembre/i });
    expect(api.monthApi.get).toHaveBeenCalledWith(2025, 12);
  });
});
