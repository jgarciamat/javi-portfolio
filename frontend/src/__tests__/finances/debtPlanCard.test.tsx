import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AssetsView } from '@modules/finances/ui/views/AssetsView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const card = async () =>
  within((await screen.findByText(tr('app.debt.title'))).closest('.card') as HTMLElement);

const setup = (assets = [f.asset({ id: 'd1', name: 'Tarjeta', kind: 'debt', value: 3000 })]) => {
  const api = createFakeApi();
  api.assetApi.getAll.mockResolvedValue(assets);
  renderWithProviders(<AssetsView />, { api });
  return api;
};

describe('Debt payoff plan', () => {
  it('only appears when there are debts to pay', async () => {
    setup([f.asset({ name: 'Fondo' }), f.asset({ kind: 'debt', value: 0, name: 'Pagada' })]);
    await screen.findByText('Fondo');
    expect(screen.queryByText(tr('app.debt.title'))).toBeNull();
  });

  it('estimates the minimum and says when and in what order the debts are paid', async () => {
    setup([
      f.asset({
        id: 'd1',
        name: 'Tarjeta',
        kind: 'debt',
        value: 3000,
        interestRate: 20,
        minPayment: 100,
      }),
      f.asset({ id: 'd2', name: 'Móvil', kind: 'debt', value: 300 }),
    ]);
    const view = await card();
    expect(view.getByText(/Libre de deudas en/)).toBeInTheDocument();
    expect(view.getByText(/Intereses totales/)).toBeInTheDocument();
    const order = view
      .getAllByRole('listitem')
      .filter((li) => /saldada en/.test(li.textContent ?? ''));
    expect(order).toHaveLength(2);
    // «febrero de 2028», in lower case as in Metas, not «Febrero 2028».
    expect(order[0].textContent).toMatch(/saldada en [a-z]+ de \d{4}/);
    expect(
      view.getByPlaceholderText(tr('app.debt.minEstimated', { amount: 10 }))
    ).toBeInTheDocument();
  });

  it('shows what extra money and the method change', async () => {
    setup([
      f.asset({
        id: 'd1',
        name: 'Tarjeta',
        kind: 'debt',
        value: 3000,
        interestRate: 20,
        minPayment: 100,
      }),
    ]);
    const view = await card();
    expect(view.queryByText(/ahorras/)).toBeNull();
    fireEvent.change(view.getByLabelText(tr('app.debt.extra')), { target: { value: '150' } });
    expect(view.getByText(/Con este plan ahorras/)).toBeInTheDocument();
    fireEvent.change(view.getByLabelText(tr('app.debt.method')), { target: { value: 'snowball' } });
    expect(view.getByText(/Libre de deudas/)).toBeInTheDocument();
    fireEvent.change(view.getByLabelText(tr('app.debt.extra')), { target: { value: 'abc' } });
    expect(view.queryByText(/ahorras/)).toBeNull();
  });

  it('warns when the payments never cover the interest', async () => {
    setup([
      f.asset({
        id: 'd1',
        name: 'Tarjeta',
        kind: 'debt',
        value: 10000,
        interestRate: 24,
        minPayment: 50,
      }),
    ]);
    const view = await card();
    expect(view.getByText(tr('app.debt.never'))).toBeInTheDocument();
  });

  it('shows years and months for long plans and only months for short ones', async () => {
    setup([
      f.asset({
        id: 'd1',
        name: 'Coche',
        kind: 'debt',
        value: 10000,
        interestRate: 5,
        minPayment: 200,
      }),
    ]);
    const view = await card();
    expect(view.getByText(/años y .* meses/)).toBeInTheDocument();
    fireEvent.change(view.getByLabelText(tr('app.debt.extra')), { target: { value: '3000' } });
    expect(view.getByText(/Libre de deudas en \d+ meses/)).toBeInTheDocument();
  });

  it('saves the interest and the minimum payment of a debt', async () => {
    const api = setup();
    const view = await card();
    const save = view.getByRole('button', { name: tr('app.debt.saveOf', { name: 'Tarjeta' }) });
    fireEvent.change(view.getByLabelText(tr('app.debt.rateOf', { name: 'Tarjeta' })), {
      target: { value: '18,5' },
    });
    fireEvent.change(view.getByLabelText(tr('app.debt.minOf', { name: 'Tarjeta' })), {
      target: { value: '90' },
    });
    fireEvent.click(save);
    await waitFor(() =>
      expect(api.assetApi.setTerms).toHaveBeenCalledWith('d1', {
        interestRate: 18.5,
        minPayment: 90,
      })
    );
  });

  it('can clear the terms, refuses nonsense and shows errors', async () => {
    const api = setup([
      f.asset({
        id: 'd1',
        name: 'Tarjeta',
        kind: 'debt',
        value: 3000,
        interestRate: 18,
        minPayment: 90,
      }),
    ]);
    const view = await card();
    const save = view.getByRole('button', { name: tr('app.debt.saveOf', { name: 'Tarjeta' }) });
    const rate = view.getByLabelText(tr('app.debt.rateOf', { name: 'Tarjeta' }));
    const min = view.getByLabelText(tr('app.debt.minOf', { name: 'Tarjeta' }));
    fireEvent.change(rate, { target: { value: '150' } });
    expect(save).toBeDisabled();
    fireEvent.change(rate, { target: { value: '' } });
    fireEvent.change(min, { target: { value: 'abc' } });
    expect(save).toBeDisabled();
    fireEvent.change(min, { target: { value: '' } });
    api.assetApi.setTerms.mockRejectedValueOnce(new Error('Solo las deudas tienen condiciones'));
    fireEvent.click(save);
    expect(await view.findByText('Solo las deudas tienen condiciones')).toBeInTheDocument();
    expect(api.assetApi.setTerms).toHaveBeenCalledWith('d1', {
      interestRate: null,
      minPayment: null,
    });
  });

  it('sends the terms of a new debt and leaves them out for other kinds', async () => {
    const api = setup([]);
    fireEvent.change(await screen.findByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: 'Préstamo' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.value') }), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.assets.kind') }), {
      target: { value: 'debt' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.rate') }), {
      target: { value: '7,5' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.minPayment') }), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    await waitFor(() =>
      expect(api.assetApi.create).toHaveBeenCalledWith({
        name: 'Préstamo',
        kind: 'debt',
        value: 5000,
        interestRate: 7.5,
        minPayment: 120,
      })
    );
    expect(screen.getByRole('textbox', { name: tr('app.assets.rate') })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: 'Otra' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.value') }), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    await waitFor(() =>
      expect(api.assetApi.create).toHaveBeenLastCalledWith({
        name: 'Otra',
        kind: 'debt',
        value: 10,
      })
    );
  });
});
