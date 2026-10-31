import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AssetsView } from '@modules/finances/ui/views/AssetsView';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import type { Asset } from '@modules/finances/domain/types';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

const main = f.account({ id: 'a-main', name: 'Principal', isDefault: true, balance: 2000 });
const crypto = f.account({ id: 'a-crypto', name: 'Cripto', type: 'crypto', icon: '₿' });
const old = f.account({ id: 'a-old', name: 'Vieja', archived: true });

function setup(assets: Asset[] = [], accounts = [main, crypto, old]) {
  const api = createFakeApi();
  api.assetApi.getAll.mockResolvedValue(assets);
  api.accountApi.getAll.mockResolvedValue({ accounts, total: 2000 });
  renderWithProviders(<AssetsView />, { api });
  return api;
}

const mortgage = (over: Partial<Asset> = {}): Asset =>
  f.asset({
    id: 'd1',
    name: 'Piso Málaga',
    kind: 'debt',
    debtType: 'mortgage',
    value: 700,
    initialValue: 1000,
    paidOff: false,
    payment: f.debtPayment({
      ruleId: 'r1',
      accountId: 'a-crypto',
      nextDate: '2026-04-20',
      remainingPayments: 3,
      paid: 300,
    }),
    ...over,
  });

/** The row of an element in the list (the payoff plan shows the debts' names too). */
const row = (name: string) =>
  within(
    screen
      .getAllByText(name, { selector: 'strong' })
      .map((e) => e.closest('li.asset-row'))
      .find(Boolean) as HTMLElement
  );

describe('Adding a debt that is paid every month', () => {
  it('goes step by step: what it is, its data and how it is paid', async () => {
    const api = setup();
    await waitFor(() => expect(api.accountApi.getAll).toHaveBeenCalled());
    // Investments and goods do not ask for a type of debt nor a payment.
    expect(screen.queryByRole('combobox', { name: tr('app.assets.debtType') })).toBeNull();
    expect(screen.queryByText(tr('app.assets.step.pay'))).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(tr('app.assets.group.debt')) }));
    expect(screen.getByText(tr('app.assets.debtSubtracts'))).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.assets.debtType') }), {
      target: { value: 'mortgage' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: 'Hipoteca' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.owed') }), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.initial') }), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.rate') }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.assets.pays') }));
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '1500' },
    });
    // Never refused: it says what will happen.
    expect(screen.getByText(tr('app.assets.warn.payoffAtOnce'))).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '300' },
    });
    expect(screen.queryByText(tr('app.assets.warn.payoffAtOnce'))).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.day') }), {
      target: { value: '40' },
    });
    // Any active account, crypto too; archived ones are not offered.
    const account = screen.getByRole('combobox', { name: tr('app.assets.payment.account') });
    expect(account).toHaveValue('a-main');
    expect(within(account).queryByText(/Vieja/)).toBeNull();
    fireEvent.change(account, { target: { value: 'a-crypto' } });
    const start = screen.getByRole('combobox', { name: tr('app.assets.payment.start') });
    expect(within(start).getAllByRole('option')).toHaveLength(13);
    fireEvent.change(start, { target: { value: '2026-04' } });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.instalments') }), {
      target: { value: '24' },
    });

    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.assets.error.day'));
    expect(api.assetApi.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.day') }), {
      target: { value: '20' },
    });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    await waitFor(() =>
      expect(api.assetApi.create).toHaveBeenCalledWith({
        name: 'Hipoteca',
        kind: 'debt',
        value: 1000,
        debtType: 'mortgage',
        initialValue: 5000,
        interestRate: 2,
        payment: {
          amount: 300,
          day: 20,
          accountId: 'a-crypto',
          startYear: 2026,
          startMonth: 4,
          instalments: 24,
        },
      })
    );
    // The accounts and the months are read again (the payments change them).
    await waitFor(() => expect(api.accountApi.getAll.mock.calls.length).toBeGreaterThan(1));
    expect(
      screen.getByRole('radio', { name: new RegExp(tr('app.assets.group.investment')) })
    ).toBeChecked();
  });

  it('warns when the payment does not cover the interest', async () => {
    setup();
    fireEvent.click(
      await screen.findByRole('radio', { name: new RegExp(tr('app.assets.group.debt')) })
    );
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.owed') }), {
      target: { value: '100000' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.assets.pays') }));
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '500' },
    });
    // Without a rate there is no interest to cover.
    expect(screen.queryByText(tr('app.assets.warn.interest'))).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.rate') }), {
      target: { value: '12' },
    });
    expect(screen.getByText(tr('app.assets.warn.interest'))).toBeInTheDocument();
  });

  it('takes the first account when none is the default, and none when there are none', async () => {
    setup([], [crypto]);
    fireEvent.click(
      await screen.findByRole('radio', { name: new RegExp(tr('app.assets.group.debt')) })
    );
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.assets.pays') }));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: tr('app.assets.payment.account') })).toHaveValue(
        'a-crypto'
      )
    );
  });

  it('leaves the account to the server while the accounts are unknown', async () => {
    setup([], []);
    fireEvent.click(
      await screen.findByRole('radio', { name: new RegExp(tr('app.assets.group.debt')) })
    );
    fireEvent.click(screen.getByRole('checkbox', { name: tr('app.assets.pays') }));
    expect(
      screen.getByRole('textbox', { name: tr('app.assets.payment.amount') })
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: tr('app.assets.payment.account') })).toBeNull();
  });

  it('shows why the server refused it (the free plan limit)', async () => {
    const api = setup();
    api.assetApi.create.mockRejectedValueOnce(new Error('Has llegado al máximo del plan'));
    fireEvent.click(
      await screen.findByRole('radio', { name: new RegExp(tr('app.assets.group.good')) })
    );
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.name') }), {
      target: { value: 'Coche' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.value') }), {
      target: { value: '9000' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.add') }));
    expect(await screen.findByText('Has llegado al máximo del plan')).toBeInTheDocument();
    // What was typed stays to try again.
    expect(screen.getByRole('textbox', { name: tr('app.assets.name') })).toHaveValue('Coche');
  });
});

