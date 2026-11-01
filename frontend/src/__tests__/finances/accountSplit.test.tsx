import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { SearchView } from '@modules/finances/ui/views/SearchView';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import type { Account, RecurringRule } from '@modules/finances/domain/types';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import { captureDownloads, mockMatchMedia } from '@test-utils/dom';
import { formatMoney } from '@shared/utils/format';

const main = f.account({ id: 'a1', name: 'Principal', isDefault: true });
const checking = f.account({ id: 'a2', name: 'Corriente' });
const cash = f.account({ id: 'a3', name: 'Efectivo', icon: '💶' });
const accounts = [main, checking, cash];

// As the screen reads it: the matchers turn the narrow spaces of the format into plain ones.
const euros = (n: number) => formatMoney(n, 'EUR', 'es').replace(/\s/g, ' ');

// ─── The movement form ────────────────────────────────────────────────────────

const shared = f.transaction({
  id: 't9',
  description: 'Cuenta común',
  amount: 800,
  date: '2026-03-05',
  accountId: 'a2',
  accountName: 'Corriente',
  splits: [
    { accountId: 'a2', accountName: 'Corriente', amount: 500 },
    { accountId: 'a3', accountName: 'Efectivo', amount: 300 },
  ],
});
const dinner = f.transaction({
  id: 't1',
  description: 'Cena',
  amount: 40,
  accountId: 'a1',
  accountName: 'Principal',
  date: '2026-03-10',
});

function setupMonth(list: Account[] = accounts) {
  const api = createFakeApi();
  api.monthApi.get.mockResolvedValue(f.overview({ transactions: [dinner, shared] }));
  api.categoryApi.getAll.mockResolvedValue([f.category({ id: 'c1', name: 'Ocio' })]);
  api.accountApi.getAll.mockResolvedValue({ accounts: list, total: 1000 });
  return renderWithProviders(<Dashboard />, { api });
}

const toggle = () =>
  screen.getByRole('switch', { name: tr('app.accountSplit.toggle') }) as HTMLInputElement;
const amountOf = (n: number) =>
  screen.getByRole('spinbutton', {
    name: tr('app.accountSplit.amount', { n }),
  }) as HTMLInputElement;
const accountOf = (n: number) =>
  screen.getByRole('combobox', {
    name: tr('app.accountSplit.account', { n }),
  }) as HTMLSelectElement;

