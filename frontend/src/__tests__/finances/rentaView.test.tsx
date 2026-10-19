import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

// The full form: the expert mode (the guided questions have their own suite).
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mm_renta_view', 'expert');
  // Everything together, not the step-by-step assistant (it has its own suite).
  localStorage.setItem('mm_renta_assistant', 'expert');
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
    expect(screen.getByText(tr('tools.renta.obligation.overLimit'))).toBeInTheDocument();
  });

  it('changes the year and starts empty when nothing was recorded', async () => {
    const api = createFakeApi();
    renderWithProviders(<RentaView />, { api });
    expect(await screen.findByLabelText(tr('tools.renta.gross'))).toHaveValue('');
    fireEvent.change(screen.getByLabelText(tr('app.renta.year')), { target: { value: '2026' } });
    await waitFor(() => expect(api.transactionApi.getAnnual).toHaveBeenLastCalledWith(2026));
  });

  it('only offers the last return and the running year', async () => {
    renderWithProviders(<RentaView />);
    const years = within(await screen.findByLabelText(tr('app.renta.year'))).getAllByRole('option');
    expect(years.map((o) => o.textContent)).toEqual(['2026', '2025']);
  });

  it('wipes everything that was entered once the user confirms', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    renderWithProviders(<RentaView />);
    const gross = await screen.findByLabelText(tr('tools.renta.gross'));
    fireEvent.change(gross, { target: { value: '30000' } });
    expect(gross).toHaveValue('30000');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.wipe') }));
    expect(gross).toHaveValue('30000');
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.wipe') }));
    expect(confirm).toHaveBeenCalledWith(tr('tools.renta.wipeConfirm'));
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('');
  });

  it('does the calculation inside the app, without a link to the public page', async () => {
    renderWithProviders(<RentaView />);
    expect(await screen.findByText(tr('tools.renta.step1'))).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /pantalla completa/ })).toBeNull();
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
