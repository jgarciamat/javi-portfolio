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
  ai: { used: 2, quota: 10 },
});

/** The user hid the "first steps" panel (on any device). */
const PANEL_HIDDEN = f.settings({ showGettingStarted: false });

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
    const { api, unmount } = setup(partly);
    const card = await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(
      within(card).getByText(tr('app.gettingStarted.progress', { done: 2, total: 5 }))
    ).toBeVisible();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    fireEvent.click(within(card).getByRole('button', { name: tr('app.gettingStarted.hide') }));
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
    // Saved in the account: it stays hidden on the web, in the app and on other devices.
    expect(api.settingsApi.update).toHaveBeenCalledWith({ showGettingStarted: false });
    unmount();

    setup(partly);
    await screen.findByText(tr('app.nav.currentMonth'));
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
  });

  it('hides at once even if the account cannot be updated (offline)', async () => {
    const { api } = setup(NEW_USER);
    api.settingsApi.update.mockRejectedValue(new Error('offline'));
    const card = await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    fireEvent.click(within(card).getByRole('button', { name: tr('app.gettingStarted.hide') }));
    await waitFor(() => expect(api.settingsApi.update).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
  });

  it('stays with every step done until the user hides it', async () => {
    setup(SETTLED);
    const card = await screen.findByRole('region', { name: tr('app.gettingStarted.title') });
    expect(within(card).getByText(tr('app.gettingStarted.allDone'))).toBeVisible();
    expect(within(card).queryByRole('button', { name: tr('app.gettingStarted.go') })).toBeNull();
    expect(screen.queryByRole('region', { name: /Resumen de/ })).toBeNull();
  });

  it('is not shown where the user hid it on another device', async () => {
    setup(NEW_USER, undefined, PANEL_HIDDEN);
    await screen.findByRole('region', { name: /Resumen de febrero/i });
    expect(screen.queryByRole('region', { name: tr('app.gettingStarted.title') })).toBeNull();
  });
});

describe('Getting started progress', () => {
  const usage = (over: Partial<ReturnType<typeof f.billing>['usage']>) =>
    f.billing({
      usage: {
        accounts: 1,
        budgets: 0,
        goals: 0,
        recurringRules: 0,
        customAlerts: 0,
        movements: 1,
        ...over,
      },
      ai: { used: 0, quota: 10 },
    });
  const card = () => screen.findByRole('region', { name: tr('app.gettingStarted.title') });
  const goTo = (labelKey: string) => {
    fireEvent.click(screen.getByRole('button', { name: tr('app.menu.open') }));
    const menu = screen.getByRole('complementary', { name: tr('app.menu.ariaLabel') });
    fireEvent.click(within(menu).getByRole('button', { name: new RegExp(tr(labelKey)) }));
  };

  it('ticks a step done in its section as soon as the user comes back', async () => {
    const { api } = setup(usage({}));
    expect(
      within(await card()).getByText(tr('app.gettingStarted.progress', { done: 0, total: 5 }))
    ).toBeVisible();
    fireEvent.click(
      within(await card()).getAllByRole('button', { name: tr('app.gettingStarted.go') })[0]
    );
    await screen.findByRole('region', { name: tr('app.tabs.budgets') });

    // The budget is created there; back in the month view the counts are asked again.
    api.billingApi.get.mockResolvedValue(usage({ budgets: 1 }));
    goTo('app.tabs.monthly');
    expect(
      await within(await card()).findByText(
        tr('app.gettingStarted.progress', { done: 1, total: 5 })
      )
    ).toBeVisible();
    const budgetStep = within(await card())
      .getByText(tr('app.gettingStarted.budget'))
      .closest('li')!;
    expect(budgetStep).toHaveClass('is-done');
    expect(within(budgetStep).queryByRole('button')).toBeNull();
  });

  it('ticks the analysis even without the AI provider and celebrates when all is done', async () => {
    setup(usage({ movements: 5, budgets: 1, goals: 1, recurringRules: 1 }));
    expect(
      within(await card()).getByText(tr('app.gettingStarted.progress', { done: 4, total: 5 }))
    ).toBeVisible();
    // The analysis falls back to the rules: the AI quota stays at 0.
    fireEvent.click(screen.getByRole('button', { name: /Analizar mes/ }));
    expect(await within(await card()).findByText(tr('app.gettingStarted.allDone'))).toBeVisible();
  });

  it('keeps a step done after its data is gone or a new month starts', async () => {
    localStorage.setItem(
      `mm_getting_started_done:${f.user().id}`,
      JSON.stringify(['budget', 'ai'])
    );
    setup(usage({}));
    expect(
      within(await card()).getByText(tr('app.gettingStarted.progress', { done: 2, total: 5 }))
    ).toBeVisible();
  });
});

describe('Month recap', () => {
  const recap = () => screen.findByRole('region', { name: /Resumen de febrero/i });

  it('closes the previous month once and remembers it was seen', async () => {
    const { api, unmount } = setup(SETTLED, undefined, PANEL_HIDDEN);
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

    const again = setup(SETTLED, undefined, PANEL_HIDDEN);
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
      }),
      PANEL_HIDDEN
    );
    const card = await recap();
    expect(within(card).getByText(/Cerraste el mes con .*90.* de más gastado/)).toBeVisible();
    expect(within(card).queryByText(/mayor gasto/)).toBeNull();
    expect(within(card).queryByText(/tasa de ahorro/)).toBeNull();
  });

  it('says nothing when the previous month had no movements', async () => {
    setup(
      SETTLED,
      f.overview({ month: 2, summary: f.summary({ transactionCount: 0 }) }),
      PANEL_HIDDEN
    );
    await waitFor(() => expect(screen.getByText(tr('app.nav.currentMonth'))).toBeVisible());
    await screen.findByRole('button', { name: new RegExp(tr('app.nav.prev')) });
    expect(screen.queryByRole('region', { name: /Resumen de/ })).toBeNull();
  });

  it('looks at December of the previous year in January', async () => {
    const january = f.settings({
      showGettingStarted: false,
      currentPeriod: { year: 2026, month: 1, start: '2026-01-01', end: '2026-01-31' },
    });
    const { api } = setup(SETTLED, f.overview({ year: 2025, month: 12 }), january);
    await screen.findByRole('region', { name: /Resumen de diciembre/i });
    expect(api.monthApi.get).toHaveBeenCalledWith(2025, 12);
  });
});