describe('A debt paid every month', () => {
  it('shows its payment, account, next payment, time left and progress', async () => {
    setup([mortgage()]);
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    const r = row('Piso Málaga');
    // A debt subtracts.
    expect(r.getByText('−700,00 €')).toHaveClass('amount-neg');
    expect(
      r.getByText(literal(tr('app.assets.debt.payment', { amount: '300,00 €', day: 20 })))
    ).toHaveTextContent('Cripto');
    expect(r.getByText(tr('app.assets.debt.next', { date: '20 abr 2026' }))).toBeInTheDocument();
    expect(
      r.getByText(tr('app.assets.debt.remainingUntil', { count: 3, date: 'junio de 2026' }))
    ).toBeInTheDocument();
    expect(
      r.getByRole('progressbar', {
        name: tr('app.assets.debt.progressOf', { name: 'Piso Málaga' }),
      })
    ).toHaveAttribute('aria-valuenow', '30');
    expect(
      r.getByText(
        literal(tr('app.assets.debt.progress', { percent: '30 %', initial: '1.000,00 €' }))
      )
    ).toBeInTheDocument();
    expect(
      r.getByText(tr('app.assets.debt.paidSoFar', { amount: '300,00 €' }))
    ).toBeInTheDocument();
    expect(screen.getByText(literal(tr('app.assets.total'))).parentElement).toHaveTextContent(
      '−700,00 €'
    );
    // The payoff plan counts its automatic payment.
    expect(screen.getByText(tr('app.debt.minAuto', { amount: '300,00 €' }))).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: tr('app.debt.minOf', { name: 'Piso Málaga' }) })
    ).toBeNull();
  });

  it('paid off, paused, without end, or not covering the interest', async () => {
    setup([
      mortgage({
        id: 'p',
        name: 'Pagada',
        value: 0,
        paidOff: true,
        payment: f.debtPayment({ nextDate: null, remainingPayments: 0, paid: 1000 }),
      }),
      mortgage({
        id: 'z',
        name: 'Pausada',
        initialValue: null,
        payment: f.debtPayment({ active: false, nextDate: null, paid: 0, accountId: 'gone' }),
      }),
      mortgage({
        id: 'n',
        name: 'Sin fin',
        debtType: 'card',
        payment: f.debtPayment({
          remainingPayments: null,
          endYear: null,
          endMonth: null,
          coversInterest: false,
        }),
      }),
      mortgage({
        id: 'e',
        name: 'Abierta',
        payment: f.debtPayment({
          remainingPayments: 7,
          endYear: null,
          endMonth: null,
          nextDate: null,
        }),
      }),
    ]);
    await screen.findByText('Pagada', { selector: 'strong' });
    const paid = row('Pagada');
    expect(paid.getByText(tr('app.assets.debt.paidOff'))).toBeInTheDocument();
    expect(paid.getByText(literal(`· ${tr('app.assets.debt.paid')}`))).toBeInTheDocument();
    expect(paid.queryByText(/Quedan/)).toBeNull();
    expect(paid.getByText('0,00 €')).not.toHaveClass('amount-neg');

    const paused = row('Pausada');
    expect(paused.getByText(tr('app.assets.debt.paused'))).toBeInTheDocument();
    expect(paused.queryByRole('progressbar')).toBeNull();
    expect(paused.queryByText(/Pagado con cuotas/)).toBeNull();
    expect(
      paused.getByText(literal(tr('app.assets.debt.payment', { amount: '300,00 €', day: 20 })))
    ).not.toHaveTextContent('·');

    const never = row('Sin fin');
    expect(never.getByText(tr('app.assets.debtType.card'))).toBeInTheDocument();
    expect(never.getByText(tr('app.assets.debt.never'))).toBeInTheDocument();
    expect(never.queryByText(/Quedan/)).toBeNull();

    const open = row('Abierta');
    expect(open.getByText(tr('app.assets.debt.remaining', { count: 7 }))).toBeInTheDocument();
    expect(open.queryByText(/Próximo pago/)).toBeNull();
  });

  it('changes the payment for the months to come', async () => {
    const api = setup([mortgage()]);
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.debt.editOf', { name: 'Piso Málaga' }) })
    );
    const r = row('Piso Málaga');
    // A running payment keeps its first month; empty instalments keep the ones it had.
    expect(r.queryByRole('combobox', { name: tr('app.assets.payment.start') })).toBeNull();
    expect(r.getByRole('textbox', { name: tr('app.assets.payment.amount') })).toHaveValue('300');
    expect(r.getByRole('combobox', { name: tr('app.assets.payment.account') })).toHaveValue(
      'a-crypto'
    );
    fireEvent.change(r.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '0' },
    });
    fireEvent.click(r.getByRole('button', { name: tr('app.assets.debt.save') }));
    expect(await r.findByRole('alert')).toHaveTextContent(tr('app.assets.error.payment'));
    fireEvent.change(r.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '350' },
    });
    expect(r.queryByRole('alert')).toBeNull();
    fireEvent.change(r.getByRole('combobox', { name: tr('app.assets.payment.account') }), {
      target: { value: 'a-main' },
    });
    fireEvent.click(r.getByRole('button', { name: tr('app.assets.debt.save') }));
    await waitFor(() =>
      expect(api.assetApi.updateDebt).toHaveBeenCalledWith('d1', {
        payment: { amount: 350, day: 20, accountId: 'a-main' },
      })
    );
    await waitFor(() =>
      expect(r.queryByRole('textbox', { name: tr('app.assets.payment.amount') })).toBeNull()
    );
  });

  it('keeps the editor open when saving fails, and cancels', async () => {
    const api = setup([mortgage()]);
    api.assetApi.updateDebt.mockRejectedValueOnce(new Error('La cuenta está archivada'));
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.debt.editOf', { name: 'Piso Málaga' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.save') }));
    expect(await screen.findByText('La cuenta está archivada')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: tr('app.assets.payment.amount') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.cancel') }));
    expect(screen.queryByRole('textbox', { name: tr('app.assets.payment.amount') })).toBeNull();
  });

  it('stops paying it by itself after asking', async () => {
    const api = setup([mortgage()]);
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.debt.editOf', { name: 'Piso Málaga' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.stop') }));
    const dialog = screen.getByRole('dialog', {
      name: tr('app.assets.debt.stopTitle', { name: 'Piso Málaga' }),
    });
    expect(dialog).toHaveTextContent(tr('app.assets.debt.stopMessage'));
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.assets.debt.cancel') }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.assetApi.updateDebt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.stop') }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: tr('app.assets.debt.stop') })
    );
    await waitFor(() =>
      expect(api.assetApi.updateDebt).toHaveBeenCalledWith('d1', { payment: null })
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: tr('app.assets.debt.save') })).toBeNull()
    );
  });

  it('a stop that fails keeps the editor open', async () => {
    const api = setup([mortgage()]);
    api.assetApi.updateDebt.mockRejectedValueOnce(new Error('Sin conexión'));
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.debt.editOf', { name: 'Piso Málaga' }) })
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.stop') }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: tr('app.assets.debt.stop') })
    );
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: tr('app.assets.debt.save') })).toBeInTheDocument();
  });

  it('a debt without a payment can start paying every month', async () => {
    const api = setup([
      f.asset({
        id: 'd2',
        name: 'Préstamo',
        kind: 'debt',
        debtType: 'personal',
        value: 900,
        payment: null,
      }),
    ]);
    await screen.findByText(tr('app.assets.debtType.personal'));
    expect(screen.queryByText(/Próximo pago/)).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.debt.addOf', { name: 'Préstamo' }) })
    );
    expect(screen.queryByRole('button', { name: tr('app.assets.debt.stop') })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.amount') }), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.assets.payment.day') }), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.assets.payment.start') }), {
      target: { value: '2026-06' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.assets.debt.save') }));
    await waitFor(() =>
      expect(api.assetApi.updateDebt).toHaveBeenCalledWith('d2', {
        payment: {
          amount: 100,
          day: 5,
          accountId: null,
          startYear: 2026,
          startMonth: 6,
          instalments: null,
        },
      })
    );
  });

  it('asks before removing a debt with its payment; others go at once', async () => {
    const api = setup([mortgage(), f.asset({ id: 'f1', name: 'Fondo' })]);
    await screen.findByText(tr('app.assets.debtType.mortgage'));
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.remove', { name: 'Piso Málaga' }) })
    );
    const dialog = screen.getByRole('dialog', {
      name: tr('app.assets.removeTitle', { name: 'Piso Málaga' }),
    });
    expect(dialog).toHaveTextContent(tr('app.assets.removeMessage'));
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.assets.debt.cancel') }));
    expect(api.assetApi.remove).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.remove', { name: 'Piso Málaga' }) })
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: tr('app.assets.removeConfirm'),
      })
    );
    await waitFor(() => expect(api.assetApi.remove).toHaveBeenCalledWith('d1'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: tr('app.assets.remove', { name: 'Fondo' }) })
    );
    await waitFor(() => expect(api.assetApi.remove).toHaveBeenCalledWith('f1'));
    // Writing what is owed now keeps working (the payments go on from there).
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.assets.updateValue', { name: 'Piso Málaga' }) }),
      {
        target: { value: '650' },
      }
    );
    expect(
      screen.getByRole('textbox', { name: tr('app.assets.updateValue', { name: 'Piso Málaga' }) })
    ).toHaveAttribute('placeholder', tr('app.assets.newOwed'));
    fireEvent.click(row('Piso Málaga').getByRole('button', { name: tr('app.assets.update') }));
    await waitFor(() => expect(api.assetApi.setValue).toHaveBeenCalledWith('d1', 650));
  });
});

