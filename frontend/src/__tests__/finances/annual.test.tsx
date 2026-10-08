import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AnnualChart } from '@modules/finances/ui/components/AnnualChart';
import { createFakeApi } from '@test-utils/fakeApi';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads } from '@test-utils/dom';

const year2026 = {
  year: 2026,
  months: {
    1: { income: 2000, expenses: 500, saving: 100, balance: 1400 },
    2: { income: 0, expenses: 300, saving: 0, balance: -300 },
  },
};

function setup(onMonthClick?: (y: number, m: number) => void, initialYear = 2026) {
  const api = createFakeApi();
  api.transactionApi.getAnnual.mockResolvedValue(year2026);
  return renderWithProviders(
    <AnnualChart initialYear={initialYear} onMonthClick={onMonthClick} />,
    {
      api,
    }
  );
}

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('AnnualChart', () => {
  it('shows bars, totals and the month table', async () => {
    setup();
    expect(await screen.findByText(tr('app.annual.annualBalance'))).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Ene 2026/ })).toHaveLength(3);
    expect(screen.getByRole('table')).toHaveTextContent('—');
    // Without a click handler months are plain text.
    expect(screen.queryByRole('button', { name: 'Ene' })).toBeNull();
  });

  it('shows a tooltip over the bars', async () => {
    setup();
    const bar = (await screen.findAllByRole('img', { name: /Ene 2026/ }))[0];
    fireEvent.mouseEnter(bar, { clientX: 10, clientY: 20 });
    expect(screen.getByText(/Ingresos: 2000\s€/)).toBeInTheDocument();
    fireEvent.mouseMove(bar, { clientX: 15, clientY: 25 });
    fireEvent.mouseLeave(bar);
    expect(screen.queryByText(/Ingresos: 2000\s€/)).toBeNull();
  });

  it('changes year within the limits and opens months', async () => {
    const onMonthClick = jest.fn();
    const { api } = setup(onMonthClick);
    fireEvent.click(await screen.findAllByRole('button', { name: 'Ene' }).then((b) => b[0]));
    expect(onMonthClick).toHaveBeenCalledWith(2026, 1);
    fireEvent.click(screen.getByRole('button', { name: '2027' }));
    await waitFor(() => expect(api.transactionApi.getAnnual).toHaveBeenLastCalledWith(2027));
    // 2028 is beyond the planning horizon.
    expect(screen.getByRole('button', { name: '2028' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '2026' }));
    await waitFor(() => expect(api.transactionApi.getAnnual).toHaveBeenLastCalledWith(2026));
  });

  it('cannot go before the first year and hides months beyond the horizon', async () => {
    const onMonthClick = jest.fn();
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockResolvedValue({
      year: 2027,
      months: { 6: { income: 1, expenses: 0, saving: 0, balance: 1 } },
    });
    renderWithProviders(<AnnualChart initialYear={2027} onMonthClick={onMonthClick} />, {
      api,
    });
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Jun' })).toBeNull();
    const first = createFakeApi();
    renderWithProviders(<AnnualChart initialYear={2000} />, { api: first });
    expect(screen.getByRole('button', { name: '1999' })).toBeDisabled();
  });

  it('exports the year as CSV', async () => {
    const downloads = captureDownloads();
    setup();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: tr('app.export.options') }));
    fireEvent.click(screen.getByRole('menuitem', { name: literal(tr('app.export.annual')) }));
    expect(downloads.names).toEqual(['money-manager_2026.csv']);
    const [csv] = await downloads.text();
    expect(csv).toContain('"Enero","2000","500","100","1400"');
    expect(csv).toContain(`"${tr('app.export.csv.total')}","2000","800","100","1100"`);
    downloads.restore();
  });

  it('shows loading errors', async () => {
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockRejectedValue(new Error('Fallo anual'));
    renderWithProviders(<AnnualChart initialYear={2026} />, { api });
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo anual');
  });
});
