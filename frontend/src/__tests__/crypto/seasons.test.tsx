import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { translate } from '@core/i18n/I18nContext';
import { EURO } from '@modules/crypto/domain/currency';
import {
  counted,
  medal,
  missingText,
  monthLabel,
  outOfBalance,
  previousMonth,
  reportTable,
} from '@modules/crypto/domain/season';
import type {
  CryptoRanking,
  SeasonReport,
  SeasonResult,
  SimPortfolio,
  SimStats,
} from '@modules/crypto/domain/types';
import { CryptoConsoleView } from '@modules/crypto/ui/CryptoConsoleView';
import { GuideModal } from '@modules/crypto/ui/GuideModal';
import { MoneyProvider } from '@modules/crypto/ui/money';
import { EquityChart, PlansCard } from '@modules/crypto/ui/PremiumPanel';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';
import { charts } from '../../__mocks__/lightweightCharts';

// Every alias, price and result here is made up.
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');
const t = (key: string, vars?: Record<string, string | number>) => translate('es', key, vars);

function setup(change?: (api: FakeApi) => void, plan = false) {
  const api = createFakeApi();
  change?.(api);
  const view = renderWithProviders(<CryptoConsoleView />, { api, plan });
  return { ...view, api };
}
const withPortfolio = (p: Partial<SimPortfolio>) => (api: FakeApi) =>
  api.cryptoApi.portfolio.mockResolvedValue(fx.portfolio(p));
const ready = () => screen.findByRole('heading', { name: /Temporada de marzo de 2026/ });
const season = (s: Partial<SimPortfolio['season']>) => ({ ...fx.portfolio().season, ...s });
const result = (r: Partial<SeasonResult> = {}): SeasonResult => ({
  season: '2026-02',
  initial: 10_000,
  final: 11_250,
  percent: 12.5,
  trades: 9,
  wins: 6,
  activeDays: 7,
  qualified: true,
  ranked: true,
  place: null,
  prizeDays: 0,
  ...r,
});
const practiceOn = (p: Partial<SimPortfolio> = {}) =>
  fx.portfolio({
    portfolio: fx.PRACTICE_REF,
    portfolios: [fx.SEASON_REF, fx.PRACTICE_REF],
    ...p,
  });
const stats = (s: Partial<SimStats> = {}): SimStats => ({
  winRate: 66.7,
  wins: 2,
  losses: 1,
  best: { symbol: 'ETH', direction: 'long', pnl: 120, pnlPercent: 12, closedAt: '' },
  worst: { symbol: 'BTC', direction: 'short', pnl: -40, pnlPercent: -4, closedAt: '' },
  averageWin: 70,
  averageLoss: -40,
  equityDays: [
    { day: '2026-03-13', equity: 10_000 },
    { day: '2026-03-14', equity: 9_900 },
    { day: '2026-03-15', equity: 10_150 },
  ],
  hold: { symbol: 'BTC', startPrice: 40_000, price: 50_000, percent: 25 },
  ...s,
});
const premium = (p: Partial<SimPortfolio> = {}) =>
  fx.portfolio({
    plan: { premium: true, practiceMax: 5, practiceActionsLeft: 5 },
    stats: stats(),
    ...p,
  });
const rankingWith = (r: Partial<CryptoRanking>) => (api: FakeApi) =>
  api.cryptoApi.ranking.mockResolvedValue(fx.ranking(r));

beforeEach(() => {
  localStorage.clear();
  charts.length = 0;
});

