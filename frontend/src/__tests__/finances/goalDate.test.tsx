import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { track } from '@core/analytics';
import { loadLocale } from '@core/i18n/I18nContext';
import { goalDate, monthsBetween, targetMonth } from '@modules/finances/domain/goalDate';
import { GoalsView } from '@modules/finances/ui/views/GoalsView';
import type { Goal } from '@modules/finances/domain/types';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { formatMoney } from '@shared/utils/format';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@core/analytics', () => ({
  ...jest.requireActual('@core/analytics'),
  track: jest.fn(),
}));

// The example of the design (docs D.2), with made-up figures: 3.000 €, 1.150 € saved, 120 €/month.
const OCTOBER = { year: 2026, month: 10 };
const base = { target: 3000, saved: 1150, monthly: 120, current: OCTOBER, savedThisMonth: 50 };

describe('goalDate', () => {
  it('counts whole months from next month when this one already has a saving', () => {
    expect(goalDate(base)).toEqual({ kind: 'date', months: 16, year: 2028, month: 2 });
    expect(goalDate({ ...base, monthly: 170 })).toMatchObject({ year: 2027, month: 9 });
    expect(goalDate({ ...base, monthly: 162.89 })).toMatchObject({
      months: 12,
      year: 2027,
      month: 10,
    });
    // Nothing saved yet this month: it is the first month.
    expect(goalDate({ ...base, savedThisMonth: 0 })).toMatchObject({ year: 2028, month: 1 });
    // Whole cents: 0,30 € in steps of 0,10 € is 3 months, not 4.
    expect(goalDate({ ...base, target: 0.3, saved: 0, monthly: 0.1 })).toMatchObject({ months: 3 });
  });

  it('tells a goal reached, nothing put aside and more than 50 years', () => {
    expect(goalDate({ ...base, saved: 3000 })).toEqual({ kind: 'done' });
    expect(goalDate({ ...base, monthly: 0 })).toEqual({ kind: 'zero' });
    expect(goalDate({ ...base, monthly: -5 })).toEqual({ kind: 'zero' });
    expect(goalDate({ ...base, monthly: NaN })).toEqual({ kind: 'zero' });
    expect(goalDate({ ...base, monthly: 3 })).toEqual({ kind: 'tooLong' });
    expect(goalDate({ ...base, monthly: 0.001 })).toEqual({ kind: 'tooLong' });
  });

  it('adds a yearly return of 0 to 10 %, never a negative one', () => {
    const plain = goalDate(base);
    const withReturn = goalDate({ ...base, annualRatePct: 5 });
    expect(
      withReturn.kind === 'date' && plain.kind === 'date' && withReturn.months < plain.months
    ).toBe(true);
    expect(goalDate({ ...base, annualRatePct: -20 })).toEqual(plain);
    expect(goalDate({ ...base, annualRatePct: 50 })).toEqual(
      goalDate({ ...base, annualRatePct: 10 })
    );
    expect(goalDate({ ...base, monthly: 0.5, annualRatePct: 1 })).toEqual({ kind: 'tooLong' });
  });

  it('measures months between dates and reads a target date', () => {
    expect(monthsBetween(targetMonth('2027-06-30'), { year: 2028, month: 2 })).toBe(8);
    expect(monthsBetween({ year: 2028, month: 2 }, { year: 2027, month: 6 })).toBe(-8);
  });
});

/** A goal with a real pace (made-up figures). */
const viaje = (progress: Partial<Goal['progress']> = {}, over: Partial<Goal> = {}) =>
  f.goal({
    id: 'g1',
    target: 3000,
    targetDate: '2027-06-30',
    ...over,
    progress: {
      ...f.goal().progress,
      saved: 1150,
      remaining: 1850,
      percentage: 38.3,
      monthlyNeeded: 206,
      averageMonthly: 120,
      historyMonths: 6,
      savedThisMonth: 50,
      ...progress,
    },
  });

function show(goals: Goal[], leaks = f.moneyLeaks()) {
  const api = createFakeApi();
  api.settingsApi.get.mockResolvedValue(
    f.settings({ currentPeriod: { year: 2026, month: 10, start: '2026-10-01', end: '2026-10-31' } })
  );
  api.goalApi.getAll.mockResolvedValue(goals);
  api.insightsApi.moneyLeaks.mockResolvedValue(leaks);
  const onOpenTab = jest.fn();
  renderWithProviders(<GoalsView onOpenTab={onOpenTab} />, { api });
  return { api, onOpenTab };
}

/** Euros as the screen writes them (with a non-breaking space). */
const eur = (amount: number, decimals = false) => formatMoney(amount, 'EUR', 'es', { decimals });
const sheet = () => screen.getByRole('dialog', { name: tr('app.goals.date.sheetTitle') });

beforeEach(() => (track as jest.Mock).mockClear());

