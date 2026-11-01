import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { QuickAdd } from '@modules/finances/ui/components/QuickAdd';
import { MonthlyView } from '@modules/finances/ui/components/MonthlyView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import type { Account, Category, CategoryRule } from '@modules/finances/domain/types';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const worker = { recognize: jest.fn(), terminate: jest.fn() };
jest.mock('tesseract.js', () => ({ createWorker: jest.fn(async () => worker) }));

const history = [
  f.transaction({ description: 'Café', category: 'Desayunos', date: '2026-03-02' }),
  f.transaction({ description: 'Super', category: 'Alimentación', date: '2026-03-05' }),
];

const categories: Category[] = [
  f.category({ name: 'Desayunos', icon: '☕' }),
  f.category({ name: 'Alimentación', icon: '🛒' }),
  f.category({ name: 'Transporte', icon: '🚌' }),
];

const setup = (
  onAdd = jest.fn().mockResolvedValue(undefined),
  rules: CategoryRule[] = [],
  accounts: Account[] = []
) => {
  const api = createFakeApi();
  api.categoryRuleApi.getAll.mockResolvedValue(rules);
  renderWithProviders(
    <>
      <button type="button">otro</button>
      <QuickAdd
        transactions={history}
        categories={categories}
        accounts={accounts}
        defaultDate="2026-03-15"
        onAdd={onAdd}
      />
    </>,
    { api }
  );
  const field = screen.getByLabelText(literal(tr('app.quickAdd.label')));
  return { api, onAdd, field };
};

const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const categorySelect = () =>
  screen.getByLabelText(tr('app.quickAdd.categories')) as HTMLSelectElement;
const accountSelect = () => screen.getByLabelText(tr('app.quickAdd.account')) as HTMLSelectElement;