describe('splitting a new movement', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mm_recap_seen', '2026-3');
    freezeTime('2026-03-15T12:00:00');
  });
  afterEach(restoreTime);

  const open = () =>
    fireEvent.click(
      screen.getByRole('button', { name: literal(tr('app.transaction.form.title')) })
    );
  const fill = (amount: string) => {
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.transaction.form.description') }),
      { target: { value: 'Cuenta común' } }
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: amount },
    });
    fireEvent.change(screen.getByRole('combobox', { name: tr('app.transaction.form.category') }), {
      target: { value: 'Ocio' },
    });
  };

  it('shows each split movement with its parts and in the filter of each account', async () => {
    setupMonth();
    const row = (await screen.findByText('Cuenta común')).closest('tr') as HTMLElement;
    expect(
      within(row).getByText(`${euros(500)} Corriente + ${euros(300)} Efectivo`)
    ).toBeInTheDocument();
    const cards = screen.getByRole('region', { name: tr('app.accountCards.ariaLabel') });
    fireEvent.click(within(cards).getByRole('button', { name: /Efectivo/, pressed: false }));
    expect(screen.getByText('Cuenta común')).toBeInTheDocument();
    expect(screen.queryByText('Cena')).toBeNull();
  });

  it('splits 800 € into 500 € + 300 €, the second part filled in by itself', async () => {
    const { api } = setupMonth();
    await screen.findByText('Cena');
    open();
    fill('800');
    expect(screen.getByRole('combobox', { name: tr('app.transaction.form.account') })).toBeTruthy();
    fireEvent.click(toggle());
    // The single account selector gives way to the rows.
    expect(screen.queryByRole('combobox', { name: tr('app.transaction.form.account') })).toBeNull();
    expect(accountOf(1).value).toBe('a1');
    expect(accountOf(2).value).toBe('a2');
    expect(amountOf(2).value).toBe('800');
    expect(screen.getByText(tr('app.accountSplit.error.amount'))).toBeInTheDocument();
    fireEvent.change(accountOf(2), { target: { value: 'a3' } });
    fireEvent.change(amountOf(1), { target: { value: '500' } });
    expect(amountOf(2).value).toBe('300');
    expect(screen.getByText(`✓ ${tr('app.accountSplit.ok', { amount: euros(800) })}`)).toHaveClass(
      'acct-split-status--ok'
    );
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    await waitFor(() =>
      expect(api.transactionApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 800,
          accountId: 'a1',
          splits: [
            { accountId: 'a1', amount: 500 },
            { accountId: 'a3', amount: 300 },
          ],
        })
      )
    );
  });

  it('says what is left or over, adds, removes and splits equally, and refuses what does not add up', async () => {
    const { api } = setupMonth();
    await screen.findByText('Cena');
    open();
    fill('800');
    fireEvent.click(toggle());
    fireEvent.change(amountOf(2), { target: { value: '300' } });
    expect(screen.getByText(tr('app.accountSplit.missing', { amount: euros(500) }))).toHaveClass(
      'acct-split-status--pending'
    );
    fireEvent.change(amountOf(1), { target: { value: '600' } });
    expect(
      screen.getByText(tr('app.accountSplit.over', { amount: euros(100) }))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    expect(await screen.findByText(tr('app.accountSplit.error.sum'))).toBeInTheDocument();
    expect(api.transactionApi.create).not.toHaveBeenCalled();

    const remove = (n: number) =>
      screen.getByRole('button', { name: tr('app.accountSplit.remove', { n }) });
    expect(remove(1)).toBeDisabled();
    const add = screen.getByRole('button', { name: literal(tr('app.accountSplit.add')) });
    fireEvent.click(add);
    expect(accountOf(3).value).toBe('a3');
    // Three accounts, three rows: no more to add.
    expect(add).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: tr('app.accountSplit.equal') }));
    expect([amountOf(1).value, amountOf(2).value, amountOf(3).value]).toEqual([
      '266.67',
      '266.67',
      '266.66',
    ]);
    // A change of the total moves the last part.
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.transaction.form.amount') }), {
      target: { value: '900' },
    });
    expect(amountOf(3).value).toBe('366.66');
    fireEvent.click(remove(2));
    expect(
      screen.queryByRole('spinbutton', { name: tr('app.accountSplit.amount', { n: 3 }) })
    ).toBeNull();
    expect(amountOf(2).value).toBe('633.33');
    // Off again: everything in one account.
    fireEvent.click(toggle());
    expect(
      screen.queryByRole('spinbutton', { name: tr('app.accountSplit.amount', { n: 1 }) })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.transaction.form.save') }));
    await waitFor(() =>
      expect(api.transactionApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 900, accountId: 'a1', splits: null })
      )
    );
  });

  it('has no split with a single account', async () => {
    setupMonth([main]);
    await screen.findByText('Cena');
    open();
    expect(screen.queryByRole('switch', { name: tr('app.accountSplit.toggle') })).toBeNull();
  });

  it('editing a split movement shows its parts and saves the new ones', async () => {
    const { api } = setupMonth();
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cuenta común` })
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('switch')).toBeChecked();
    expect(amountOf(1).value).toBe('500');
    expect(amountOf(2).value).toBe('300');
    // The parts were typed: changing the first one does not touch the last.
    fireEvent.change(amountOf(1), { target: { value: '400' } });
    expect(amountOf(2).value).toBe('300');
    fireEvent.change(amountOf(2), { target: { value: '400' } });
    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.transaction.edit.save') }));
    await waitFor(() =>
      expect(api.transactionApi.update).toHaveBeenCalledWith(
        't9',
        expect.objectContaining({
          accountId: 'a2',
          splits: [
            { accountId: 'a2', amount: 400 },
            { accountId: 'a3', amount: 400 },
          ],
        })
      )
    );
  });

  it('editing keeps an archived account a part already uses', async () => {
    setupMonth([main, checking, { ...cash, archived: true }]);
    await screen.findByText('Cena');
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.transaction.table.edit')}: Cuenta común` })
    );
    await screen.findByRole('dialog');
    expect(accountOf(2).value).toBe('a3');
    expect(within(accountOf(2)).getByRole('option', { name: /Efectivo/ })).toBeInTheDocument();
  });
});

