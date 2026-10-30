import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import type { ClosedTrade, SimPortfolio } from '@modules/crypto/domain/types';
import { CryptoConsoleView } from '@modules/crypto/ui/CryptoConsoleView';
import * as fx from '@test-utils/crypto';
import { account } from '@test-utils/fixtures';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';

// Every price, amount, account and operation here is made up.
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');

const closed = (id: string, pnl: number, extra: Partial<ClosedTrade> = {}): ClosedTrade => ({
  id,
  symbol: 'ETH',
  slot: 1,
  direction: 'long',
  quantity: 0.5,
  entryPrice: 2_000,
  exitPrice: 2_000 + pnl * 2,
  invested: 1_000,
  fees: 2,
  proceeds: 1_000 + pnl,
  pnl,
  pnlPercent: pnl / 10,
  openType: 'market',
  closeType: 'limit',
  openedAt: '2026-03-10T12:00:00.000Z',
  closedAt: '2026-03-11T12:00:00.000Z',
  recorded: false,
  transfer: null,
  ...extra,
});

const practice = (trades: ClosedTrade[]): SimPortfolio =>
  fx.portfolio({
    portfolio: fx.PRACTICE_REF,
    portfolios: [fx.SEASON_REF, fx.PRACTICE_REF],
    closed: trades,
  });

const WALLET = account({ id: 'acc-crypto', name: 'Exchange', type: 'crypto', icon: '🪙' });
const ARCHIVED = account({ id: 'acc-old', name: 'Vieja', type: 'crypto', archived: true });
const MAIN = account({ id: 'acc-main', name: 'Principal', isDefault: true });

function setup(portfolio: SimPortfolio, change?: (api: FakeApi) => void) {
  const api = createFakeApi();
  api.cryptoApi.portfolio.mockResolvedValue(portfolio);
  api.accountApi.getAll.mockResolvedValue({ accounts: [MAIN, WALLET, ARCHIVED], total: 2_000 });
  change?.(api);
  renderWithProviders(<CryptoConsoleView />, { api });
  return api;
}

const closedPanel = async (count: number) =>
  (await screen.findByRole('heading', { name: `Cerradas (${count})` })).closest('section')!;
const addButtons = (panel: HTMLElement) =>
  within(panel).queryAllByRole('button', { name: /^Añadir a una cuenta/ });
const dialog = () => screen.getByRole('dialog', { name: '¿Añadir este resultado a una cuenta?' });