describe('Crypto console: the season', () => {
  it('shows the month, its countdown and rules, badges and what each plan includes', async () => {
    setup();
    await ready();
    expect(screen.getByRole('timer')).toHaveTextContent('Nueva temporada en 16 días');
    expect(screen.queryByText(/Quedan pocos días/)).toBeNull();
    expect(screen.getByText(/todos empiezan el día 1 con 10.000 € virtuales/)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Tus carteras' });
    expect(within(nav).getByRole('button', { name: /Temporada de marzo/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(nav).getByRole('button', { name: /Nueva cartera de prácticas/ })).toBeEnabled();
    const badges = screen.getByRole('heading', { name: 'Tus insignias' }).closest('section')!;
    expect(within(badges).getByText('Conseguida')).toBeInTheDocument();
    expect(within(badges).getByText('Cierra 10 operaciones.')).toBeInTheDocument();
    const plans = screen
      .getByRole('heading', { name: 'Gratis y Premium en la consola' })
      .closest('section')!;
    expect(within(plans).getByText('Hasta 100 órdenes pendientes')).toBeInTheDocument();
    expect(within(plans).getByText(/Premium no da más dinero/)).toBeInTheDocument();
    expect(within(plans).getByRole('link', { name: /Ver Premium/ })).toHaveAttribute(
      'href',
      '/pricing'
    );
    // Premium features show an example with made-up data and what they unlock.
    const statsCard = screen
      .getByRole('heading', { name: /Estadísticas de la cartera/ })
      .closest('section')!;
    expect(within(statsCard).getByText('Ejemplo con datos inventados')).toBeInTheDocument();
    expect(
      within(statsCard).getByText(/Con Premium verías aquí tus propias cifras/)
    ).toBeInTheDocument();
    const alertsCard = screen
      .getByRole('heading', { name: /Avisos de precio/ })
      .closest('section')!;
    expect(within(alertsCard).getByText(/hasta 10 avisos/)).toBeInTheDocument();
    expect(
      screen.getByText(/Informe de la temporada en PDF y CSV, con Premium/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeInTheDocument();
  });

  it('warns in the last days, counts one day and says when it is the last', async () => {
    const { unmount } = setup(withPortfolio({ season: season({ daysLeft: 1, endingSoon: true }) }));
    expect(await screen.findByText('Nueva temporada en 1 día')).toBeInTheDocument();
    expect(
      screen.getByText(/se cerrarán tus posiciones abiertas al último precio/)
    ).toBeInTheDocument();
    unmount();
    setup(withPortfolio({ season: season({ daysLeft: 0, endingSoon: true }) }));
    expect(await screen.findByText('Hoy es el último día de la temporada')).toBeInTheDocument();
  });

  it('lists past seasons with their place', async () => {
    setup(
      withPortfolio({
        season: season({
          history: [result({ place: 2 }), result({ season: '2026-01', place: null, percent: -3 })],
        }),
      })
    );
    await ready();
    fireEvent.click(screen.getByText('Temporadas anteriores'));
    const rows = within(screen.getByText('Temporadas anteriores').closest('details')!).getAllByRole(
      'row'
    );
    expect(rows).toHaveLength(3);
    expect(nb(rows[1].textContent)).toContain('2.º');
    expect(nb(rows[2].textContent)).toContain('—');
    expect(nb(rows[2].textContent)).toContain('-3,00 %');
  });

  it('sums up the season that ended once, with the prize when it was won', async () => {
    const first = setup(
      withPortfolio({ season: season({ history: [result({ place: 1, prizeDays: 30 })] }) })
    );
    const card = await screen.findByRole('heading', { name: 'Así fue tu temporada de febrero' });
    const summary = card.closest('section')!;
    expect(within(summary).getByText('Has ganado 1 mes de Premium.')).toBeInTheDocument();
    expect(nb(summary.textContent)).toContain(
      'Terminaste con 11.250,00 € (+12,50 %) y 9 operaciones'
    );
    expect(within(summary).getByText('Quedaste en el puesto 1 del ranking.')).toBeInTheDocument();
    fireEvent.click(within(summary).getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByText('Así fue tu temporada de febrero')).toBeNull();
    first.unmount();
    const again = setup(withPortfolio({ season: season({ history: [result({ place: 1 })] }) }));
    await ready();
    expect(screen.queryByText('Así fue tu temporada de febrero')).toBeNull();
    again.unmount();
    localStorage.clear();
    const short = setup(
      withPortfolio({ season: season({ history: [result({ qualified: false })] }) })
    );
    expect(
      await screen.findByText('Estabas en el ranking pero no llegaste a los mínimos para puntuar.')
    ).not.toBeNull();
    short.unmount();
    // Here «qualified» but nobody asked to appear: the result is only for the person.
    setup(withPortfolio({ season: season({ history: [result({ ranked: false })] }) }));
    expect(
      await screen.findByText('No participabas en el ranking: tu resultado es solo para ti.')
    ).toBeInTheDocument();
  });

  it('only sums up last month, also across a new year', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(monthLabel('2026-10', 'en')).toBe('October 2026');
  });
});

describe('Crypto console: practice portfolios', () => {
  it('creates one, trades in it, starts it again and deletes it', async () => {
    const { api } = setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: /Nueva cartera de prácticas/ }));
    await screen.findByRole('heading', { name: 'Cartera de prácticas' });
    expect(api.cryptoApi.createPractice).toHaveBeenCalled();
    expect(localStorage.getItem('mm_crypto_portfolio')).toBe(fx.PRACTICE_REF.id);
    expect(screen.getByText(/no cuenta para el ranking/)).toBeInTheDocument();
    expect(screen.getByText(/5 veces más/)).toBeInTheDocument();
    // No room for another one on the free plan.
    expect(screen.queryByRole('button', { name: /Nueva cartera de prácticas/ })).toBeNull();

    api.cryptoApi.portfolio.mockResolvedValue(practiceOn());
    api.cryptoApi.placeOrder.mockResolvedValue(practiceOn());
    fireEvent.change(screen.getByLabelText('Capital por operación'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Abrir long/ }));
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ portfolioId: fx.PRACTICE_REF.id, amount: 100 })
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo con 10.000 €' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Tu temporada no cambia');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo con 10.000 €' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, empezar de nuevo' }));
    await waitFor(() =>
      expect(api.cryptoApi.resetPractice).toHaveBeenCalledWith(fx.PRACTICE_REF.id)
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar esta cartera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    await waitFor(() =>
      expect(api.cryptoApi.deletePractice).toHaveBeenCalledWith(fx.PRACTICE_REF.id)
    );
    await ready();
  });

  it('switches between the season and practice, and limits restarts per day', async () => {
    const { api, unmount } = setup((a) => {
      a.cryptoApi.portfolio.mockResolvedValue(
        practiceOn({ plan: { premium: false, practiceMax: 1, practiceActionsLeft: 1 } })
      );
    });
    expect(await screen.findByText(/1 vez más/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Temporada de marzo/ }));
    await waitFor(() => expect(api.cryptoApi.portfolio).toHaveBeenLastCalledWith(fx.SEASON_REF.id));
    unmount();
    setup(
      withPortfolio({
        portfolio: fx.PRACTICE_REF,
        portfolios: [fx.SEASON_REF, fx.PRACTICE_REF],
        plan: { premium: true, practiceMax: 5, practiceActionsLeft: 0 },
      })
    );
    expect(
      await screen.findByRole('button', { name: 'Empezar de nuevo con 10.000 €' })
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Nueva cartera de prácticas/ })).toBeNull();
  });

  it('offers practice when the season ran out of money', async () => {
    const broke = { account: { ...fx.portfolio().account, cash: 0.4 }, open: [], pending: [] };
    const { api, unmount } = setup(withPortfolio(broke));
    expect(await screen.findByText('Te has quedado sin dinero ficticio.')).toBeInTheDocument();
    expect(screen.getByText(/Puedes seguir practicando hasta el día 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cartera de prácticas' }));
    await waitFor(() => expect(api.cryptoApi.createPractice).toHaveBeenCalled());
    unmount();
    localStorage.clear();
    const second = setup(withPortfolio({ ...broke, portfolios: [fx.SEASON_REF, fx.PRACTICE_REF] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ir a mi cartera de prácticas' }));
    await waitFor(() =>
      expect(second.api.cryptoApi.portfolio).toHaveBeenLastCalledWith(fx.PRACTICE_REF.id)
    );
    expect(outOfBalance(practiceOn(broke))).toBe(false);
  });
});

describe('Crypto console: ranking of the month', () => {
  const card = async () =>
    (await screen.findByRole('heading', { name: 'Ranking de marzo' })).closest('section')!;

  it('shows the top with medals and aliases, the prize, the rules and the person’s figures', async () => {
    setup();
    const ranking = await card();
    expect(within(ranking).getByRole('timer')).toHaveTextContent('Termina en 16 días');
    expect(
      within(ranking).getByText(/Premio para el primer puesto: 30 días de Premium/)
    ).toBeInTheDocument();
    const rows = within(ranking).getAllByRole('listitem');
    expect(nb(rows[0].textContent)).toMatch(/1Lince.*\+12,50 %9 operaciones/);
    expect(
      within(rows[0]).getByText('Tiene Premium (no da ventaja en el ranking)')
    ).toBeInTheDocument();
    expect(nb(rows[1].textContent)).toContain('1 operación');
    expect(rows[2].querySelector('.cc-down')).not.toBeNull();
    expect(within(ranking).getByText(/No apareces en el ranking/)).toBeInTheDocument();
    expect(nb(within(ranking).getByText(/Tú este mes/).parentElement!.textContent)).toContain(
      '+0,98 %'
    );
    expect(
      within(ranking).getByText('Tu puesto y tus cifras solo los ves tú.')
    ).toBeInTheDocument();
    fireEvent.click(within(ranking).getByText('Cómo funciona el ranking (bases)'));
    expect(
      within(ranking).getByText(/al menos 5 operaciones cerradas y 3 días/)
    ).toBeInTheDocument();
    expect(within(ranking).getByText(/sus 10.000 € virtuales/)).toBeInTheDocument();
    expect(within(ranking).getByLabelText('Tu alias')).toHaveValue('Ana');
  });

  it('turns on with the alias, saves a new alias and shows the place or what is missing', async () => {
    const { api } = setup();
    const ranking = await card();
    api.cryptoApi.setRanking.mockResolvedValue(
      fx.ranking({
        settings: { optIn: true, alias: 'Ana', suggestedAlias: 'Ana' },
        me: { ...fx.ranking().me, place: 2, qualified: true },
      })
    );
    fireEvent.click(within(ranking).getByRole('switch', { name: 'Aparecer en el ranking' }));
    await waitFor(() =>
      expect(api.cryptoApi.setRanking).toHaveBeenCalledWith({ optIn: true, alias: 'Ana' })
    );
    expect(await within(ranking).findByText('Vas en el puesto 2 de 7.')).toBeInTheDocument();
    api.cryptoApi.setRanking.mockResolvedValue(
      fx.ranking({ settings: { optIn: true, alias: 'Lince Azul', suggestedAlias: 'Ana' } })
    );
    fireEvent.change(within(ranking).getByLabelText('Tu alias'), {
      target: { value: 'Lince Azul' },
    });
    fireEvent.click(within(ranking).getByRole('button', { name: 'Guardar alias' }));
    await waitFor(() =>
      expect(api.cryptoApi.setRanking).toHaveBeenLastCalledWith({
        optIn: true,
        alias: 'Lince Azul',
      })
    );
    expect(
      await within(ranking).findByText(
        'Para puntuar te falta 3 operaciones cerradas y 2 días con actividad.'
      )
    ).toBeInTheDocument();
    api.cryptoApi.setRanking.mockRejectedValue(new Error('El alias no puede llevar correos.'));
    fireEvent.click(within(ranking).getByRole('button', { name: 'Guardar alias' }));
    expect(await within(ranking).findByRole('alert')).toHaveTextContent(
      'El alias no puede llevar correos.'
    );
  });

  it('without an alias the switch sends only the choice, and saving needs one', async () => {
    const { api } = setup(
      rankingWith({ settings: { optIn: false, alias: null, suggestedAlias: null } })
    );
    const ranking = await card();
    expect(within(ranking).getByRole('button', { name: 'Guardar alias' })).toBeDisabled();
    fireEvent.click(within(ranking).getByRole('switch'));
    await waitFor(() => expect(api.cryptoApi.setRanking).toHaveBeenCalledWith({ optIn: true }));
  });

  it('shows last month’s winners, an empty month, the last day and one missing of each', async () => {
    const { unmount } = setup(
      rankingWith({
        top: [],
        season: { month: '2026-03', endsAt: '', daysLeft: 0 },
        previous: { month: '2026-02', top: fx.ranking().top.slice(0, 1) },
        settings: { optIn: true, alias: 'Ana', suggestedAlias: 'Ana' },
        me: { ...fx.ranking().me, percent: null, missing: { trades: 1, days: 0 } },
      })
    );
    const ranking = await card();
    expect(within(ranking).getByText(/todavía no hay nadie con los mínimos/)).toBeInTheDocument();
    expect(within(ranking).getByRole('timer')).toHaveTextContent('Termina hoy');
    expect(
      within(ranking).getByRole('heading', { name: 'Ganadores de febrero' })
    ).toBeInTheDocument();
    expect(
      within(ranking).getByText('Para puntuar te falta 1 operación cerrada.')
    ).toBeInTheDocument();
    unmount();
    setup(
      rankingWith({
        season: { month: '2026-03', endsAt: '', daysLeft: 1 },
        settings: { optIn: true, alias: 'Ana', suggestedAlias: 'Ana' },
        me: { ...fx.ranking().me, missing: { trades: 0, days: 1 } },
      })
    );
    const next = await card();
    expect(within(next).getByRole('timer')).toHaveTextContent('Termina en 1 día');
    expect(
      within(next).getByText('Para puntuar te falta 1 día con actividad.')
    ).toBeInTheDocument();
  });

  it('says when the ranking cannot be loaded, and shows nothing while it loads', async () => {
    const { unmount } = setup((api) => api.cryptoApi.ranking.mockRejectedValue(new Error('')));
    expect(
      await screen.findByText('No hemos podido cargar el ranking. Inténtalo más tarde.')
    ).toBeInTheDocument();
    unmount();
    setup((api) => api.cryptoApi.ranking.mockReturnValue(new Promise(() => undefined)));
    await ready();
    expect(screen.queryByText(/Ranking de marzo/)).toBeNull();
  });

  it('builds the sentence of what is missing', () => {
    const me = fx.ranking().me;
    expect(missingText({ ...me, missing: { trades: 2, days: 1 } }, t)).toBe(
      'Para puntuar te falta 2 operaciones cerradas y 1 día con actividad.'
    );
    expect(counted(t, 'app.crypto.ranking.trades', 1)).toBe('1 operación');
    expect([1, 2, 3, 4].map(medal)).toEqual(['gold', 'silver', 'bronze', 'plain']);
  });
});

describe('Crypto console: Premium comforts', () => {
  it('statistics with the daily chart and the comparison with keeping the coin', async () => {
    setup(withPortfolio(premium()));
    const card = (
      await screen.findByRole('heading', { name: /Estadísticas de la cartera/ })
    ).closest('section')!;
    expect(within(card).queryByText('Ejemplo con datos inventados')).toBeNull();
    expect(nb(card.textContent)).toContain('66,7 % (2 con ganancia, 1 con pérdida)');
    expect(nb(card.textContent)).toContain('ETH · +120,00 € (+12,00 %)');
    expect(nb(card.textContent)).toContain('BTC · -40,00 € (-4,00 %)');
    expect(nb(within(card).getByRole('img').getAttribute('aria-label'))).toMatch(
      /en 3 días: de 10.000,00 € a 10.150,00 €/
    );
    expect(card.querySelector('polyline')).toHaveClass('cc-up');
    expect(nb(card.textContent)).toContain('Con BTC desde que empezó esta cartera: +25,00 %');
    expect(within(card).getByText(/No dice nada de lo que pasará/)).toBeInTheDocument();
    expect(screen.getByText('Tienes Premium: todo esto ya está activo.')).toBeInTheDocument();
  });

  it('statistics without data say so', async () => {
    setup(
      withPortfolio(
        premium({
          stats: stats({
            winRate: null,
            best: null,
            worst: null,
            averageWin: null,
            averageLoss: null,
            hold: null,
            equityDays: [{ day: '2026-03-15', equity: 10_000 }],
          }),
        })
      )
    );
    expect(
      await screen.findByText('La gráfica aparece a partir del segundo día.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ahora no tenemos precios para hacer esta comparación.')
    ).toBeInTheDocument();
  });

  it('draws a flat or falling line', () => {
    const view = renderWithProviders(
      <MoneyProvider display={EURO}>
        <EquityChart
          days={[
            { day: 'a', equity: 10_000 },
            { day: 'b', equity: 10_000 },
          ]}
        />
      </MoneyProvider>
    );
    expect(view.container.querySelector('polyline')).toHaveAttribute('points', '0,90 300,90');
    view.rerender(
      <MoneyProvider display={EURO}>
        <EquityChart
          days={[
            { day: 'a', equity: 10_000 },
            { day: 'b', equity: 9_000 },
          ]}
        />
      </MoneyProvider>
    );
    expect(view.container.querySelector('polyline')).toHaveClass('cc-down');
  });

  it('price alerts: lists, deletes and creates them', async () => {
    const { api } = setup(withPortfolio(premium()));
    const card = (await screen.findByRole('heading', { name: /Avisos de precio/ })).closest(
      'section'
    )!;
    await within(card).findByText('Esperando');
    expect(nb(card.textContent)).toContain('BTC sube a 60.000,00 € o más');
    expect(nb(card.textContent)).toContain('ETH baja a 1.500,00 € o menos');
    expect(within(card).getByText(/Avisado el/)).toBeInTheDocument();
    expect(within(card).getByText(/Te avisamos una sola vez/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Borrar el aviso de BTC' }));
    await waitFor(() => expect(api.cryptoApi.deleteAlert).toHaveBeenCalledWith('a1'));
    const create = within(card).getByRole('button', { name: 'Crear aviso' });
    expect(create).toBeDisabled();
    await screen.findByRole('option', { name: 'Ethereum (ETH)' });
    fireEvent.change(within(card).getByLabelText('Moneda'), { target: { value: 'ETH' } });
    fireEvent.change(within(card).getByLabelText('Avisarme cuando'), {
      target: { value: 'below' },
    });
    fireEvent.change(within(card).getByLabelText('Precio (€)'), { target: { value: '1500,5' } });
    fireEvent.click(create);
    await waitFor(() =>
      expect(api.cryptoApi.createAlert).toHaveBeenCalledWith({
        symbol: 'ETH',
        condition: 'below',
        price: 1500.5,
      })
    );
    await waitFor(() => expect(within(card).getByLabelText('Precio (€)')).toHaveValue(''));
    api.cryptoApi.createAlert.mockRejectedValue(new Error('Puedes tener hasta 10 avisos.'));
    fireEvent.change(within(card).getByLabelText('Precio (€)'), { target: { value: '2' } });
    fireEvent.click(create);
    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Puedes tener hasta 10 avisos.'
    );
    expect(within(card).getByLabelText('Precio (€)')).toHaveValue('2');
  });

  it('price alerts without notifications, empty, failing or still loading', async () => {
    const first = setup((api) => {
      withPortfolio(premium())(api);
      api.cryptoApi.alerts.mockResolvedValue(fx.alerts({ alerts: [], pushEnabled: false }));
      api.cryptoApi.coins.mockResolvedValue({ ...fx.coins(), coins: [] });
    });
    expect(await screen.findByText(/no llegarán/)).toBeInTheDocument();
    expect(screen.getByText('Todavía no tienes avisos.')).toBeInTheDocument();
    first.unmount();
    const failing = setup((api) => {
      withPortfolio(premium())(api);
      api.cryptoApi.alerts.mockRejectedValue(new Error(''));
    });
    expect(
      await screen.findByText('No hemos podido cargar tus avisos de precio.')
    ).toBeInTheDocument();
    failing.unmount();
    setup((api) => {
      withPortfolio(premium())(api);
      api.cryptoApi.alerts.mockReturnValue(new Promise(() => undefined));
    });
    const card = (await screen.findByRole('heading', { name: /Avisos de precio/ })).closest(
      'section'
    )!;
    expect(within(card).queryByRole('button')).toBeNull();
  });

  it('downloads the season report', async () => {
    const createObjectURL = jest.fn((_blob: Blob) => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { api } = setup(withPortfolio(premium()));
    await screen.findByText('Informe de la temporada');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar CSV: Informe de la temporada de la consola crypto',
      })
    );
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(api.cryptoApi.report).toHaveBeenCalledWith('2026-03');
    expect(
      screen.getByRole('button', {
        name: 'Descargar PDF: Informe de la temporada de la consola crypto',
      })
    ).toBeInTheDocument();
    click.mockRestore();
  });

  it('opens the upgrade window from the console when the plan is known', async () => {
    setup(undefined, true);
    const plans = (
      await screen.findByRole('heading', { name: 'Gratis y Premium en la consola' })
    ).closest('section')!;
    fireEvent.click(within(plans).getByRole('button', { name: /Ver Premium/ }));
    expect(await screen.findByRole('heading', { name: 'Hazte Premium' })).toBeInTheDocument();
  });

  it('explains Free and Premium in the guide too', async () => {
    Element.prototype.scrollIntoView = jest.fn();
    setup();
    await ready();
    await act(async () => undefined);
    fireEvent.click(screen.getAllByRole('button', { name: '¿Qué es cada cosa?' })[0]);
    const dialog = await screen.findByRole('dialog', { name: '¿Qué es cada cosa?' });
    expect(within(dialog).getByRole('button', { name: 'Gratis y Premium' })).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { level: 3, name: 'Gratis y Premium en la consola' })
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/la comisión es fija para todos/)).toBeInTheDocument();
  });

  it('opens the guide before the portfolio arrives', async () => {
    Element.prototype.scrollIntoView = jest.fn();
    setup((api) => api.cryptoApi.portfolio.mockReturnValue(new Promise(() => undefined)));
    fireEvent.click((await screen.findAllByRole('button', { name: '¿Qué es cada cosa?' }))[0]);
    const dialog = await screen.findByRole('dialog', { name: '¿Qué es cada cosa?' });
    expect(within(dialog).getByRole('link', { name: /Ver Premium/ })).toBeInTheDocument();
  });

  it('renders the guide and the plans card on their own', () => {
    renderWithProviders(<GuideModal section="plans" onClose={() => undefined} />);
    expect(screen.getAllByRole('link', { name: /Ver Premium/ }).length).toBeGreaterThan(0);
    renderWithProviders(<PlansCard premium />);
    expect(screen.getAllByText('Tienes Premium: todo esto ya está activo.')).toHaveLength(1);
  });
});

