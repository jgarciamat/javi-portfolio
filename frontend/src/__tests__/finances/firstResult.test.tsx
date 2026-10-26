import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FirstResult } from '@modules/finances/ui/components/FirstResult';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { Dashboard } from '@modules/finances/ui/components/Dashboard';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';

const setup = (onOpenGoals?: () => void) => {
  const api = createFakeApi();
  renderWithProviders(<FirstResult onOpenGoals={onOpenGoals} />, { api });
  return api;
};

describe('FirstResult: where most money went', () => {
  const rows = [
    {
      index: 0,
      status: 'imported' as const,
      date: '2026-03-01',
      description: 'Alquiler',
      amount: 650,
      type: 'EXPENSE' as const,
      categoryName: 'Vivienda',
    },
    {
      index: 1,
      status: 'imported' as const,
      date: '2026-03-04',
      description: 'Bar',
      amount: 50,
      type: 'EXPENSE' as const,
      categoryName: 'Ocio',
    },
  ];
  const categories = [f.category({ id: 'c7', name: 'Vivienda' })];

  it('says the biggest expense and sets a monthly limit for it with one tap', async () => {
    const api = createFakeApi();
    const onOpenBudgets = jest.fn();
    renderWithProviders(
      <FirstResult rows={rows} categories={categories} onOpenBudgets={onOpenBudgets} />,
      { api }
    );
    expect(screen.getByText(/Tu mayor gasto es Vivienda: 650,00\s€, el 93\s?%/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Poner un límite de 650,00\s€ al mes/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Límite de 650,00\s€ al mes en Vivienda guardado/
    );
    expect(api.budgetApi.set).toHaveBeenCalledWith('c7', 650);
    fireEvent.click(screen.getByRole('button', { name: tr('app.firstResult.seeBudgets') }));
    expect(onOpenBudgets).toHaveBeenCalled();
  });

  it('says so when the limit cannot be saved, and offers none for an unknown category', async () => {
    const api = createFakeApi();
    api.budgetApi.set.mockRejectedValue(new Error('Límite del plan'));
    const { unmount } = renderWithProviders(<FirstResult rows={rows} categories={categories} />, {
      api,
    });
    fireEvent.click(screen.getByRole('button', { name: /Poner un límite/ }));
    expect(await screen.findByText('Límite del plan')).toBeVisible();
    unmount();
    renderWithProviders(<FirstResult rows={rows} />, { api });
    expect(screen.getByText(/Tu mayor gasto es Vivienda/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Poner un límite/ })).toBeNull();
    expect(screen.queryByRole('button', { name: tr('app.firstResult.seeBudgets') })).toBeNull();
  });
});