describe('Crypto console: a practice result added to an account', () => {
  it('asks first, says it is practice money and adds it to the crypto account chosen', async () => {
    const gain = closed('c1', 97.9);
    const added = closed('c2', -20, {
      slot: null,
      transfer: { accountId: 'acc-crypto', accountName: 'Exchange', amount: -20, at: '' },
    });
    const even = closed('c3', 0, { slot: 2 });
    const api = setup(practice([gain, added, even]), (a) =>
      a.cryptoApi.addToAccount.mockResolvedValue(
        practice([
          {
            ...gain,
            transfer: { accountId: 'acc-crypto', accountName: 'Exchange', amount: 97.9, at: '' },
          },
          added,
          even,
        ])
      )
    );
    const panel = await closedPanel(3);
    expect(
      within(panel).getByText(/Puedes añadir el resultado de cada operación de práctica/)
    ).toBeInTheDocument();
    expect(nb(within(panel).getByText(/Añadido a Exchange/).textContent)).toBe(
      '✓ Añadido a Exchange: −20,00 €'
    );
    // The one with a result and not added yet: nothing gained or lost has nothing to add.
    const buttons = addButtons(panel);
    expect(buttons).toHaveLength(1);
    expect(nb(buttons[0].textContent)).toBe('Añadir a una cuenta ETH #1 +97,90 €');

    fireEvent.click(buttons[0]);
    expect(nb(within(dialog()).getByText(/Se apuntará/).textContent)).toBe(
      'Se apuntará un ingreso de 97,90 € (ETH #1) en la cuenta que elijas, y subirá el saldo total de tus cuentas.'
    );
    expect(within(dialog()).getByText(/es dinero de práctica del simulador/)).toBeInTheDocument();
    // Only the active accounts of type Criptomonedas.
    const choices = within(within(dialog()).getByRole('group', { name: 'Elige la cuenta' }))
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(choices).toEqual(['Añadir a 🪙 Exchange']);

    const reads = api.accountApi.getAll.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a 🪙 Exchange' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.cryptoApi.addToAccount).toHaveBeenCalledWith('c1', 'acc-crypto');
    // The balances and the month are read again (the total of the accounts changes).
    await waitFor(() => expect(api.accountApi.getAll.mock.calls.length).toBeGreaterThan(reads));
    expect(nb(within(panel).getByText(/Añadido a Exchange: \+/).textContent)).toBe(
      '✓ Añadido a Exchange: +97,90 €'
    );
    expect(addButtons(panel)).toHaveLength(0);
  });

  it('words a loss as an expense, and shows why it was refused inside the dialog', async () => {
    const api = setup(practice([closed('c1', -101.9, { slot: null })]), (a) =>
      a.cryptoApi.addToAccount.mockRejectedValue(
        new ApiError(
          'Esta operación ya se añadió a la cuenta «Exchange»',
          409,
          'CRYPTO_ALREADY_TRANSFERRED'
        )
      )
    );
    const panel = await closedPanel(1);
    fireEvent.click(addButtons(panel)[0]);
    expect(nb(within(dialog()).getByText(/Se apuntará/).textContent)).toBe(
      'Se apuntará un gasto de 101,90 € (ETH) en la cuenta que elijas, y bajará el saldo total de tus cuentas.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Añadir a 🪙 Exchange' }));
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'Esta operación ya se añadió a la cuenta «Exchange»'
    );
    expect(api.cryptoApi.addToAccount).toHaveBeenCalledTimes(1);

    // Closing and opening again starts without the old error.
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(addButtons(panel)[0]);
    expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('without a crypto account, offers to create one there (or in Cuentas)', async () => {
    const api = setup(practice([closed('c1', 50)]), (a) => {
      a.accountApi.getAll.mockResolvedValue({ accounts: [MAIN, ARCHIVED], total: 1_000 });
      a.accountApi.create.mockImplementation(async () => {
        a.accountApi.getAll.mockResolvedValue({
          accounts: [
            MAIN,
            account({ id: 'acc-new', name: 'Criptomonedas', type: 'crypto', icon: '🪙' }),
          ],
          total: 1_000,
        });
        return [];
      });
    });
    const panel = await closedPanel(1);
    fireEvent.click(addButtons(panel)[0]);
    expect(
      within(dialog()).getByText('Aún no tienes ninguna cuenta de tipo Criptomonedas.')
    ).toBeInTheDocument();
    expect(within(dialog()).getByText(/También puedes crearla en Cuentas/)).toBeInTheDocument();

    fireEvent.click(
      within(dialog()).getByRole('button', { name: 'Crear una cuenta Criptomonedas' })
    );
    expect(
      await within(dialog()).findByRole('button', { name: 'Añadir a 🪙 Criptomonedas' })
    ).toBeInTheDocument();
    expect(api.accountApi.create).toHaveBeenCalledWith({
      name: 'Criptomonedas',
      type: 'crypto',
      icon: '🪙',
    });
  });

  it('never offers it on the official portfolio of the month', async () => {
    setup(fx.portfolio({ closed: [closed('c1', 97.9)] }));
    const panel = await closedPanel(1);
    expect(addButtons(panel)).toHaveLength(0);
    expect(
      within(panel).queryByText(/Puedes añadir el resultado de cada operación de práctica/)
    ).not.toBeInTheDocument();
  });
});
