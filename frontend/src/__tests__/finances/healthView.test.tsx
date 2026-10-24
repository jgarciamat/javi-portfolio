import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HealthView } from '@modules/finances/ui/views/HealthView';
import { useFinances } from '@modules/finances/application/FinancesContext';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

beforeEach(() => {
  localStorage.clear();
  freezeTime('2026-03-15T12:00:00');
});
afterEach(restoreTime);

interface Options {
  overview?: Partial<Parameters<typeof f.overview>[0]>;
  previous?: ReturnType<typeof f.overview>;
  assets?: ReturnType<typeof f.asset>[] | Error;
  accounts?: ReturnType<typeof f.account>[];
}

function setup(o: Options = {}) {
  const api = createFakeApi();
  api.monthApi.get.mockImplementation((_y: number, month: number) =>
    Promise.resolve(month === 2 && o.previous ? o.previous : f.overview(o.overview))
  );
  if (o.assets instanceof Error) api.assetApi.getAll.mockRejectedValue(o.assets);
  else api.assetApi.getAll.mockResolvedValue(o.assets ?? []);
  api.accountApi.getAll.mockResolvedValue({
    accounts: o.accounts ?? [f.account({ balance: 6000 })],
    total: 6000,
  });
  renderWithProviders(<HealthView />, { api });
  return api;
}

