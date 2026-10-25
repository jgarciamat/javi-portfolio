import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { track } from '@core/analytics';
import { loadLocale } from '@core/i18n/I18nContext';
import { MoneyLeaksView, UNDO_MS } from '@modules/finances/ui/views/MoneyLeaksView';
import type { LeakFinding, MoneyLeaks } from '@modules/finances/domain/types';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { formatMoney } from '@shared/utils/format';
import { renderWithProviders, tr } from '@test-utils/render';

jest.mock('@core/analytics', () => ({
  ...jest.requireActual('@core/analytics'),
  track: jest.fn(),
}));

// Every merchant and amount below is made up.
/** Whole euros as the screen writes them (with a non-breaking space). */
const eur = (amount: number) => formatMoney(amount, 'EUR', 'es', { decimals: false });
const leaks = (over: Partial<MoneyLeaks> = {}) => f.moneyLeaks(over);
const fitbox = f.leakFinding({ id: 'a000000000000001' });
const rise = f.leakFinding({
  id: 'a000000000000002',
  kind: 'increase',
  confidence: 'medium',
  label: 'SEGUROS HOGAR ALFA',
  essential: true,
  cadence: 'yearly',
  amount: 214,
  previousAmount: 186,
  annual: 28,
  count: 2,
  firstDate: '2025-10-01',
  lastDate: '2026-10-01',
  nextDate: '2027-10-01',
});
const double = f.leakFinding({
  id: 'a000000000000003',
  kind: 'duplicate',
  label: 'ELECTRO MARKET',
  cadence: null,
  amount: 89,
  annual: 0,
  oneOff: 89,
  count: 2,
  firstDate: '2026-09-12',
  lastDate: '2026-09-12',
  nextDate: null,
});
const coffee = f.leakFinding({
  id: 'a000000000000004',
  kind: 'small',
  label: 'CAFETERÍA LA PLAZA',
  cadence: null,
  amount: 1.8,
  annual: 160,
  count: 22,
  perMonth: 7,
  nextDate: null,
});
const all = leaks({
  total: { annual: 660, oneOff: 89, count: 3 },
  byKind: {
    recurring: { count: 1, annual: 478.8 },
    increase: { count: 1, annual: 28 },
    duplicate: { count: 1, annual: 0 },
    small: { count: 1, annual: 160 },
  },
  findings: [fitbox, coffee, double, rise],
  count: 4,
});

function show(data: MoneyLeaks | Error, options: { api?: FakeApi; plan?: boolean } = {}) {
  const api = options.api ?? createFakeApi();
  if (data instanceof Error) api.insightsApi.moneyLeaks.mockRejectedValue(data);
  else api.insightsApi.moneyLeaks.mockResolvedValue(data);
  const onImport = jest.fn();
  const onOpenTab = jest.fn();
  const view = renderWithProviders(<MoneyLeaksView onImport={onImport} onOpenTab={onOpenTab} />, {
    api,
    plan: options.plan,
  });
  return { ...view, api, onImport, onOpenTab };
}

const card = (label: string) =>
  screen.getByRole('article', { name: new RegExp(`^${label}`) }) as HTMLElement;

beforeEach(() => {
  (track as jest.Mock).mockClear();
});