describe('La fecha de tu meta', () => {
  it('says the month at the real pace and how late it is for the target date', async () => {
    const { api } = show([viaje()]);
    expect(await screen.findByText('febrero de 2028')).toBeInTheDocument();
    expect(screen.getByText(tr('app.goals.date.atPace', { amount: '120 €' }))).toBeInTheDocument();
    expect(
      screen.getByText(
        tr('app.goals.date.late', { date: 'junio de 2027', count: 8, amount: '206 €' })
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Calculado con solo/)).toBeNull();
    expect(api.insightsApi.moneyLeaks).toHaveBeenCalledWith('goal');
    await waitFor(() => expect(track).toHaveBeenCalledWith('goal_date_view', { detail: 'real' }));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('says early, one month late or just in time, and when the pace has few months', async () => {
    show([
      viaje({ averageMonthly: 400, historyMonths: 2 }, { id: 'a', name: 'Pronto' }),
      viaje({ averageMonthly: 1850 / 9 }, { id: 'b', name: 'Justo', targetDate: '2027-07-01' }),
      viaje(
        { averageMonthly: 1850 / 10 },
        { id: 'c', name: 'Uno tarde', targetDate: '2027-07-01' }
      ),
      viaje({ averageMonthly: 1850 / 8 }, { id: 'd', name: 'Uno antes', targetDate: '2027-07-01' }),
      viaje({ averageMonthly: 200 }, { id: 'e', name: 'Sin fecha', targetDate: null }),
    ]);
    expect(await screen.findByText(tr('app.goals.date.early', { count: 3 }))).toBeInTheDocument();
    expect(screen.getByText(tr('app.goals.date.fewMonths', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText(tr('app.goals.date.onTime'))).toBeInTheDocument();
    expect(screen.getByText(/llegas 1 mes tarde/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.goals.date.earlyOne'))).toBeInTheDocument();
  });

  it('asks how much when there is no pace yet, and can change it', async () => {
    show([viaje({ averageMonthly: null, historyMonths: 0 }, { targetDate: null })]);
    const input = await screen.findByRole('spinbutton', { name: tr('app.goals.date.askPace') });
    await waitFor(() => expect(track).toHaveBeenCalledWith('goal_date_view', { detail: 'asked' }));
    fireEvent.change(input, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.date.calc') }));
    expect(
      screen.getByText(tr('app.goals.date.atAmount', { amount: '120 €' }))
    ).toBeInTheDocument();
    expect(screen.getByText('febrero de 2028')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.date.change') }));
    fireEvent.change(screen.getByRole('spinbutton', { name: tr('app.goals.date.askPace') }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: tr('app.goals.date.calc') }));
    expect(screen.getByText(tr('app.goals.date.zero'))).toBeInTheDocument();
  });

  it('says more than 50 years, and nothing for reached or archived goals', async () => {
    show([
      viaje({ averageMonthly: 2 }),
      viaje({ completed: true }, { id: 'done', name: 'Hecha' }),
      viaje({}, { id: 'old', name: 'Archivada', archived: true }),
    ]);
    expect(await screen.findByText(tr('app.goals.date.tooLong'))).toBeInTheDocument();
    expect(screen.getAllByText(tr('app.goals.date.whatIf'), { exact: false })).toHaveLength(1);
  });

  it('says the goal is reached when the saving already covers it', async () => {
    show([viaje({ saved: 3000, completed: false })]);
    expect(await screen.findAllByText(tr('app.goals.completed'))).not.toHaveLength(0);
  });

  it('counts a screen of reached goals as «done» and nothing without goals', async () => {
    show([viaje({ completed: true })]);
    await waitFor(() => expect(track).toHaveBeenCalledWith('goal_date_view', { detail: 'done' }));
    (track as jest.Mock).mockClear();
    show([]);
    await screen.findAllByText(tr('app.goals.empty'));
    expect(track).not.toHaveBeenCalledWith('goal_date_view', expect.anything());
  });

  it('tries «what if I put aside more?» with chips, the slider, −10 / +10 and typing', async () => {
    show([viaje()]);
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    const dialog = sheet();
    const slider = within(dialog).getByRole('slider');
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      tr('app.goals.date.extra', { amount: eur(0) })
    );
    expect(
      within(dialog).getByText(tr('app.goals.date.result', { date: 'febrero de 2028' }))
    ).toBeVisible();

    fireEvent.click(within(dialog).getByRole('button', { name: `+${eur(50)}` }));
    expect(track).toHaveBeenCalledWith('goal_sim_change', { detail: 'chip' });
    expect(within(dialog).getByRole('button', { name: `+${eur(50)}` })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(dialog).getByText(tr('app.goals.date.result', { date: 'septiembre de 2027' }))
    ).toBeVisible();
    expect(within(dialog).getByText(tr('app.goals.date.soonerOther', { count: 5 }))).toBeVisible();
    expect(
      within(dialog).getByText(
        tr('app.goals.date.spoken', {
          extra: tr('app.goals.date.extra', { amount: '50 €' }),
          date: 'septiembre de 2027',
        })
      )
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.goals.date.plus', { amount: eur(10) }) })
    );
    expect(slider).toHaveValue('60');
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.goals.date.minus', { amount: eur(10) }) })
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.goals.date.minus', { amount: eur(10) }) })
    );
    expect(slider).toHaveValue('40');
    fireEvent.change(slider, { target: { value: '0' } });
    fireEvent.click(
      within(dialog).getByRole('button', { name: tr('app.goals.date.minus', { amount: eur(10) }) })
    );
    expect(slider).toHaveValue('0');
    // Only the first change of each opening is counted.
    expect((track as jest.Mock).mock.calls.filter(([e]) => e === 'goal_sim_change')).toHaveLength(
      1
    );

    // A month sooner, typed by hand.
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: tr('app.goals.date.monthly') }),
      {
        target: { value: '124' },
      }
    );
    expect(within(dialog).getByText(tr('app.goals.date.soonerOne'), { exact: false })).toBeTruthy();
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: tr('app.goals.date.monthly') }),
      {
        target: { value: '' },
      }
    );
    expect(within(dialog).getAllByText(tr('app.goals.date.zero')).length).toBeGreaterThan(0);

    fireEvent.click(within(dialog).getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('counts typing as the first change, and adds an estimated return with its warning', async () => {
    show([viaje()]);
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    const dialog = sheet();
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: tr('app.goals.date.monthly') }),
      {
        target: { value: '130' },
      }
    );
    expect(track).toHaveBeenCalledWith('goal_sim_change', { detail: 'input' });
    fireEvent.change(within(dialog).getByRole('slider'), { target: { value: '30' } });
    expect((track as jest.Mock).mock.calls.filter(([e]) => e === 'goal_sim_change')).toHaveLength(
      1
    );

    const toggle = within(dialog).getByRole('button', { name: /Añadir rentabilidad estimada/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByText(tr('tools.goal.disclaimer'))).toBeVisible();
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: tr('app.goals.date.rateLabel') }),
      {
        target: { value: '8' },
      }
    );
    expect(within(dialog).getByText(tr('app.goals.date.disclaimer'))).toBeVisible();
    fireEvent.click(toggle);
    expect(within(dialog).queryByText(tr('tools.goal.disclaimer'))).toBeNull();
  });

  it('uses only what the user decided to cancel, and points to the rest', async () => {
    show(
      [viaje()],
      f.moneyLeaks({ reviewed: { count: 2, cancelMonthly: 39.9, recoveredAnnual: 35.88 } })
    );
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    const apply = await within(sheet()).findByRole('button', {
      name: tr('app.goals.date.useLeaks', { amount: eur(42.89, true) }),
    });
    fireEvent.click(apply);
    expect(track).toHaveBeenCalledWith('goal_dp_apply');
    expect(
      within(sheet()).getByText(tr('app.goals.date.result', { date: 'octubre de 2027' }))
    ).toBeVisible();
    expect(within(sheet()).getByText(tr('app.goals.date.soonerOther', { count: 4 }))).toBeVisible();
  });

  it('only hints at what is still to check, with the way there', async () => {
    const { onOpenTab } = show(
      [viaje()],
      f.moneyLeaks({ total: { annual: 870, oneOff: 0, count: 5 } })
    );
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    expect(
      await within(sheet()).findByText(tr('app.goals.date.leaksHint', { amount: '72 €' }), {
        exact: false,
      })
    ).toBeVisible();
    fireEvent.click(within(sheet()).getByRole('button', { name: tr('app.leaks.analysisCta') }));
    expect(onOpenTab).toHaveBeenCalledWith('leaks');
  });

  it('says nothing about «Tu dinero perdido» when there is nothing or it fails', async () => {
    const api = createFakeApi();
    api.goalApi.getAll.mockResolvedValue([viaje()]);
    api.insightsApi.moneyLeaks.mockRejectedValue(new Error('caída'));
    renderWithProviders(<GoalsView onOpenTab={jest.fn()} />, { api });
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    expect(within(sheet()).queryByText(/Tu dinero perdido/)).toBeNull();
    cleanup();
    show([viaje()], f.moneyLeaks({ total: { annual: 0, oneOff: 0, count: 0 } }));
    fireEvent.click(await screen.findByRole('button', { name: /¿Y si aparto más\?/ }));
    expect(within(sheet()).queryByText(/Tu dinero perdido/)).toBeNull();
  });

  it('works before the settings arrive, with this calendar month', async () => {
    const api = createFakeApi();
    api.settingsApi.get.mockReturnValue(new Promise(() => undefined));
    api.goalApi.getAll.mockResolvedValue([viaje({ savedThisMonth: 0 })]);
    renderWithProviders(<GoalsView onOpenTab={jest.fn()} />, { api });
    expect(
      await screen.findByText(tr('app.goals.date.atPace', { amount: '120 €' }))
    ).toBeInTheDocument();
  });

  it('speaks English', async () => {
    await loadLocale('en');
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(
      f.settings({
        locale: 'en',
        currentPeriod: { year: 2026, month: 10, start: '2026-10-01', end: '2026-10-31' },
      })
    );
    api.goalApi.getAll.mockResolvedValue([viaje()]);
    renderWithProviders(<GoalsView onOpenTab={jest.fn()} />, { api, locale: 'en' });
    expect(await screen.findByText('February 2028')).toBeInTheDocument();
  });
});
