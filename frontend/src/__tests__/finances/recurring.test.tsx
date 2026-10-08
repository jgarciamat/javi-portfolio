import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

const categories = [f.category({ id: 'c1', name: 'Vivienda' })];

function setup(
  rules = [
    f.rule({ id: 'r1' }),
    f.rule({
      id: 'r2',
      description: 'Nómina',
      type: 'INCOME',
      category: 'Salario',
      active: false,
      endYear: 2026,
      endMonth: 12,
    }),
  ]
) {
  const api = createFakeApi();
  api.recurringApi.getAll.mockResolvedValue(rules);
  const view = renderWithProviders(<RecurringRulesTab categories={categories} />, { api });
  return view;
}

beforeEach(() => {
  localStorage.clear();
  freezeTime();
});
afterEach(restoreTime);

describe('RecurringRulesTab', () => {
  it('lists the rules with their schedule', async () => {
    setup();
    expect(await screen.findByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText(/Desde Ene 2026 — /)).toBeInTheDocument();
    expect(screen.getByText(/Desde Ene 2026 → Dic 2026/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.recurring.card.inactive'))).toBeInTheDocument();
  });

  it('shows the empty state and loading errors', async () => {
    setup([]);
    expect(await screen.findByText(new RegExp(tr('app.recurring.empty')))).toBeInTheDocument();
    const api = createFakeApi();
    api.recurringApi.getAll.mockRejectedValue(new Error('Sin red'));
    renderWithProviders(<RecurringRulesTab categories={categories} />, { api });
    expect(await screen.findByText('Sin red')).toBeInTheDocument();
  });

  it('creates a rule after validating it and reloads the months', async () => {
    const { api } = setup([]);
    await screen.findByText(new RegExp(tr('app.recurring.empty')));
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.new') }));
    const save = screen.getByRole('button', { name: tr('app.recurring.form.save') });
    fireEvent.click(save);
    expect(await screen.findByText(tr('app.recurring.error.description'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.description')), {
      target: { value: 'Gimnasio' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.amount')), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.type')), {
      target: { value: 'EXPENSE' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.category')), {
      target: { value: 'Vivienda' },
    });
    fireEvent.change(screen.getByLabelText(tr('app.recurring.form.frequency')), {
      target: { value: 'quarterly' },
    });
    fireEvent.click(screen.getByLabelText(tr('app.recurring.form.end.withend')));
    const dates = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dates[0], { target: { value: '2026-04-01' } });
    fireEvent.change(dates[1], { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByLabelText(tr('app.recurring.form.end.noend')));
    fireEvent.click(screen.getByLabelText(tr('app.recurring.form.end.withend')));
    fireEvent.click(save);
    await waitFor(() =>
      expect(api.recurringApi.create).toHaveBeenCalledWith({
        description: 'Gimnasio',
        amount: 30,
        type: 'EXPENSE',
        category: 'Vivienda',
        frequency: 'quarterly',
        startYear: 2026,
        startMonth: 4,
        endYear: 2026,
        endMonth: 12,
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: tr('app.recurring.form.save') })).toBeNull()
    );
    expect(api.monthApi.get).toHaveBeenCalledTimes(2);
  });

  it('edits a rule and shows save errors', async () => {
    const { api } = setup();
    api.recurringApi.update.mockRejectedValueOnce(new Error('No permitido'));
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Alquiler` })
    );
    expect(screen.getByText(tr('app.recurring.form.title.edit'))).toBeInTheDocument();
    expect(screen.getByLabelText(tr('app.recurring.form.amount'))).toHaveValue(800);
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
    expect(await screen.findByText('No permitido')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
    await waitFor(() => expect(api.recurringApi.update).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.new') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.cancel') }));
    expect(screen.queryByText(tr('app.recurring.form.title.create'))).toBeNull();
  });

  it('pauses and activates rules, reporting failures', async () => {
    const { api } = setup();
    api.recurringApi.update
      .mockResolvedValueOnce(f.rule({ id: 'r1', active: false }))
      .mockRejectedValueOnce(new Error('Fallo al activar'));
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.pause')}: Alquiler` })
    );
    await waitFor(() =>
      expect(api.recurringApi.update).toHaveBeenCalledWith('r1', { active: false })
    );
    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.recurring.card.activate')}: Nómina` })
    );
    expect(await screen.findByText('Fallo al activar')).toBeInTheDocument();
  });

  it('deletes a rule with the chosen scope', async () => {
    const { api } = setup();
    api.recurringApi.delete.mockRejectedValueOnce(new Error('No se pudo borrar'));
    fireEvent.click(
      await screen.findByRole('button', { name: `${tr('app.recurring.card.delete')}: Alquiler` })
    );
    let dialog = screen.getByRole('dialog', { name: tr('app.recurring.delete.modal.title') });
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.recurring.delete.cancel') })
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: `${tr('app.recurring.card.delete')}: Alquiler` })
    );
    dialog = screen.getByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('radio', { name: tr('app.recurring.delete.scope.all') })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.recurring.delete.confirm') })
    );
    expect(await within(dialog).findByText('No se pudo borrar')).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.recurring.delete.confirm') })
    );
    await waitFor(() => expect(api.recurringApi.delete).toHaveBeenLastCalledWith('r1', 'all'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('Alquiler')).toBeNull();
  });
});
