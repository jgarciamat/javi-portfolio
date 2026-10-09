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

function setup(forecast = f.forecast(), options: { plan?: boolean } = {}) {
  const api = createFakeApi();
  api.insightsApi.forecast.mockResolvedValue(forecast);
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

describe('Forecast panel', () => {
  it('says what can be spent per day and shows the coming months (Premium)', async () => {
    const { api } = setup();
    const view = await panel();
    expect(await view.findByText(/al día para llegar a fin de mes/)).toBeInTheDocument();
    expect(view.getByText(/Te quedan .*900.* para 18 días/)).toBeInTheDocument();
    expect(view.getByText(/terminarías el mes con .*500/)).toBeInTheDocument();
    expect(view.getByText(tr('app.forecast.status.ok'))).toBeInTheDocument();
    expect(view.getByText(has('app.forecast.noShortfall'))).toBeInTheDocument();
    const rows = view.getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 projected months
    expect(within(rows[1]).getByText(/1\.?200/)).toBeInTheDocument();
    expect(api.insightsApi.forecast).toHaveBeenCalledWith(6, []);
  });

  it('asks again for another range and for scenarios without a recurring expense', async () => {
    const { api } = setup();
    const view = await panel();
    await view.findByRole('table');
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
        safeToSpend: {
          available: 100,
          daysLeft: 10,
          daily: 10,
          projectedEnd: -20,
          status: 'tight',
        },
      })
    );
    const view = await panel();
    expect(await view.findByRole('alert')).toHaveTextContent(/te quedarías sin saldo en/);
    expect(view.getByText(tr('app.forecast.status.tight'))).toBeInTheDocument();
    expect(view.getByText(/-50/).closest('td')).toHaveClass('forecast-negative');
    expect(view.queryByRole('group')).toBeNull();
  });

  it('shows there is nothing left when the month is already over budget', async () => {
    setup(
      f.forecast({
        safeToSpend: { available: -30, daysLeft: 5, daily: 0, projectedEnd: -80, status: 'over' },
      })
    );
    const view = await panel();
    expect(await view.findByText(tr('app.forecast.noneLeft'))).toBeInTheDocument();
    expect(view.getByText(tr('app.forecast.status.over'))).toBeInTheDocument();
  });

  it('keeps the outlook for Premium and opens the plans from the locked preview', async () => {
    setup(f.forecast({ locked: true, projection: null, rules: [] }), { plan: true });
    const view = await panel();
    expect(await view.findByText(has('app.forecast.locked'))).toBeInTheDocument();
    expect(view.queryByRole('table')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: tr('billing.seePlans') }));
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.forecast') })
      )
    ).toBeInTheDocument();
  });

  it('shows the locked preview without a plan button when the plan is unknown', async () => {
    setup(f.forecast({ locked: true, projection: null }));
    const view = await panel();
    expect(await view.findByText(has('app.forecast.locked'))).toBeInTheDocument();
    expect(view.queryByRole('button', { name: tr('billing.seePlans') })).toBeNull();
  });

  it('reports a failed request', async () => {
    const api = createFakeApi();
    api.insightsApi.forecast.mockRejectedValue(new Error('sin conexión'));
    renderWithProviders(<Dashboard />, { api });
    const view = await panel();
    expect(await view.findByText('sin conexión')).toBeInTheDocument();
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