describe('QuickAdd', () => {
  it('adds «café 1,50» with the category of the last coffee, and is ready for the next one', async () => {
    const { onAdd, field } = setup();
    expect(screen.getByText(tr('app.quickAdd.hint'))).toBeVisible();
    type(field, 'café 1,50');
    expect(categorySelect()).toHaveValue('Desayunos');
    expect(screen.queryByLabelText(tr('app.quickAdd.account'))).toBeNull();
    fireEvent.submit(field);
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith({
        description: 'Café',
        amount: 1.5,
        type: 'EXPENSE',
        category: 'Desayunos',
        date: '2026-03-15',
      })
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Café, 1,50\s€ en Desayunos/);
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });

  it('uses a rule of the person, and the list changes the category', async () => {
    const { onAdd, field } = setup(jest.fn().mockResolvedValue(undefined), [
      { id: 'r1', pattern: 'taxi', categoryId: 'c1', categoryName: 'Transporte' },
    ]);
    await act(async () => undefined);
    type(field, 'taxi 12');
    await waitFor(() => expect(categorySelect()).toHaveValue('Transporte'));
    fireEvent.change(categorySelect(), { target: { value: 'Alimentación' } });
    expect(categorySelect()).toHaveValue('Alimentación');
    fireEvent.submit(field);
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ category: 'Alimentación' }))
    );
  });

  it('has the list of categories even before the first movement, and keeps a suggestion that is not in it', () => {
    renderWithProviders(<QuickAdd transactions={[]} defaultDate="2026-03-15" onAdd={jest.fn()} />, {
      api: createFakeApi(),
    });
    expect(categorySelect()).toHaveValue('');
    type(screen.getByLabelText(literal(tr('app.quickAdd.label'))), 'pan 1');
    expect(categorySelect()).toHaveValue('Otros');
    fireEvent.change(categorySelect(), { target: { value: '' } });
    expect(categorySelect()).toHaveValue('Otros');
  });

  describe('with several accounts', () => {
    const main = f.account({ name: 'Principal', icon: '🏦', isDefault: true });
    const cash = f.account({ name: 'Efectivo', icon: '💶' });
    const old = f.account({ name: 'Vieja', archived: true });

    it('preselects the default account, and the one chosen goes with the movement', async () => {
      const { onAdd, field } = setup(jest.fn().mockResolvedValue(undefined), [], [cash, main, old]);
      expect(accountSelect()).toHaveValue(main.id);
      expect(screen.queryByRole('option', { name: /Vieja/ })).toBeNull();
      type(field, 'café 1,50');
      fireEvent.change(accountSelect(), { target: { value: cash.id } });
      fireEvent.submit(field);
      await waitFor(() =>
        expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ accountId: cash.id }))
      );
    });

    it('falls back to the first account when none is the default', async () => {
      const { onAdd, field } = setup(
        jest.fn().mockResolvedValue(undefined),
        [],
        [f.account({ isDefault: false }), cash]
      );
      expect(accountSelect().value).not.toBe('');
      type(field, 'café 1,50');
      fireEvent.submit(field);
      await waitFor(() => expect(onAdd).toHaveBeenCalled());
    });

    it('does not ask for an account when only one can be used', async () => {
      const { onAdd, field } = setup(jest.fn().mockResolvedValue(undefined), [], [main, old]);
      expect(screen.queryByLabelText(tr('app.quickAdd.account'))).toBeNull();
      type(field, 'café 1,50');
      fireEvent.submit(field);
      await waitFor(() => expect(onAdd).toHaveBeenCalled());
      expect(onAdd.mock.calls[0][0]).not.toHaveProperty('accountId');
    });
  });

  it('shows what it will add, an income with a plus', () => {
    const { field } = setup();
    type(field, '+1.200 nómina');
    expect(
      screen.getByText(/^Ingreso: Nómina · 1.200,00\s€ · /, { selector: '.section-hint' })
    ).toBeVisible();
  });

  it('says what is missing and when saving fails', async () => {
    const { onAdd, field } = setup(jest.fn().mockRejectedValue(new Error('Sin conexión')));
    fireEvent.submit(field);
    expect(screen.getByRole('alert')).toHaveTextContent(tr('app.quickAdd.invalid'));
    expect(field).toHaveAttribute('aria-invalid', 'true');
    type(field, 'pan 1');
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.submit(field);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(onAdd).toHaveBeenCalled();
  });

  it('N or + puts the cursor in the field, but not while typing, with a modifier or in a dialog', () => {
    const { field } = setup();
    const other = screen.getByRole('button', { name: 'otro' });
    other.focus();
    fireEvent.keyDown(other, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(other, { key: 'x' });
    expect(field).not.toHaveFocus();
    fireEvent.keyDown(other, { key: '+' });
    expect(field).toHaveFocus();
    fireEvent.keyDown(field, { key: 'N' });
    expect(field).toHaveValue('');

    other.focus();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    fireEvent.keyDown(other, { key: 'N' });
    expect(field).not.toHaveFocus();
    dialog.remove();
    // A closed menu is a hidden dialog still in the page: it does not block the key.
    const closed = document.createElement('aside');
    closed.setAttribute('role', 'dialog');
    closed.setAttribute('aria-hidden', 'true');
    document.body.appendChild(closed);
    fireEvent.keyDown(other, { key: 'N' });
    expect(field).toHaveFocus();
    closed.remove();
  });

  it('is on the month view, where a quick movement is saved like any other', async () => {
    const api = createFakeApi();
    renderWithProviders(
      <MonthlyView
        onEditTransaction={jest.fn()}
        onManageCategories={jest.fn()}
        onManageBudgets={jest.fn()}
        onOpenTab={jest.fn()}
      />,
      { api }
    );
    const field = await screen.findByLabelText(literal(tr('app.quickAdd.label')));
    type(field, 'café 1,50');
    fireEvent.submit(field);
    await waitFor(() =>
      expect(api.transactionApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Café', amount: 1.5, category: 'Otros' })
      )
    );
  });

  describe('with a ticket photo', () => {
    const scan = async (text: string) => {
      worker.recognize.mockResolvedValue({ data: { text } });
      worker.terminate.mockResolvedValue(undefined);
      const ctx = setup();
      expect(screen.getByRole('button', { name: literal(tr('app.receipt.scan')) })).toBeVisible();
      fireEvent.change(screen.getByLabelText(tr('app.receipt.file'), { selector: 'input' }), {
        target: { files: [new File(['x'], 'ticket.jpg')] },
      });
      return ctx;
    };

    it('fills the concept and the amount, and the entry keeps the day of the ticket', async () => {
      const { onAdd, field } = await scan('MERCADONA S.A.\n15/03/2026 18:42\nTOTAL (EUR) 5,84');
      await waitFor(() => expect(field).toHaveValue('Mercadona 5,84'));
      expect(field).toHaveFocus();
      fireEvent.submit(field);
      await waitFor(() =>
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Mercadona', amount: 5.84, date: '2026-03-15' })
        )
      );
      type(field, 'café 1,50');
      fireEvent.submit(field);
      await waitFor(() =>
        expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ date: '2026-03-15' }))
      );
    });

    it('names a ticket without a shop and leaves the amount to type when it has none', async () => {
      const { field } = await scan('1234\n5,00');
      await waitFor(() => expect(field).toHaveValue('Ticket 5'));
      worker.recognize.mockResolvedValue({ data: { text: 'Farmacia Luna\n01/02/2026' } });
      fireEvent.change(screen.getByLabelText(tr('app.receipt.file'), { selector: 'input' }), {
        target: { files: [new File(['x'], 'otro.jpg')] },
      });
      await waitFor(() => expect(field).toHaveValue('Farmacia luna'));
    });
  });
});
