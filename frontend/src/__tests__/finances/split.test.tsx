import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SplitView } from '@modules/finances/ui/views/SplitView';
import type { SplitGroup } from '@modules/finances/domain/types';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';

const group = (over: Partial<SplitGroup> = {}): SplitGroup => ({
  id: 'g1',
  name: 'Piso',
  members: [
    { id: 'a', name: 'Ana', balance: 60 },
    { id: 'b', name: 'Ben', balance: -30 },
    { id: 'c', name: 'Cai', balance: -30 },
  ],
  expenses: [
    {
      id: 'e1',
      description: 'Cena',
      amount: 90,
      paidBy: 'a',
      date: '2026-03-10',
      settlement: false,
      shares: [],
    },
    {
      id: 'e2',
      description: 'Pago',
      amount: 10,
      paidBy: 'b',
      date: '2026-03-11',
      settlement: true,
      shares: [{ memberId: 'a', share: 10 }],
    },
  ],
  transfers: [{ from: 'b', to: 'a', amount: 30 }],
  ...over,
});

function setup(summary = [{ id: 'g1', name: 'Piso', members: 3, expenses: 1 }], loaded = group()) {
  const api = createFakeApi();
  api.splitApi.list.mockResolvedValue(summary);
  api.splitApi.get.mockResolvedValue(loaded);
  // The API answers every change with the updated group.
  api.splitApi.addExpense.mockResolvedValue(loaded);
  api.splitApi.settle.mockResolvedValue(loaded);
  api.splitApi.removeExpense.mockResolvedValue(loaded);
  renderWithProviders(<SplitView />, { api });
  return api;
}

const openGroup = async () => fireEvent.click(await screen.findByRole('button', { name: /Piso/ }));

describe('SplitView', () => {
  it('starts empty and creates a group, opening it', async () => {
    const api = setup([]);
    expect(await screen.findByText(tr('app.split.empty'))).toBeInTheDocument();
    const create = screen.getByRole('button', { name: tr('app.split.create') });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.groupName') }), {
      target: { value: ' Piso ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.people') }), {
      target: { value: 'Yo' },
    });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.people') }), {
      target: { value: 'Yo, Ana , ,Luis' },
    });
    fireEvent.click(create);
    await waitFor(() =>
      expect(api.splitApi.create).toHaveBeenCalledWith('Piso', ['Yo', 'Ana', 'Luis'])
    );
    expect(
      await screen.findByRole('button', { name: new RegExp(tr('app.split.back')) })
    ).toBeInTheDocument();
  });

  it('shows the balances, who pays whom and the expenses of a group', async () => {
    setup();
    await openGroup();
    expect(await screen.findByText(tr('app.split.settleUp'))).toBeInTheDocument();
    expect(screen.getByText(/Ben paga .*30,00.* a Ana/)).toBeInTheDocument();
    expect(screen.getByText('Cena')).toBeInTheDocument();
    expect(screen.getByText(tr('app.split.payment'))).toBeInTheDocument();
    expect(screen.getByText(/Ben → Ana/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(tr('app.split.back')) }));
    expect(
      await screen.findByText(tr('app.split.summary', { members: 3, expenses: 1 }))
    ).toBeInTheDocument();
  });

  it('adds an expense paid by someone, shared by some of them', async () => {
    const api = setup();
    await openGroup();
    const add = await screen.findByRole('button', { name: tr('app.split.add') });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.what') }), {
      target: { value: 'Taxi' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.amount') }), {
      target: { value: '12,50' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.split.paidBy') }), {
      target: { value: 'b' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cai' }));
    fireEvent.click(add);
    await waitFor(() =>
      expect(api.splitApi.addExpense).toHaveBeenCalledWith('g1', {
        description: 'Taxi',
        amount: 12.5,
        paidBy: 'b',
        participants: ['a', 'b'],
      })
    );
    // Cai is back in the next expense.
    expect(screen.getByRole('checkbox', { name: 'Cai' })).toBeChecked();
    // Nobody left to share it: not allowed. And the person can come back.
    for (const name of ['Ana', 'Ben', 'Cai'])
      fireEvent.click(screen.getByRole('checkbox', { name }));
    expect(screen.getByRole('button', { name: tr('app.split.add') })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
  });

  it('records a suggested payment and removes an expense', async () => {
    const api = setup();
    api.splitApi.settle.mockResolvedValue(group({ transfers: [] }));
    await openGroup();
    fireEvent.click(await screen.findByRole('button', { name: tr('app.split.registerPayment') }));
    await waitFor(() =>
      expect(api.splitApi.settle).toHaveBeenCalledWith('g1', { from: 'b', to: 'a', amount: 30 })
    );
    expect(await screen.findByText(new RegExp(tr('app.split.allSettled')))).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.split.removeExpense', { name: 'Cena' }) })
    );
    await waitFor(() => expect(api.splitApi.removeExpense).toHaveBeenCalledWith('g1', 'e1'));
  });

  it('deletes a group after confirming, and shows errors', async () => {
    const api = setup();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    await openGroup();
    const remove = await screen.findByRole('button', { name: new RegExp(tr('app.split.delete')) });
    fireEvent.click(remove);
    expect(api.splitApi.remove).not.toHaveBeenCalled();
    api.splitApi.addExpense.mockRejectedValueOnce(new Error('Máximo 500 gastos por grupo'));
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.what') }), {
      target: { value: 'x' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.amount') }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.split.add') }));
    expect(await screen.findByText('Máximo 500 gastos por grupo')).toBeInTheDocument();
    fireEvent.click(remove);
    await waitFor(() => expect(api.splitApi.remove).toHaveBeenCalledWith('g1'));
    expect(
      await screen.findByRole('heading', { name: new RegExp(tr('app.split.title')) })
    ).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('shows nothing to settle for a group without expenses', async () => {
    setup(
      undefined,
      group({
        expenses: [],
        transfers: [],
        members: [
          { id: 'a', name: 'Ana', balance: 0 },
          { id: 'b', name: 'Ben', balance: 0 },
        ],
      })
    );
    await openGroup();
    const heading = await screen.findByRole('heading', {
      name: new RegExp(tr('app.split.expenses')),
    });
    expect(screen.queryByText(new RegExp(tr('app.split.allSettled')))).toBeNull();
    expect(within(heading.closest('.card')!).queryByRole('list')).toBeNull();
  });

  it('reports a group that cannot be created', async () => {
    const api = setup([]);
    api.splitApi.create.mockRejectedValueOnce(new Error('Máximo 20 grupos'));
    fireEvent.change(await screen.findByRole('textbox', { name: tr('app.split.groupName') }), {
      target: { value: 'g' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.split.people') }), {
      target: { value: 'a, b' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.split.create') }));
    expect(await screen.findByText('Máximo 20 grupos')).toBeInTheDocument();
  });
});
