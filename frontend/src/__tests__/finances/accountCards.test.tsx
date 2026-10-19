import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MonthlyView } from '@modules/finances/ui/components/MonthlyView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { mockMatchMedia } from '@test-utils/dom';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const main = f.account({ id: 'a1', name: 'Principal', balance: 1500, isDefault: true });
const savings = f.account({ id: 'a2', name: 'Ahorro', balance: -20, icon: '🐷', color: '' });

function setup(accounts = [main, savings]) {
  const api = createFakeApi();
  api.accountApi.getAll.mockResolvedValue({ accounts, total: 0 });
  api.monthApi.get.mockResolvedValue(
    f.overview({
      transactions: [
        f.transaction({ id: 't1', description: 'Cena', accountId: 'a1', accountName: 'Principal' }),
        f.transaction({ id: 't2', description: 'Cuota', accountId: 'a2', accountName: 'Ahorro' }),
      ],
    })
  );
  const onOpenTab = jest.fn();
  renderWithProviders(
    <MonthlyView
      onEditTransaction={jest.fn()}
      onManageCategories={jest.fn()}
      onManageBudgets={jest.fn()}
      onOpenTab={onOpenTab}
    />,
    { api }
  );
  return { api, onOpenTab };
}

describe('Month view with several accounts', () => {
  it('shows no account cards with a single account', async () => {
    setup([main]);
    await screen.findByText('Cena');
    expect(screen.queryByRole('region', { name: tr('app.accountCards.ariaLabel') })).toBeNull();
    expect(
      screen.queryByRole('columnheader', { name: tr('app.transaction.table.account') })
    ).toBeNull();
  });

  it('shows one card per account with its balance and names the account in each movement', async () => {
    setup();
    const cards = await screen.findByRole('region', { name: tr('app.accountCards.ariaLabel') });
    expect(within(cards).getByText(/Principal/)).toBeInTheDocument();
    expect(within(cards).getByText(/Ahorro/)).toBeInTheDocument();
    expect(within(cards).getAllByRole('button', { pressed: false })).toHaveLength(2);
    expect(
      await screen.findByRole('columnheader', { name: tr('app.transaction.table.account') })
    ).toBeInTheDocument();
    const row = screen.getByText('Cuota').closest('tr') as HTMLElement;
    expect(within(row).getByText('Ahorro')).toBeInTheDocument();
  });

  it('lists only the movements of the chosen account until it is cleared', async () => {
    setup();
    const cards = await screen.findByRole('region', { name: tr('app.accountCards.ariaLabel') });
    await screen.findByText('Cuota');
    fireEvent.click(within(cards).getByRole('button', { name: /Ahorro/, pressed: false }));
    expect(screen.queryByText('Cena')).toBeNull();
    expect(screen.getByText('Cuota')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ahorro');
    fireEvent.click(screen.getByRole('button', { name: tr('app.accountCards.clear') }));
    expect(screen.getByText('Cena')).toBeInTheDocument();
    // Choosing the same account twice also clears the filter.
    fireEvent.click(within(cards).getByRole('button', { name: /Ahorro/, pressed: false }));
    fireEvent.click(within(cards).getByRole('button', { name: /Ahorro/, pressed: true }));
    expect(screen.getByText('Cena')).toBeInTheDocument();
  });

  it('opens the new movement with the account of the card and sends the transfer to Accounts', async () => {
    const { onOpenTab } = setup();
    const cards = await screen.findByRole('region', { name: tr('app.accountCards.ariaLabel') });
    fireEvent.click(
      within(cards).getByRole('button', { name: `${tr('app.accountCards.add')}: Ahorro` })
    );
    const select = await screen.findByRole('combobox', {
      name: tr('app.transaction.form.account'),
    });
    await waitFor(() => expect(select).toHaveValue('a2'));
    fireEvent.click(
      within(cards).getByRole('button', { name: `${tr('app.accountCards.transfer')}: Principal` })
    );
    expect(onOpenTab).toHaveBeenCalledWith('accounts');
  });

  it('names the account in each card on small screens, and leaves it out when it is unknown', async () => {
    const restore = mockMatchMedia(true);
    const api = createFakeApi();
    api.accountApi.getAll.mockResolvedValue({ accounts: [main, savings], total: 0 });
    api.monthApi.get.mockResolvedValue(
      f.overview({
        transactions: [
          f.transaction({ id: 't1', description: 'Cena', accountName: 'Ahorro' }),
          f.transaction({ id: 't2', description: 'Cuota', accountName: undefined }),
        ],
      })
    );
    renderWithProviders(
      <MonthlyView
        onEditTransaction={jest.fn()}
        onManageCategories={jest.fn()}
        onManageBudgets={jest.fn()}
        onOpenTab={jest.fn()}
      />,
      { api }
    );
    await screen.findByText('Cena');
    const meta = Array.from(document.querySelectorAll('.tx-card-meta')).map((n) => n.textContent);
    expect(meta.some((text) => text?.endsWith(' · Ahorro'))).toBe(true);
    expect(meta.some((text) => text?.includes('Ahorro') === false)).toBe(true);
    restore();
  });
});