describe('Tu dinero perdido', () => {
  it('shows an outline while it checks, then the figure and each finding', async () => {
    show(all);
    const loading = screen.getByRole('status');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(within(loading).getByText(tr('app.leaks.loading'))).toBeInTheDocument();
    expect(
      await screen.findByRole('region', {
        name: tr('app.leaks.headline', { amount: eur(660) }),
      })
    ).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.headlineFigure', { amount: '660 €' }))).toBeVisible();
    expect(screen.getByText(tr('app.leaks.countOther', { count: 3 }))).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.oneOff', { amount: '89 €' }))).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('dp_view', { detail: 'complete' });

    // A repeating charge: since when, what it costs, «if you cancelled it».
    const gym = card('FITBOX');
    expect(gym).toHaveAccessibleName(
      tr('app.leaks.aria.yearly', {
        label: 'FITBOX',
        kind: tr('app.leaks.tag.recurring'),
        amount: eur(478),
      })
    );
    expect(
      within(gym).getByText(/Se cobra cada mes desde agosto de 2025 \(15 cobros\)/)
    ).toBeVisible();
    expect(within(gym).getByText(/39,90 € al mes · unos 478 € al año/)).toBeVisible();
    expect(within(gym).getByText(/hacia el 2 de noviembre/)).toBeVisible();
    expect(
      within(gym).getByText(tr('app.leaks.ifCancel', { annual: '478 €' }))
    ).toBeInTheDocument();

    // A rise of an essential, «check this is right».
    const insurance = card('SEGUROS HOGAR ALFA');
    expect(within(insurance).getByText(tr('app.leaks.medium'))).toBeVisible();
    expect(within(insurance).getByText(/Subió de 186,00 € a 214,00 €/)).toBeVisible();
    expect(
      within(insurance).getByText(tr('app.leaks.increase.impact', { amount: '28 €' }))
    ).toBeVisible();
    expect(within(insurance).getByText(tr('app.leaks.essential'))).toBeVisible();

    // A possible double charge and small spending.
    const shop = card('ELECTRO MARKET');
    expect(within(shop).getByText(/89,00 € cobrados dos veces el 12 de septiembre/)).toBeVisible();
    const cafe = card('CAFETERÍA LA PLAZA');
    expect(within(cafe).getByText(/Unos 7 gastos al mes de menos de 12 €/)).toBeVisible();
    expect(within(cafe).getByText(tr('app.leaks.small.half', { amount: '80 €' }))).toBeVisible();
    expect(screen.getByText(tr('app.leaks.disclaimer'))).toBeInTheDocument();
  });

  it('filters by kind and opens the charges behind a finding', async () => {
    show(all);
    const filters = await screen.findByRole('group', { name: tr('app.leaks.filter') });
    fireEvent.click(within(filters).getByRole('button', { name: /Subidas de precio/ }));
    expect(within(filters).getByRole('button', { name: /Subidas de precio/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(within(filters).getByRole('button', { name: /Todo/ }));
    expect(screen.getAllByRole('article')).toHaveLength(4);

    const gym = card('FITBOX');
    fireEvent.click(
      within(gym).getByRole('button', { name: tr('app.leaks.evidence', { count: 15 }) })
    );
    const table = within(gym).getByRole('table', {
      name: tr('app.leaks.evidenceTitle', { label: 'FITBOX' }),
    });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(within(gym).getByRole('button', { name: tr('app.leaks.evidenceHide') }));
    expect(within(gym).queryByRole('table')).toBeNull();
  });

  it('saves a decision, tells how to cancel and can undo it for 8 seconds', async () => {
    const { api } = show(all);
    const gym = await screen.findByRole('article', { name: /^FITBOX/ });
    api.insightsApi.moneyLeaks.mockResolvedValue(
      leaks({
        findings: [{ ...fitbox, status: 'cancel' }],
        count: 0,
        total: { annual: 0, oneOff: 0, count: 0 },
        reviewed: { count: 1, cancelMonthly: 39.9, recoveredAnnual: 0 },
      })
    );
    fireEvent.click(within(gym).getByRole('button', { name: tr('app.leaks.action.cancel') }));
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenCalledWith(fitbox.id, 'cancel')
    );
    expect(await screen.findByText(tr('app.leaks.done'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.cancel.help'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.empty'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.toCancel', { amount: '39 €' }))).toBeInTheDocument();

    // The reviewed list: what was decided, with the help, and the way back.
    fireEvent.click(screen.getByRole('button', { name: /Revisados \(1\)/ }));
    const reviewed = card('FITBOX');
    expect(within(reviewed).getByText(tr('app.leaks.status.cancel'))).toBeVisible();
    expect(within(reviewed).getByText(tr('app.leaks.cancel.help'))).toBeVisible();

    api.insightsApi.moneyLeaks.mockResolvedValue(all);
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.undoButton') }));
    await waitFor(() => expect(api.insightsApi.undoLeak).toHaveBeenCalledWith(fitbox.id));
    expect(await screen.findAllByRole('article')).toHaveLength(4);
    expect(screen.queryByText(tr('app.leaks.done'), { exact: false })).toBeNull();
  });

  it('hides the undo notice after 8 seconds and changes its mind from the list', async () => {
    jest.useFakeTimers();
    try {
      const reviewedOnes: LeakFinding[] = [
        { ...double, status: 'not_mine' },
        { ...coffee, status: 'keep' },
        { ...rise, status: 'dismissed' },
        { ...fitbox, status: 'recovered' },
        { ...fitbox, id: 'a000000000000009', label: 'NUBE', status: 'keep' },
        { ...double, id: 'a00000000000000a', label: 'LIBROS', status: 'cancel' },
        { ...double, id: 'a00000000000000b', label: 'TIENDA', status: 'refunded' },
      ];
      const { api } = show(all);
      const shop = await screen.findByRole('article', { name: /^ELECTRO MARKET/ });
      api.insightsApi.moneyLeaks.mockResolvedValue(
        leaks({
          findings: reviewedOnes,
          count: 0,
          total: { annual: 0, oneOff: 0, count: 0 },
          reviewed: { count: 7, cancelMonthly: 0, recoveredAnnual: 478.8 },
        })
      );
      fireEvent.click(
        within(shop).getByRole('button', { name: `${tr('app.leaks.action.more')} ▾` })
      );
      fireEvent.click(within(shop).getByRole('button', { name: tr('app.leaks.action.notMine') }));
      await waitFor(() =>
        expect(api.insightsApi.decideLeak).toHaveBeenCalledWith(double.id, 'not_mine')
      );
      expect(await screen.findByText(tr('app.leaks.notMine.help'), { exact: false })).toBeVisible();
      act(() => {
        jest.advanceTimersByTime(UNDO_MS);
      });
      expect(screen.queryByRole('button', { name: tr('app.leaks.undoButton') })).toBeNull();
      expect(
        screen.getByText(tr('app.leaks.recoveredTotal', { amount: '478 €' }))
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Revisados \(7\)/ }));
      expect(
        within(card('ELECTRO MARKET')).getByText(tr('app.leaks.status.not_mine'))
      ).toBeVisible();
      expect(
        within(card('CAFETERÍA LA PLAZA')).getByText(tr('app.leaks.status.seen'))
      ).toBeVisible();
      expect(
        within(card('SEGUROS HOGAR ALFA')).getByText(tr('app.leaks.status.dismissed'))
      ).toBeVisible();
      expect(within(card('NUBE')).getByText(tr('app.leaks.status.keep'))).toBeVisible();
      expect(within(card('LIBROS')).getByText(tr('app.leaks.status.claim'))).toBeVisible();
      expect(within(card('TIENDA')).getByText(tr('app.leaks.status.refunded'))).toBeVisible();
      expect(
        within(card('FITBOX')).getByText(tr('app.leaks.recovered', { amount: '478 €' }))
      ).toBeVisible();
      // No way back from «no longer charged» nor «refunded».
      expect(within(card('FITBOX')).queryByRole('button')).toBeNull();
      expect(within(card('TIENDA')).queryByRole('button')).toBeNull();

      fireEvent.click(
        within(card('NUBE')).getByRole('button', { name: tr('app.leaks.changeMind') })
      );
      await waitFor(() =>
        expect(api.insightsApi.undoLeak).toHaveBeenCalledWith('a000000000000009')
      );
      fireEvent.click(screen.getByRole('button', { name: /Revisados \(7\)/ }));
      expect(screen.queryByRole('article')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers the buttons of each kind', async () => {
    const { api } = show(all);
    const insurance = await screen.findByRole('article', { name: /^SEGUROS HOGAR ALFA/ });
    fireEvent.click(within(insurance).getByRole('button', { name: tr('app.leaks.action.seen') }));
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(rise.id, 'keep')
    );
    fireEvent.click(within(insurance).getByRole('button', { name: /Más opciones/ }));
    fireEvent.click(
      within(insurance).getByRole('button', { name: tr('app.leaks.action.dismissIncrease') })
    );
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(rise.id, 'dismissed')
    );
    fireEvent.click(within(insurance).getByRole('button', { name: /Más opciones/ }));
    expect(
      within(insurance).queryByRole('button', { name: tr('app.leaks.action.notMine') })
    ).toBeNull();

    const shop = card('ELECTRO MARKET');
    fireEvent.click(within(shop).getByRole('button', { name: tr('app.leaks.action.claim') }));
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(double.id, 'cancel')
    );
    fireEvent.click(
      within(shop).getByRole('button', { name: tr('app.leaks.action.dismissDuplicate') })
    );
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(double.id, 'dismissed')
    );
    const cafe = card('CAFETERÍA LA PLAZA');
    expect(within(cafe).queryByRole('button', { name: /Más opciones/ })).toBeNull();
    fireEvent.click(
      within(cafe).getByRole('button', { name: tr('app.leaks.action.dismissSmall') })
    );
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(coffee.id, 'dismissed')
    );
    const gym = card('FITBOX');
    fireEvent.click(within(gym).getByRole('button', { name: tr('app.leaks.action.keep') }));
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(fitbox.id, 'keep')
    );
    await waitFor(() =>
      expect(within(gym).getByRole('button', { name: tr('app.leaks.action.keep') })).toBeEnabled()
    );
    fireEvent.click(within(gym).getByRole('button', { name: /Más opciones/ }));
    fireEvent.click(within(gym).getByRole('button', { name: tr('app.leaks.action.dismiss') }));
    await waitFor(() =>
      expect(api.insightsApi.decideLeak).toHaveBeenLastCalledWith(fitbox.id, 'dismissed')
    );
  });

  it('keeps what it showed when a decision or a reload fails', async () => {
    const { api } = show(all);
    const gym = await screen.findByRole('article', { name: /^FITBOX/ });
    api.insightsApi.decideLeak.mockRejectedValueOnce(new Error('Sin servidor'));
    fireEvent.click(within(gym).getByRole('button', { name: tr('app.leaks.action.keep') }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin servidor');
    expect(card('FITBOX')).toBeInTheDocument();
    api.insightsApi.decideLeak.mockRejectedValueOnce({});
    fireEvent.click(
      within(card('FITBOX')).getByRole('button', { name: tr('app.leaks.action.keep') })
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(tr('app.leaks.error')));

    api.insightsApi.moneyLeaks.mockRejectedValueOnce(new Error('caída'));
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.retry') }));
    await waitFor(() => expect(api.insightsApi.moneyLeaks).toHaveBeenCalledTimes(2));
    expect(card('FITBOX')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.leaks.error'));
  });

  it('says it could not check and tries again', async () => {
    const { api } = show(new Error('caída'));
    expect(await screen.findByRole('alert')).toHaveTextContent(tr('app.leaks.error'));
    api.insightsApi.moneyLeaks.mockResolvedValue(all);
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.retry') }));
    expect(await screen.findByRole('article', { name: /^FITBOX/ })).toBeInTheDocument();
  });

  it('waits for the connection to decide', async () => {
    const onLine = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      show(all);
      const gym = await screen.findByRole('article', { name: /^FITBOX/ });
      expect(screen.getByText(tr('app.leaks.offline'))).toBeInTheDocument();
      expect(within(gym).getByRole('button', { name: tr('app.leaks.action.keep') })).toBeDisabled();
    } finally {
      onLine.mockRestore();
    }
  });

  it('without movements: what it looks for, the import and the video', async () => {
    const { onImport, onOpenTab } = show(
      leaks({
        coverage: {
          level: 'none',
          from: null,
          to: null,
          days: 0,
          movements: 0,
          yearlyReady: false,
        },
        total: { annual: 0, oneOff: 0, count: 0 },
        findings: [],
        count: 0,
      })
    );
    expect(await screen.findByRole('heading', { name: tr('app.leaks.none.title') })).toBeVisible();
    expect(track).toHaveBeenCalledWith('dp_view', { detail: 'none' });
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.none.cta') }));
    expect(onImport).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('dp_import_cta', { detail: 'none' });
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.none.howTo') }));
    expect(onOpenTab).toHaveBeenCalledWith('videos');
  });

  it('with few movements: how far it is and what is found already', async () => {
    const { onImport } = show(
      leaks({
        coverage: {
          level: 'partial',
          from: '2026-09-10',
          to: '2026-10-20',
          days: 41,
          movements: 20,
          yearlyReady: false,
        },
        total: { annual: 0, oneOff: 89, count: 0 },
        byKind: {
          ...all.byKind,
          recurring: { count: 0, annual: 0 },
          small: { count: 0, annual: 0 },
          increase: { count: 0, annual: 0 },
        },
        findings: [double],
        count: 1,
      })
    );
    expect(await screen.findByText(tr('app.leaks.partial', { days: 41 }))).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: tr('app.leaks.partialLabel') })).toHaveAttribute(
      'aria-valuenow',
      '41'
    );
    expect(screen.getByText(tr('app.leaks.oneOffOnly', { amount: '89 €' }))).toBeInTheDocument();
    // One kind only: no filters.
    expect(screen.queryByRole('group', { name: tr('app.leaks.filter') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: tr('app.leaks.none.cta') }));
    expect(onImport).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith('dp_import_cta', { detail: 'partial' });
  });

  it('with nothing to check: says so, and that yearly charges need more history', async () => {
    show(
      leaks({
        coverage: { ...all.coverage, yearlyReady: false },
        total: { annual: 0, oneOff: 0, count: 0 },
        findings: [],
        count: 0,
      })
    );
    expect(await screen.findByText(tr('app.leaks.empty'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.emptyTitle'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.leaks.yearlyNote'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisados/ })).toBeNull();
    // The export bar is off and says why as a tooltip, reachable with the keyboard.
    const bar = screen.getByRole('group', { name: tr('app.exportButtons.group') });
    expect(bar).toHaveAttribute('tabindex', '0');
    expect(bar).toHaveAccessibleDescription(tr('app.exportButtons.empty'));
    expect(within(bar).getByRole('tooltip', { hidden: true })).toHaveTextContent(
      tr('app.exportButtons.empty')
    );
  });

  it('a rise inside its card, two days apart and one thing to check', async () => {
    show(
      leaks({
        total: { annual: 160, oneOff: 0, count: 1 },
        findings: [
          { ...fitbox, previousAmount: 35, confidence: 'medium', nextDate: null },
          { ...double, lastDate: '2026-09-14' },
        ],
        count: 2,
      })
    );
    const gym = await screen.findByRole('article', { name: /^FITBOX/ });
    expect(within(gym).getByText(/Subió de 35,00 € a 39,90 €/)).toBeVisible();
    expect(within(gym).queryByText(/hacia el/)).toBeNull();
    expect(screen.getByText(tr('app.leaks.countOne'))).toBeInTheDocument();
    expect(
      within(card('ELECTRO MARKET')).getByText(
        /dos veces, el 12 de septiembre y el 14 de septiembre/
      )
    ).toBeVisible();
  });

  it('shows the free plan the rest is Premium and counts the paywall from here', async () => {
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(
      f.billing({ plan: 'free', trialDaysLeft: 0, limits: f.catalog().limits.free })
    );
    show(leaks({ locked: true, count: 3 }), { api, plan: true });
    expect(await screen.findByText(tr('app.leaks.lockedOther', { count: 2 }))).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: tr('billing.seePlans') }));
    expect(
      await screen.findByText(
        tr('billing.reason.feature', { feature: tr('billing.feature.insights') })
      )
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('paywall_view', { detail: 'dp' });
  });

  it('says one more finding, without the plan button outside the plan provider', async () => {
    show(leaks({ locked: true, count: 2 }));
    expect(await screen.findByText(tr('app.leaks.lockedOne'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: tr('billing.seePlans') })).toBeNull();
  });

  it('speaks English', async () => {
    await loadLocale('en');
    const api = createFakeApi();
    api.settingsApi.get.mockResolvedValue(f.settings({ locale: 'en' }));
    api.insightsApi.moneyLeaks.mockResolvedValue(all);
    renderWithProviders(<MoneyLeaksView onImport={jest.fn()} onOpenTab={jest.fn()} />, {
      api,
      locale: 'en',
    });
    expect(await screen.findByText(/Charged every month since August 2025/)).toBeInTheDocument();
    expect(screen.getByText(/charged twice on 12 September/)).toBeInTheDocument();
  });
});