describe('Financial health', () => {
  it('shows the score, its level and every pillar', async () => {
    setup({
      overview: {
        summary: f.summary({ totalIncome: 2000, totalSaving: 400, totalExpenses: 1000 }),
        budgets: [f.budgetLine({ level: 'ok' })],
      },
    });
    expect(await screen.findByText(tr('app.health.level.excellent'))).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: tr('app.health.score', { score: 100 }) })
    ).toBeInTheDocument();
    for (const id of ['saving', 'cushion', 'debt', 'budgets']) {
      expect(screen.getByText(tr(`app.health.pillar.${id}`))).toBeInTheDocument();
    }
    expect(screen.getByText(/Ahorras el 20%/)).toBeInTheDocument();
    expect(screen.getByText(/cubre 6 meses de gastos/)).toBeInTheDocument();
  });

  it('sizes the cushion with what was spent the month before', async () => {
    setup({
      overview: { summary: f.summary({ totalIncome: 2000, totalSaving: 0, totalExpenses: 50 }) },
      previous: f.overview({ summary: f.summary({ totalExpenses: 3000 }) }),
    });
    expect(await screen.findByText(/cubre 2 meses de gastos/)).toBeInTheDocument();
  });

  it('counts the debts when they are known and says so when they are not', async () => {
    setup({
      overview: { summary: f.summary({ totalIncome: 1000, totalSaving: 0, totalExpenses: 500 }) },
      assets: [f.asset({ kind: 'debt', value: 12000 }), f.asset({ kind: 'investment', value: 99 })],
    });
    expect(await screen.findByText(/Tus deudas son el 100%/)).toBeInTheDocument();
    expect(screen.queryByText(tr('app.health.noDebts'))).toBeNull();
  });

  it('leaves the debts out without Premium and suggests setting budgets', async () => {
    setup({ assets: new Error('Premium'), overview: { budgets: [] } });
    expect(await screen.findByText(tr('app.health.noDebts'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.health.noBudgets'))).toBeInTheDocument();
    expect(screen.queryByText(tr('app.health.pillar.debt'))).toBeNull();
  });
});

describe('Monthly challenges', () => {
  const challengeCard = async () =>
    within((await screen.findByText(tr('app.challenge.title'))).closest('.card') as HTMLElement);

  it('lists the three challenges with nothing chosen', async () => {
    setup({ overview: { budgets: [f.budgetLine()] } });
    const card = await challengeCard();
    expect(card.getAllByRole('button', { name: tr('app.challenge.choose') })).toHaveLength(3);
    expect(card.queryByText(tr('app.challenge.doneBadge'))).toBeNull();
    expect(card.queryByRole('progressbar')).toBeNull();
  });

  it('follows a challenge in progress and lets you change it', async () => {
    setup({
      overview: {
        transactions: [f.transaction({ date: '2026-03-14', type: 'EXPENSE' })],
        budgets: [f.budgetLine()],
      },
    });
    const card = await challengeCard();
    fireEvent.click(card.getAllByRole('button', { name: tr('app.challenge.choose') })[1]);
    expect(card.getByText(tr('app.challenge.inProgress'))).toBeInTheDocument();
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    fireEvent.click(card.getByRole('button', { name: tr('app.challenge.change') }));
    expect(localStorage.getItem('mm_challenge')).toBeNull();
    expect(card.getAllByRole('button', { name: tr('app.challenge.choose') })).toHaveLength(3);
  });

  it('keeps a completed challenge completed and caps the counter at the target', async () => {
    setup({
      overview: {
        transactions: [f.transaction({ date: '2026-03-14', type: 'EXPENSE' })],
        budgets: [f.budgetLine()],
      },
    });
    const card = await challengeCard();
    fireEvent.click(card.getAllByRole('button', { name: tr('app.challenge.choose') })[0]);
    expect(card.getByText('8 de 8')).toBeInTheDocument();
    expect(card.getByText(tr('app.challenge.done'))).toBeInTheDocument();
    expect(card.getByText(/Racha actual: 1 días/)).toBeInTheDocument();
    expect(card.getByText(tr('app.challenge.doneBadge'))).toBeInTheDocument();
    expect(card.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '100%' });
    expect(card.queryByRole('button', { name: tr('app.challenge.change') })).toBeNull();
    expect(card.getAllByRole('button', { name: tr('app.challenge.choose') })).toHaveLength(2);
    expect(JSON.parse(localStorage.getItem('mm_challenge_done') as string)).toEqual({
      period: '2026-3',
      ids: ['noSpend'],
    });
    // Choosing another one leaves the first marked as completed.
    fireEvent.click(card.getAllByRole('button', { name: tr('app.challenge.choose') })[0]);
    expect(card.getByText(tr('app.challenge.doneBadge'))).toBeInTheDocument();
    expect(card.getByText(tr('app.challenge.inProgress'))).toBeInTheDocument();
    expect(card.queryByText(tr('app.challenge.done'))).toBeNull();
  });

  it('remembers a completed challenge in a later visit', async () => {
    localStorage.setItem(
      'mm_challenge_done',
      JSON.stringify({ period: '2026-3', ids: ['noSpend'] })
    );
    setup({ overview: { budgets: [f.budgetLine()] } });
    const card = await challengeCard();
    expect(card.getByText(tr('app.challenge.doneBadge'))).toBeInTheDocument();
    expect(card.getAllByRole('button', { name: tr('app.challenge.choose') })).toHaveLength(2);
  });

  it('says so when all three are completed', async () => {
    localStorage.setItem(
      'mm_challenge_done',
      JSON.stringify({ period: '2026-3', ids: ['noSpend', 'save20', 'budgets'] })
    );
    setup({ overview: { budgets: [] } });
    const card = await challengeCard();
    expect(card.getAllByText(tr('app.challenge.doneBadge'))).toHaveLength(3);
    expect(card.getByText(tr('app.challenge.allDone'))).toBeInTheDocument();
    expect(card.queryByRole('button')).toBeNull();
    expect(card.queryByText(tr('app.challenge.noBudgets'))).toBeNull();
  });

  it('forgets the completed challenges of another month', async () => {
    localStorage.setItem(
      'mm_challenge_done',
      JSON.stringify({ period: '2026-2', ids: ['noSpend'] })
    );
    setup({ overview: { budgets: [f.budgetLine()] } });
    const card = await challengeCard();
    expect(card.queryByText(tr('app.challenge.doneBadge'))).toBeNull();
  });

  it('tracks the budgets challenge and keeps it for the month', async () => {
    localStorage.setItem('mm_challenge', JSON.stringify({ id: 'budgets', period: '2026-3' }));
    setup({ overview: { budgets: [f.budgetLine({ level: 'ok' })] } });
    const card = await challengeCard();
    expect(card.getByText(tr('app.challenge.budgets'))).toBeInTheDocument();
    expect(card.getByText(/1 de 1/)).toBeInTheDocument();
    expect(card.queryByText(/Racha actual/)).toBeNull();
  });

  it('forgets the challenge of another month and needs budgets for the budgets challenge', async () => {
    localStorage.setItem('mm_challenge', JSON.stringify({ id: 'save20', period: '2026-2' }));
    setup({ overview: { budgets: [] } });
    const card = await challengeCard();
    const buttons = card.getAllByRole('button', { name: tr('app.challenge.choose') });
    expect(buttons[2]).toBeDisabled();
    expect(card.getByText(tr('app.challenge.noBudgets'))).toBeInTheDocument();
  });

  it('only works in the current month', async () => {
    const api = createFakeApi();
    api.monthApi.get.mockResolvedValue(f.overview());
    api.assetApi.getAll.mockResolvedValue([]);
    const Back = () => <button onClick={useFinances().goToPrev}>atrás</button>;
    renderWithProviders(
      <>
        <Back />
        <HealthView />
      </>,
      { api }
    );
    await screen.findByText(tr('app.health.title'));
    fireEvent.click(screen.getByRole('button', { name: 'atrás' }));
    expect(await screen.findByText(tr('app.challenge.currentOnly'))).toBeInTheDocument();
  });

  it('looks at December for the month before January', async () => {
    freezeTime('2026-01-15T12:00:00');
    const api = setup({ overview: { year: 2026, month: 1, start: '2026-01-01' } });
    await waitFor(() => expect(api.monthApi.get).toHaveBeenCalledWith(2025, 12));
  });

  it("falls back to this month's expenses when the month before has none", async () => {
    setup({
      overview: { summary: f.summary({ totalIncome: 2000, totalSaving: 0, totalExpenses: 3000 }) },
      previous: f.overview({ summary: f.summary({ totalExpenses: 0 }) }),
    });
    expect(await screen.findByText(/cubre 2 meses de gastos/)).toBeInTheDocument();
  });

  it('has a zero-length progress bar for a challenge with no target yet', async () => {
    localStorage.setItem('mm_challenge', JSON.stringify({ id: 'budgets', period: '2026-3' }));
    setup({ overview: { budgets: [] } });
    const card = await challengeCard();
    expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
