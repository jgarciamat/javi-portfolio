import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RentaView } from '@modules/finances/ui/views/RentaView';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@modules/tools/ui/renta/RentaWizard', () =>
  jest.requireActual('@test-utils/expertScreens').rentaWithForm()
);

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
      await screen.findByText(/en 2025 entraron .*25\.?000.* y salieron .*1\.?500.*/)
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

  it('offers the years with rules up to the running one, the newest first', async () => {
    renderWithProviders(<RentaView />);
    const years = within(await screen.findByLabelText(tr('app.renta.year'))).getAllByRole('option');
    expect(years.map((o) => o.textContent)).toEqual(['2026', '2025', '2024']);
  });

  it('wipes everything that was entered once the user confirms', async () => {
    renderWithProviders(<RentaView />);
    const gross = await screen.findByLabelText(tr('tools.renta.gross'));
    fireEvent.change(gross, { target: { value: '30000' } });
    expect(gross).toHaveValue('30000');
    const open = () =>
      fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.newReturn.button') }));
    open();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.newReturn.cancel') }));
    expect(gross).toHaveValue('30000');
    open();
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.newReturn.confirm') }));
    expect(screen.getByLabelText(tr('tools.renta.gross'))).toHaveValue('');
  });

  it('shows the year in the accounts as a reference note that a new return keeps', async () => {
    const api = createFakeApi();
    api.transactionApi.getAnnual.mockResolvedValue({ year: 2025, months: { 1: month(900, 300) } });
    renderWithProviders(<RentaView />, { api });
    const note = await screen.findByRole('complementary', { name: tr('app.renta.figuresLabel') });
    expect(note).toHaveClass('renta-reference-note');
    await within(note).findByText(/en 2025 entraron .*900.* y salieron .*300.*/);
    // A note, not a field of the return.
    expect(within(note).queryByRole('textbox')).toBeNull();
    fireEvent.change(screen.getByLabelText(tr('tools.renta.gross')), {
      target: { value: '30000' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.newReturn.button') }));
    fireEvent.click(screen.getByRole('button', { name: tr('tools.renta.newReturn.confirm') }));
    expect(
      within(screen.getByRole('complementary', { name: tr('app.renta.figuresLabel') })).getByText(
        /entraron .*900/
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText(tr('tools.renta.gross'))).not.toHaveValue('30000');
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

  it('puts what to gather above the assistant, so it is seen before starting', async () => {
    renderWithProviders(<RentaView />);
    const step = await screen.findByText(tr('tools.renta.step1'));
    const gather = screen.getByRole('heading', { name: tr('app.renta.checklist') });
    expect(gather.compareDocumentPosition(step) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: tr('app.renta.title') }).compareDocumentPosition(gather) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('Renta section, step by step', () => {
  it('opens the self-employed screen to bring the activity', () => {
    localStorage.removeItem('mm_renta_assistant');
    localStorage.setItem(
      'mm_renta_wizard_2025',
      JSON.stringify({
        at: 5,
        screen: 0,
        done: ['you', 'family', 'work', 'home', 'invest'],
        answers: {},
        streak: 1,
        lastDay: '2026-03-14',
      })
    );
    const onOpenTab = jest.fn();
    renderWithProviders(<RentaView onOpenTab={onOpenTab} />);
    fireEvent.click(screen.getByRole('radio', { name: tr('wizard.renta.opt.activity.yes') }));
    fireEvent.click(
      screen.getByRole('button', { name: tr('tools.renta.bring.button', { year: 2025 }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('wizard.renta.openAutonomo') }));
    expect(onOpenTab).toHaveBeenCalledWith('business');
  });
});
