import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { QuickAdd } from '@modules/finances/ui/components/QuickAdd';
import { MonthlyView } from '@modules/finances/ui/components/MonthlyView';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import type { CategoryRule } from '@modules/finances/domain/types';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const history = [
  f.transaction({ description: 'Café', category: 'Desayunos', date: '2026-03-02' }),
  f.transaction({ description: 'Super', category: 'Alimentación', date: '2026-03-05' }),
];

const setup = (onAdd = jest.fn().mockResolvedValue(undefined), rules: CategoryRule[] = []) => {
  const api = createFakeApi();
  api.categoryRuleApi.getAll.mockResolvedValue(rules);
  renderWithProviders(
    <>
      <button type="button">otro</button>
      <QuickAdd transactions={history} defaultDate="2026-03-15" onAdd={onAdd} />
    </>,
    { api }
  );
  const field = screen.getByLabelText(literal(tr('app.quickAdd.label')));
  return { api, onAdd, field };
};

const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const chip = (name: string) => screen.getByRole('button', { name });

describe('QuickAdd', () => {
  it('adds «café 1,50» with the category of the last coffee, and is ready for the next one', async () => {
    const { onAdd, field } = setup();
    expect(screen.getByText(tr('app.quickAdd.hint'))).toBeVisible();
    type(field, 'café 1,50');
    expect(chip('Desayunos')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Alimentación')).toHaveAttribute('aria-pressed', 'false');
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

  it('uses a rule of the person, and a chip changes the category', async () => {
    const { onAdd, field } = setup(jest.fn().mockResolvedValue(undefined), [
      { id: 'r1', pattern: 'taxi', categoryId: 'c1', categoryName: 'Transporte' },
    ]);
    await act(async () => undefined);
    type(field, 'taxi 12');
    await waitFor(() => expect(chip('Transporte')).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(chip('Alimentación'));
    expect(chip('Alimentación')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.submit(field);
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ category: 'Alimentación' }))
    );
  });

  it('has no chips before the first movement', () => {
    renderWithProviders(<QuickAdd transactions={[]} defaultDate="2026-03-15" onAdd={jest.fn()} />, {
      api: createFakeApi(),
    });
    expect(screen.queryByRole('group')).toBeNull();
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
    fireEvent.keyDown(other, { key: 'N' });
    expect(field).toHaveFocus();
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
});
