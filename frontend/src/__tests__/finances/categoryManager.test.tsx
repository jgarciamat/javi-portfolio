import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { CategoryManager } from '@modules/finances/ui/components/CategoryManager';
import * as f from '@test-utils/fixtures';
import { renderWithI18n, tr } from '@test-utils/render';

const ocio = f.category({ id: 'c1', name: 'Ocio' });
const casa = f.category({ id: 'c2', name: 'Casa', icon: '🏠' });

function setup(overrides: Partial<Parameters<typeof CategoryManager>[0]> = {}) {
  const props = {
    onClose: jest.fn(),
    categories: [ocio, casa],
    onAdd: jest.fn().mockResolvedValue(undefined),
    onUpdate: jest.fn().mockResolvedValue(undefined),
    onDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  renderWithI18n(<CategoryManager {...props} />);
  return props;
}

describe('CategoryManager', () => {
  it('creates a category with the chosen icon and colour', async () => {
    const props = setup();
    const create = screen.getByRole('button', { name: tr('app.category.manager.create') });
    expect(create).toBeDisabled();
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.category.manager.name.placeholder') }),
      {
        target: { value: ' Viajes ' },
      }
    );
    fireEvent.click(screen.getByRole('radio', { name: '#22c55e' }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.category.manager.emoji.choose') }));
    fireEvent.change(
      screen.getByRole('textbox', { name: tr('app.category.manager.emoji.search') }),
      {
        target: { value: '✈️' },
      }
    );
    expect(screen.getByText(tr('app.category.manager.emoji.results'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '✈️' }));
    fireEvent.click(create);
    await waitFor(() =>
      expect(props.onAdd).toHaveBeenCalledWith({ name: 'Viajes', icon: '✈️', color: '#22c55e' })
    );
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: tr('app.category.manager.name.placeholder') })
      ).toHaveValue('')
    );
  });

  it('submits with Enter, ignores empty names and shows errors', async () => {
    const props = setup({ onAdd: jest.fn().mockRejectedValue(new Error('Ya existe')) });
    const name = screen.getByRole('textbox', { name: tr('app.category.manager.name.placeholder') });
    fireEvent.submit(name.closest('form')!);
    expect(props.onAdd).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: 'Ocio' } });
    fireEvent.submit(name.closest('form')!);
    expect(await screen.findByText('Ya existe')).toBeInTheDocument();
  });

  it('lists the emoji groups and picks one', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: tr('app.category.manager.emoji.choose') }));
    expect(screen.getByText('Dinero')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '🏠' }));
    expect(
      screen.getByRole('button', { name: tr('app.category.manager.emoji.choose') })
    ).toHaveTextContent('🏠');
  });

  it('renames with Enter or the save button; Escape cancels', async () => {
    const props = setup();
    fireEvent.click(
      screen.getByRole('button', {
        name: `${tr('app.category.manager.rename')} ${tr('app.categories.Ocio')}`,
      })
    );
    let input = screen.getByRole('textbox', { name: tr('app.category.manager.rename') });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onUpdate).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('textbox', { name: tr('app.category.manager.rename') })).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: `${tr('app.category.manager.rename')} ${tr('app.categories.Ocio')}`,
      })
    );
    input = screen.getByRole('textbox', { name: tr('app.category.manager.rename') });
    fireEvent.change(input, { target: { value: 'Diversión' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('c1', { name: 'Diversión' }));

    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.category.manager.rename')} Casa` })
    );
    fireEvent.change(screen.getByRole('textbox', { name: tr('app.category.manager.rename') }), {
      target: { value: 'Hogar' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.save') }));
    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('c2', { name: 'Hogar' }));
  });

  it('deletes unused categories and asks where to move the data of used ones', async () => {
    const inUse = new ApiError('En uso', 409, 'CATEGORY_IN_USE', {
      usage: { transactions: 3, recurringRules: 0, customAlerts: 0, budgets: 0, goals: 0 },
    });
    const onDelete = jest.fn().mockRejectedValueOnce(inUse).mockResolvedValue(undefined);
    setup({ onDelete });
    fireEvent.click(
      screen.getByRole('button', {
        name: `${tr('app.category.manager.delete.title')} ${tr('app.categories.Ocio')}`,
      })
    );
    const panel = await screen.findByRole('alert');
    expect(panel).toHaveTextContent('3');
    const confirm = within(panel).getByRole('button', {
      name: tr('app.category.manager.inUse.confirm'),
    });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    fireEvent.change(within(panel).getByRole('combobox'), { target: { value: 'c2' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(onDelete).toHaveBeenLastCalledWith('c1', 'c2'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('cancels a reassignment and shows other delete errors', async () => {
    const inUse = new ApiError('En uso', 409, 'CATEGORY_IN_USE');
    const onDelete = jest
      .fn()
      .mockRejectedValueOnce(inUse)
      .mockRejectedValueOnce(new Error('Error del servidor'))
      .mockRejectedValueOnce('raro');
    setup({ onDelete });
    const remove = () =>
      fireEvent.click(
        screen.getByRole('button', { name: `${tr('app.category.manager.delete.title')} Casa` })
      );
    remove();
    const panel = await screen.findByRole('alert');
    expect(panel).toHaveTextContent('0');
    fireEvent.click(within(panel).getByRole('button', { name: tr('app.common.cancel') }));
    remove();
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument();
    remove();
    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  it('shows the empty list and closes', () => {
    const props = setup({ categories: [] });
    expect(screen.getByText(tr('app.category.manager.list.empty'))).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: tr('app.category.manager.close') })[1]);
    expect(props.onClose).toHaveBeenCalled();
  });
});
