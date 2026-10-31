import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RecurringRulesTab } from '@modules/finances/ui/components/RecurringRulesTab';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import type { Account } from '@modules/finances/domain/types';
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
  ],
  accounts: Account[] = []
) {
  const api = createFakeApi();
  api.recurringApi.getAll.mockResolvedValue(rules);
  api.accountApi.getAll.mockResolvedValue({ accounts, total: 0 });
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
        accountId: null,
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

  describe('the account of each automatic operation', () => {
    const main = f.account({ id: 'a1', name: 'Principal', isDefault: true });
    const crypto = f.account({ id: 'a2', name: 'Cripto', type: 'crypto', icon: '🪙' });
    const old = f.account({ id: 'a3', name: 'Vieja', archived: true });
    const accounts = [main, crypto, old];
    const rules = [
      f.rule({ id: 'r1', description: 'Alquiler', accountId: null }),
      f.rule({ id: 'r2', description: 'Staking', accountId: 'a2' }),
      f.rule({ id: 'r3', description: 'Seguro', accountId: 'a3' }),
    ];

    const card = async (name: string) =>
      within(
        (
          await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: ${name}` })
        ).closest('.recurring-card') as HTMLElement
      );

    it('shows it on the card, with a warning when it was archived', async () => {
      setup(rules, accounts);
      expect(
        (await card('Alquiler')).getByText(
          tr('app.recurring.card.accountDefault', { name: '🏦 Principal' })
        )
      ).toBeInTheDocument();
      expect(
        (await card('Staking')).getByText(tr('app.recurring.card.account', { name: '🪙 Cripto' }))
      ).toBeInTheDocument();
      const archived = await card('Seguro');
      expect(
        archived.getByText(tr('app.recurring.card.account', { name: '🏦 Principal' }))
      ).toBeInTheDocument();
      expect(archived.getByRole('note')).toHaveTextContent(
        tr('app.recurring.card.accountArchived', { name: 'Vieja', fallback: 'Principal' })
      );
    });

    it('a new one starts in the default account and can go to any active one', async () => {
      const { api } = setup([], accounts);
      await screen.findByText(new RegExp(tr('app.recurring.empty')));
      await waitFor(() => expect(api.accountApi.getAll).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.new') }));
      const select = await screen.findByRole('combobox', {
        name: tr('app.recurring.form.account'),
      });
      expect(select).toHaveValue('a1');
      expect(select).toHaveAccessibleDescription(tr('app.recurring.form.account.hint'));
      // Archived accounts are not offered for a new rule.
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent)
      ).toEqual(['🏦 Principal', '🪙 Cripto']);
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.description')), {
        target: { value: 'Staking' },
      });
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.amount')), {
        target: { value: '10' },
      });
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.category')), {
        target: { value: 'Vivienda' },
      });
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
      await waitFor(() =>
        expect(api.recurringApi.create).toHaveBeenLastCalledWith(
          expect.objectContaining({ accountId: 'a1' })
        )
      );

      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.new') }));
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.description')), {
        target: { value: 'Staking' },
      });
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.amount')), {
        target: { value: '10' },
      });
      fireEvent.change(screen.getByLabelText(tr('app.recurring.form.category')), {
        target: { value: 'Vivienda' },
      });
      fireEvent.change(screen.getByRole('combobox', { name: tr('app.recurring.form.account') }), {
        target: { value: 'a2' },
      });
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
      await waitFor(() =>
        expect(api.recurringApi.create).toHaveBeenLastCalledWith(
          expect.objectContaining({ accountId: 'a2' })
        )
      );
    });

    it('editing keeps the account the rule has, archived or by default, unless changed', async () => {
      const { api } = setup(rules, accounts);
      api.recurringApi.update.mockResolvedValueOnce(rules[2]).mockResolvedValueOnce(rules[0]);
      fireEvent.click(
        await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Seguro` })
      );
      const select = screen.getByRole('combobox', { name: tr('app.recurring.form.account') });
      expect(select).toHaveValue('a3');
      expect(within(select).getByRole('option', { selected: true })).toHaveTextContent(
        `Vieja (${tr('app.recurring.form.account.archived')})`
      );
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
      await waitFor(() =>
        expect(api.recurringApi.update).toHaveBeenLastCalledWith(
          'r3',
          expect.objectContaining({ accountId: 'a3' })
        )
      );

      fireEvent.click(
        await screen.findByRole('button', { name: `${tr('app.recurring.card.edit')}: Alquiler` })
      );
      expect(screen.getByRole('combobox', { name: tr('app.recurring.form.account') })).toHaveValue(
        'a1'
      );
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.form.save') }));
      await waitFor(() =>
        expect(api.recurringApi.update).toHaveBeenLastCalledWith(
          'r1',
          expect.objectContaining({ accountId: null })
        )
      );
    });

    it('without a default account the first one is shown', async () => {
      setup([], [f.account({ id: 'a9', name: 'Única' })]);
      await screen.findByText(new RegExp(tr('app.recurring.empty')));
      fireEvent.click(screen.getByRole('button', { name: tr('app.recurring.new') }));
      expect(
        await screen.findByRole('combobox', { name: tr('app.recurring.form.account') })
      ).toHaveValue('a9');
    });
  });
});
