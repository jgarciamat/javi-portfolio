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

/** Movements over two weeks: enough for the forecast to mean something. */
const HISTORY = [f.transaction({ date: '2026-03-01' })];

function setup(forecast = f.forecast(), options: { plan?: boolean } = {}) {
  const api = createFakeApi();
  api.insightsApi.forecast.mockResolvedValue(forecast);
  api.monthApi.get.mockResolvedValue(f.overview({ transactions: HISTORY }));
  const view = renderWithProviders(<Dashboard />, { ...options, api });
  return { ...view, api };
}

/** Text that may be preceded by an emoji in the same element. */
const has = (key: string) => new RegExp(tr(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const titleButton = { name: /¿Llegas a fin de mes\?/ };

const panel = async () => {
  const header = await screen.findByRole('button', titleButton);
  return within(header.closest('.card') as HTMLElement);
};

/** The month-by-month table (the end-of-month block has tables of its own). */
const outlookOf = (view: Awaited<ReturnType<typeof panel>>) =>
  within(view.getByRole('region', { name: tr('app.forecast.outlook') }));

const whatIf = { name: tr('app.forecast.whatIf') };

describe('Forecast panel', () => {
  it('says how the month would end, what can be spent a day and the coming months (Premium)', async () => {
    const { api } = setup();
    const view = await panel();
    expect(await view.findByText(tr('app.forecast.eom.kicker'))).toBeInTheDocument();
    expect(view.getByText(/^1\.?762,98/)).toBeInTheDocument();
    expect(view.getByText(/423,62.*\/día/, { selector: 'strong' })).toBeInTheDocument();
    expect(view.getByText(tr('app.forecast.eom.status.ok'))).toBeInTheDocument();
    expect(view.getByText(has('app.forecast.noShortfall'))).toBeInTheDocument();
    const rows = outlookOf(view).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 projected months
    expect(within(rows[1]).getByText(/1\.?200/)).toBeInTheDocument();
    expect(api.insightsApi.forecast).toHaveBeenCalledWith(6, []);
  });

  it('asks again for another range and for scenarios without a recurring expense', async () => {
    const { api } = setup();
    const view = await panel();
    await view.findByRole('region', { name: tr('app.forecast.outlook') });
    fireEvent.change(view.getByLabelText(tr('app.forecast.range')), { target: { value: '3' } });
    await waitFor(() => expect(api.insightsApi.forecast).toHaveBeenLastCalledWith(3, []));
    // Only expenses can be left out, not the payslip.
    expect(view.queryByLabelText(/Nómina/)).toBeNull();
    const rent = view.getByLabelText(/Sin Alquiler/);
    fireEvent.click(rent);
    await waitFor(() => expect(api.insightsApi.forecast).toHaveBeenLastCalledWith(3, ['r-rent']));
    expect(rent).toBeChecked();
    fireEvent.click(rent);
    await waitFor(() => expect(api.insightsApi.forecast).toHaveBeenLastCalledWith(3, []));
  });

  it('warns about the month the money runs out and flags negative balances', async () => {
    const base = f.forecast();
    const projection = base.projection!.map((p, i) => (i === 1 ? { ...p, endAvailable: -50 } : p));
    setup(
      f.forecast({
        projection,
        firstShortfall: { year: 2026, month: 5 },
        rules: [base.rules[1]], // no expenses to try without
      })
    );
    const view = await panel();
    expect(await view.findByRole('alert')).toHaveTextContent(/te quedarías sin saldo en/);
    expect(view.getByText(/-50/).closest('td')).toHaveClass('forecast-negative');
    expect(view.queryByRole('group', whatIf)).toBeNull();
  });

  it('shows there is nothing left when the month is already over budget', async () => {
    setup(
      f.forecast({
        endOfMonth: f.endOfMonth({
          available: -30,
          projectedEnd: -80,
          maxDaily: 0,
          status: 'short',
        }),
      })
    );
    const view = await panel();
    expect(await view.findByText(tr('app.forecast.noneLeft'))).toBeInTheDocument();
    expect(view.getByText(tr('app.forecast.eom.status.short'))).toBeInTheDocument();
  });

  it('opens the guide of how to invest from «Qué hacer con lo que sobre»', async () => {
    setup();
    const view = await panel();
    fireEvent.click(
      await view.findByRole('button', { name: tr('app.forecast.eom.surplus.invest') })
    );
    await waitFor(() => expect(localStorage.getItem('mm_last_tab')).toBe('invest'));
    expect(screen.queryByRole('button', titleButton)).toBeNull();
  });

  const nextMonthOnly = () => {
    const full = f.forecast();
    return f.forecast({ locked: true, projection: full.projection.slice(0, 1) });
  };

  it('shows the free plan next month only and opens the plans for the rest', async () => {
    setup(nextMonthOnly(), { plan: true });
    const view = await panel();
    expect(await view.findByText(has('app.forecast.locked'))).toBeInTheDocument();
    expect(view.getByText(tr('app.forecast.nextMonth'))).toBeInTheDocument();
    expect(outlookOf(view).getAllByRole('row')).toHaveLength(2); // header + next month
    expect(view.queryByLabelText(tr('app.forecast.range'))).toBeNull();
    expect(view.queryByRole('group', whatIf)).toBeNull(); // no «what if…» on the free plan
    fireEvent.click(view.getByRole('button', { name: tr('billing.seePlans') }));
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.forecast') })
      )
    ).toBeInTheDocument();
  });

  it('shows the locked part without a plan button when the plan is unknown', async () => {
    setup(nextMonthOnly());
    const view = await panel();
    expect(await view.findByText(has('app.forecast.locked'))).toBeInTheDocument();
    expect(view.queryByRole('button', { name: tr('billing.seePlans') })).toBeNull();
  });

  it('reports a failed request', async () => {
    const api = createFakeApi();
    api.insightsApi.forecast.mockRejectedValue(new Error('sin conexión'));
    api.monthApi.get.mockResolvedValue(f.overview({ transactions: HISTORY }));
    renderWithProviders(<Dashboard />, { api });
    const view = await panel();
    expect(await view.findByText('sin conexión')).toBeInTheDocument();
  });

  it('waits for a few days of movements, and says nothing on an empty month', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(
      f.overview({ transactions: [f.transaction({ date: '2026-03-14' })] })
    );
    renderWithProviders(<Dashboard />, { api });
    expect(await screen.findByText(tr('app.forecast.notYet'))).toBeInTheDocument();
    expect(screen.queryByRole('button', titleButton)).toBeNull();
  });

  it('shows up with five movements of the account, however recent', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(
      f.overview({ transactions: [f.transaction({ date: '2026-03-14' })] })
    );
    renderWithProviders(<Dashboard />, { api, plan: true });
    expect(await screen.findByRole('button', titleButton)).toBeInTheDocument();
    expect(screen.queryByText(tr('app.forecast.notYet'))).toBeNull();
  });

  it('only appears for the current month', async () => {
    setup();
    await panel();
    const prev = screen.getByRole('button', { name: new RegExp(tr('app.nav.prev')) });
    await waitFor(() => expect(prev).toBeEnabled());
    fireEvent.click(prev);
    await waitFor(() => expect(screen.queryByRole('button', titleButton)).toBeNull());
  });
});