// ─── Automatic operations ─────────────────────────────────────────────────────

const splitRule = f.rule({
  id: 'r9',
  description: 'Cuenta común',
  amount: 800,
  accountId: 'a2',
  splits: [
    { accountId: 'a2', amount: 500 },
    { accountId: 'a3', amount: 300 },
  ],
});

function setupRules(rules: RecurringRule[] = [splitRule], list: Account[] = accounts) {
  const api = createFakeApi();
  api.recurringApi.getAll.mockResolvedValue(rules);
  api.accountApi.getAll.mockResolvedValue({ accounts: list, total: 0 });
  api.recurringApi.create.mockResolvedValue(splitRule);
  api.recurringApi.update.mockResolvedValue(splitRule);
  const view = renderWithProviders(
    <RecurringRulesTab categories={[f.category({ id: 'c1', name: 'Vivienda' })]} />,
    { api }
  );
  return view;
}

describe('splitting an automatic operation', () => {
  beforeEach(() => {
    localStorage.clear();
    freezeTime();
  });
  afterEach(restoreTime);

  it('shows the parts on its card, warning about an archived one', async () => {
    setupRules([splitRule], [main, checking, { ...cash, archived: true }]);
    expect(
      await screen.findByText(
        tr('app.recurring.card.account', {
          name: `${euros(500)} Corriente + ${euros(300)} Efectivo`,
        })
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          tr('app.recurring.card.accountArchived', { name: 'Efectivo', fallback: 'Principal' })
        )
      )
    ).toBeInTheDocument();
  });

  it('a part in an account not known any more shows only its amount', async () => {
    // No default account known either: the warning of the archived part names none.
    setupRules(
      [{ ...splitRule, splits: [{ accountId: 'gone', amount: 800 }, ...splitRule.splits!] }],
      [checking, { ...cash, archived: true }]
    );
    expect(
      await screen.findByText(new RegExp(`^Cuenta: ${euros(800)} \\+ ${euros(500)} Corriente`))
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Efectivo');
  });

  it('editing keeps an archived account one of its parts uses', async () => {
    setupRules([splitRule], [main, checking, { ...cash, archived: true }]);
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Cuenta común` })
    );
    expect(accountOf(2).value).toBe('a3');
  });

  it('without a default account, a new split starts with the first account', async () => {
    setupRules([], [checking, cash]);
    fireEvent.click(await screen.findByRole('button', { name: tr('app.recurring.new') }));
    fireEvent.click(toggle());
    expect(accountOf(1).value).toBe('a2');
    expect(accountOf(2).value).toBe('a3');
  });

  it('creates one split between two accounts', async () => {
    const { api } = setupRules([]);
    fireEvent.click(await screen.findByRole('button', { name: tr('app.recurring.new') }));
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.description')), {
      target: { value: 'Cuenta común' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.amount')), {
      target: { value: '800' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.category')), {
      target: { value: 'Vivienda' },
    });
    fireEvent.click(toggle());
    expect(screen.queryByLabelText(tr('app.recurring.form.account'))).toBeNull();
    expect(accountOf(1).value).toBe('a1');
    fireEvent.change(amountOf(1), { target: { value: '500' } });
    fireEvent.change(accountOf(2), { target: { value: 'a3' } });
    // The amount follows into the last part.
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.amount')), {
      target: { value: '900' },
    });
    expect(amountOf(2).value).toBe('400');
    fireEvent.change(amountOf(2), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
    expect(await screen.findByText(tr('app.accountSplit.error.sum'))).toBeInTheDocument();
    fireEvent.change(amountOf(1), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
    await waitFor(() =>
      expect(api.recurringApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 900,
          accountId: 'a1',
          splits: [
            { accountId: 'a1', amount: 400 },
            { accountId: 'a3', amount: 500 },
          ],
        })
      )
    );
  });

  it('editing a split one starts with its parts; a debt payment cannot be split', async () => {
    const debtRule = f.rule({
      id: 'r8',
      description: 'Hipoteca',
      debt: { id: 'd1', name: 'Hipoteca' },
    });
    const { api } = setupRules([splitRule, debtRule]);
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Cuenta común` })
    );
    expect(toggle()).toBeChecked();
    expect(amountOf(2).value).toBe('300');
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
    await waitFor(() =>
      expect(api.recurringApi.update).toHaveBeenCalledWith(
        'r9',
        expect.objectContaining({ splits: splitRule.splits })
      )
    );
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Hipoteca` })
    );
    expect(screen.queryByRole('switch', { name: tr('app.accountSplit.toggle') })).toBeNull();
  });

  it('with a single account there is nothing to split', async () => {
    setupRules([], [main]);
    fireEvent.click(await screen.findByRole('button', { name: tr('app.recurring.new') }));
    expect(screen.queryByRole('switch', { name: tr('app.accountSplit.toggle') })).toBeNull();
  });
});

// ─── Lists and files ──────────────────────────────────────────────────────────

/** Presses an export button and reads the rows of the CSV it saves. */
async function csvRows(name: string) {
  const saved = captureDownloads();
  fireEvent.click(await screen.findByRole('button', { name }));
  await waitFor(() => expect(saved.names).toHaveLength(1));
  const [text] = await saved.text();
  saved.restore();
  return text
    .replace(/^\uFEFF/, '')
    .split('\r\n')
    .slice(1);
}

describe('split movements and operations in lists and files', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mm_recap_seen', '2026-3');
    freezeTime('2026-03-15T12:00:00');
  });
  afterEach(restoreTime);

  it('the cards of a phone name the parts; with one account, no account at all', async () => {
    const restore = mockMatchMedia(true);
    const { unmount } = setupMonth();
    expect(
      await screen.findByText(new RegExp(`${euros(500)} Corriente \\+ ${euros(300)} Efectivo`))
    ).toBeInTheDocument();
    unmount();
    setupMonth([main]);
    await screen.findByText('Cena');
    expect(screen.queryByText(/Principal/)).toBeNull();
    restore();
  });

  it('the search lists and exports a split movement with its parts', async () => {
    const api = createFakeApi();
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 0 });
    api.transactionApi.search.mockResolvedValue({
      items: [shared],
      total: 1,
      totals: { income: 0, expenses: 800, saving: 0 },
    });
    renderWithProviders(<SearchView onEdit={jest.fn()} />, { api });
    expect(
      await screen.findByText(new RegExp(`${euros(500)} Corriente \\+ ${euros(300)} Efectivo`))
    ).toBeInTheDocument();
    const [row] = await csvRows(tr('app.exportButtons.csvFor', { what: tr('app.search.title') }));
    expect(row).toContain('"500 Corriente + 300 Efectivo"');
  });

  it('the file of automatic operations says the parts of each', async () => {
    const api = createFakeApi();
    api.recurringApi.getAll.mockResolvedValue([
      { ...splitRule, splits: [{ accountId: 'gone', amount: 100 }, ...splitRule.splits!] },
    ]);
    api.accountApi.getAll.mockResolvedValue({ accounts, total: 0 });
    renderWithProviders(<RecurringRulesTab categories={[]} />, { api });
    await screen.findByText(/Corriente/);
    const [row] = await csvRows(
      tr('app.exportButtons.csvFor', { what: tr('app.recurring.title') })
    );
    // Plain figures, as the amounts of the file.
    expect(row).toContain('"100 + 500 Corriente + 300 Efectivo"');
  });
});