describe('Its automatic operation', () => {
  it('is marked with the debt, whose type and dates it keeps', async () => {
    const api = createFakeApi();
    api.recurringApi.getAll.mockResolvedValue([
      f.rule({
        id: 'r1',
        description: 'Cuota Hipoteca',
        day: 20,
        debt: { id: 'd1', name: 'Hipoteca' },
      }),
      f.rule({ id: 'r2', description: 'Gimnasio' }),
    ]);
    renderWithProviders(<RecurringRulesTab categories={[f.category({ name: 'Vivienda' })]} />, {
      api,
    });
    expect(
      await screen.findByText(literal(tr('app.recurring.card.debt', { name: 'Hipoteca' })))
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Deuda:/)).toHaveLength(1);

    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.recurring.card.edit')}: Cuota Hipoteca` })
    );
    expect(screen.getByRole('note')).toHaveTextContent(
      tr('app.recurring.form.debtManaged', { name: 'Hipoteca' })
    );
    expect(screen.queryByRole('combobox', { name: tr('app.recurring.form.type') })).toBeNull();
    expect(screen.queryByRole('combobox', { name: tr('app.recurring.form.frequency') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.cancel') }));

    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.recurring.card.edit')}: Gimnasio` })
    );
    expect(screen.queryByRole('note')).toBeNull();
    expect(
      screen.getByRole('combobox', { name: tr('app.recurring.form.frequency') })
    ).toBeInTheDocument();
  });
});