describe('Crypto console: season report table', () => {
  const report: SeasonReport = {
    season: '2026-02',
    finished: true,
    initial: 10_000,
    result: result({ place: null }),
    closed: [
      {
        id: 'c1',
        symbol: 'ETH',
        direction: 'short',
        quantity: 0.5,
        entryPrice: 2_000,
        exitPrice: 1_800,
        invested: 1_000,
        fees: 2,
        proceeds: 1_098,
        pnl: 98,
        pnlPercent: 9.8,
        openType: 'market',
        closeType: 'season',
        openedAt: '2026-02-10T10:00:00.000Z',
        closedAt: '2026-02-28T22:59:59.000Z',
      },
    ],
    stats: stats({ best: null, worst: null, winRate: null }),
  };

  it('puts the summary first and then every operation, in the shown currency', () => {
    const table = reportTable(report, t, 'es', { currency: 'USD', rate: 2 });
    expect(table.head[2]).toBe('Precio de entrada ($)');
    expect(table.rows[0]).toEqual(['Temporada', 'febrero de 2026', '', '', '', '', '']);
    expect(table.rows[1]).toEqual(['Dinero virtual al empezar ($)', 20_000, '', '', '', '', '']);
    expect(table.rows[4]).toEqual(['Puesto en el ranking', '—', '', '', '', '', '']);
    expect(table.rows[6]).toEqual(['Operaciones con ganancia (%)', '—', '', '', '', '', '']);
    expect(table.rows[7][1]).toBe('');
    expect(table.rows.at(-1)!.slice(0, 6)).toEqual([
      'ETH',
      'Short',
      4_000,
      3_600,
      'Fin de temporada',
      196,
    ]);
    const running = reportTable({ ...report, result: null, stats: stats() }, t, 'es', EURO);
    expect(running.rows[2]).toEqual(['Operaciones cerradas', 1, '', '', '', '', '']);
    expect(running.rows[3]).toEqual(['Operaciones con ganancia (%)', 66.7, '', '', '', '', '']);
    const placed = reportTable({ ...report, result: result({ place: 3 }) }, t, 'es', EURO);
    expect(placed.rows[4][1]).toBe(3);
  });
});
