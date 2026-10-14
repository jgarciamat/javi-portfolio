import { screen, waitFor } from '@testing-library/react';
import { TodayCard } from '@modules/finances/ui/components/TodayCard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const setup = (safe: Parameters<typeof f.forecast>[0], spent: number[] = []) => {
  const api = createFakeApi();
  api.insightsApi.forecast.mockResolvedValue(f.forecast(safe));
  api.monthApi.get.mockResolvedValue(
    f.overview({
      transactions: spent.map((amount) =>
        f.transaction({ amount, date: '2026-03-15', type: 'EXPENSE' })
      ),
    })
  );
  renderWithProviders(<TodayCard />, { api });
  return api;
};

describe('Today card', () => {
  it('shows what can still be spent today and what has been spent', async () => {
    setup({}, [10, 5]);
    expect(await screen.findByText(/50/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '23');
    await waitFor(() =>
      expect(screen.getByText(/Llevas .*15.* gastados hoy de .*65/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Te quedan .*900.* para 18 días/)).toBeInTheDocument();
  });

  it('only counts expenses of today', async () => {
    const api = createFakeApi();
    api.insightsApi.forecast.mockResolvedValue(f.forecast());
    api.monthApi.get.mockResolvedValue(
      f.overview({
        transactions: [
          f.transaction({ amount: 20, date: '2026-03-14', type: 'EXPENSE' }),
          f.transaction({ amount: 30, date: '2026-03-15', type: 'INCOME' }),
        ],
      })
    );
    renderWithProviders(<TodayCard />, { api });
    expect(await screen.findByText(/Llevas .*0.* gastados hoy de .*50/)).toBeInTheDocument();
  });

  it('says not to spend when the month is already over', async () => {
    setup({
      safeToSpend: { available: -20, daysLeft: 5, daily: -4, projectedEnd: -80, status: 'over' },
    });
    expect(await screen.findByText(tr('app.today.none'))).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows nothing until the forecast arrives', () => {
    const api = createFakeApi();
    api.insightsApi.forecast.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<TodayCard />, { api });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