describe('FirstResult', () => {
  it('says how many fixed charges and subscriptions there are and adds them as automatic movements', async () => {
    const api = setup();
    expect(
      await screen.findByText(
        tr('app.firstResult.found', {
          fixed: tr('app.firstResult.fixedOne', { count: 1 }),
          subscriptions: tr('app.firstResult.subscriptionsOne', { count: 1 }),
        })
      )
    ).toBeVisible();
    expect(screen.getByText('Seguro coche')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: tr('app.firstResult.add') }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      tr('app.firstResult.added', { count: 2 })
    );
    expect(api.recurringApi.create.mock.calls.map((c) => c[0])).toEqual([
      {
        description: 'Netflix',
        amount: 13.99,
        type: 'EXPENSE',
        category: 'Ocio',
        startYear: 2026,
        startMonth: 4,
        frequency: 'monthly',
      },
      {
        description: 'Seguro coche',
        amount: 60,
        type: 'EXPENSE',
        category: 'Otros',
        startYear: 2027,
        startMonth: 3,
        frequency: 'yearly',
      },
    ]);
    expect(screen.queryByRole('button', { name: tr('app.firstResult.add') })).toBeNull();
  });

  it('stops at the free limit, says why and only sends the rest when tried again', async () => {
    const api = setup();
    api.recurringApi.create
      .mockResolvedValueOnce(f.rule())
      .mockRejectedValueOnce(new Error('Has llegado al máximo del plan gratuito'));
    fireEvent.click(await screen.findByRole('button', { name: tr('app.firstResult.add') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/máximo del plan gratuito/);
    expect(screen.getByRole('status')).toHaveTextContent(tr('app.firstResult.added', { count: 1 }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.firstResult.add') }));
    await waitFor(() => expect(api.recurringApi.create).toHaveBeenCalledTimes(3));
    expect(api.recurringApi.create.mock.calls[2][0]).toMatchObject({ description: 'Seguro coche' });
  });

  it('counts plurals, tells the free plan it sees only some, and works with an older API', async () => {
    const api = createFakeApi();
    const report = f.subscriptions({ count: 5, locked: true });
    delete report.fixed;
    api.insightsApi.subscriptions.mockResolvedValue(report);
    renderWithProviders(<FirstResult />, { api });
    expect(
      await screen.findByText(
        tr('app.firstResult.found', {
          fixed: tr('app.firstResult.fixedOne', { count: 1 }),
          subscriptions: tr('app.firstResult.subscriptions', { count: 4 }),
        })
      )
    ).toBeVisible();
    expect(screen.getByText(tr('app.firstResult.locked', { shown: 2, count: 5 }))).toBeVisible();
  });

  it('shows nothing when nothing repeats', async () => {
    const api = createFakeApi();
    api.insightsApi.subscriptions.mockResolvedValue(
      f.subscriptions({ subscriptions: [], count: 0, fixed: 0 })
    );
    renderWithProviders(<FirstResult />, { api });
    await waitFor(() => expect(api.insightsApi.subscriptions).toHaveBeenCalled());
    expect(screen.queryByText(tr('app.firstResult.title'))).toBeNull();
  });

  it('links to the goals only when there are goals', async () => {
    const onOpenGoals = jest.fn();
    const api = createFakeApi();
    renderWithProviders(<FirstResult onOpenGoals={onOpenGoals} />, { api });
    await screen.findByText(tr('app.firstResult.title'));
    await waitFor(() => expect(api.goalApi.getAll).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: literal(tr('app.firstResult.goal')) })).toBeNull();

    const withGoal = createFakeApi();
    withGoal.goalApi.getAll.mockResolvedValue([f.goal()]);
    renderWithProviders(<FirstResult onOpenGoals={onOpenGoals} />, { api: withGoal });
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.firstResult.goal')) })
    );
    expect(onOpenGoals).toHaveBeenCalled();
  });

  it('appears after an import that brought movements', async () => {
    const api = createFakeApi();
    api.transactionApi.import.mockResolvedValue({
      dryRun: false,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    renderWithProviders(
      <ImportModal accounts={[f.account()]} onClose={jest.fn()} onImported={jest.fn()} />,
      { api, finances: false }
    );
    fireEvent.click(screen.getByRole('tab', { name: literal(tr('app.import.source.paste')) }));
    fireEvent.change(screen.getByLabelText(tr('app.import.paste.label')), {
      target: { value: '12/03/2026 Bar -3,00 €' },
    });
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.import.paste.read')) }));
    api.transactionApi.import.mockResolvedValueOnce({
      dryRun: true,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.import.preview') }));
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    expect(await screen.findByText(tr('app.firstResult.title'))).toBeVisible();
  });

  it('opens the goals from the importer of the dashboard', async () => {
    const api = createFakeApi();
    api.goalApi.getAll.mockResolvedValue([f.goal()]);
    api.transactionApi.import.mockResolvedValue({
      dryRun: false,
      imported: 1,
      duplicates: 0,
      invalid: 0,
      rows: [],
    });
    renderWithProviders(<Dashboard />, { api, route: '/?importar=1' });
    fireEvent.click(
      await screen.findByRole('tab', { name: literal(tr('app.import.source.paste')) })
    );
    fireEvent.change(screen.getByLabelText(tr('app.import.paste.label')), {
      target: { value: '12/03/2026 Bar -3,00 €' },
    });
    fireEvent.click(screen.getByRole('button', { name: literal(tr('app.import.paste.read')) }));
    fireEvent.click(await screen.findByRole('button', { name: tr('app.import.preview') }));
    fireEvent.click(
      await screen.findByRole('button', { name: tr('app.import.confirm', { count: 1 }) })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: literal(tr('app.firstResult.goal')) })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      await screen.findByRole('heading', { name: new RegExp(tr('app.tabs.goals')) })
    ).toBeVisible();
  });
});
