import { fireEvent, screen, waitFor } from '@testing-library/react';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const month = (income: number, expenses: number) => ({
  income,
  expenses,
  saving: 0,
  balance: income - expenses,
});

describe('Renta section', () => {
  it('uses the income recorded in the previous year and fills in the checker', async () => {
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockResolvedValue({
      year: 2025,
      months: { 1: month(15000, 800), 2: month(10000, 700) },
    });
    renderWithProviders(<RentaView />, { api });
    expect(
      await screen.findByText(
        /En 2025 registraste .*25\.?000.* de ingresos y .*1\.?500.* de gastos/
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(api.transactionApi.getAnnual).toHaveBeenCalledWith(2025));
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('25000');
    expect(screen.getByText(tr('tools.renta.obligation.yes'))).toBeInTheDocument();
  });

  it('changes the year and starts empty when nothing was recorded', async () => {
    const api = createFakeApi();
    renderWithProviders(<RentaView />, { api });
    expect(await screen.findByLabelText(tr('tools.renta.gross'))).toHaveValue('');
    fireEvent.change(screen.getByLabelText(tr('app.renta.year')), { target: { value: '2024' } });
    await waitFor(() => expect(api.transactionApi.getAnnual).toHaveBeenLastCalledWith(2024));
  });

  it('links to the full-screen calculator', async () => {
    renderWithProviders(<RentaView />);
    expect(
      await screen.findByRole('link', { name: tr('app.renta.openCalculator') })
    ).toHaveAttribute('href', '/calculadora-renta');
  });

  it('lists what to gather and links to the Tax Agency', async () => {
    renderWithProviders(<RentaView />);
    for (const item of ['data', 'certificate', 'receipts', 'review']) {
      expect(await screen.findByText(tr(`app.renta.check.${item}`))).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: tr('app.renta.aeat') })).toHaveAttribute(
      'href',
      'https://sede.agenciatributaria.gob.es/'
    );
  });
});
