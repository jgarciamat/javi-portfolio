import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { translate } from '@core/i18n/I18nContext';
import { withLivePrice } from '@modules/crypto/domain/live';
import { RECORDED_MAX_DAYS, checkRecord, type RecordCheck } from '@modules/crypto/domain/orders';
import type { SimFill, SimPortfolio } from '@modules/crypto/domain/types';
import { CryptoConsoleView, fillText } from '@modules/crypto/ui/CryptoConsoleView';
import { makeMoney } from '@modules/crypto/ui/money';
import { closingFill, recordedText, toLocalInput } from '@modules/crypto/ui/RecordTrade';
import { LIVE_REFRESH_MS } from '@modules/crypto/domain/live';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';
import { charts } from '../../__mocks__/lightweightCharts';

// Every price, amount and operation here is made up.
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');
const t = (key: string, vars?: Record<string, string | number>) => translate('es', key, vars);
const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-03-15T12:00:00Z');

const practice = (p: Partial<SimPortfolio> = {}) =>
  fx.portfolio({
    portfolio: fx.PRACTICE_REF,
    portfolios: [fx.SEASON_REF, fx.PRACTICE_REF],
    ...p,
  });

const fill = (f: Partial<SimFill> = {}): SimFill => ({
  orderId: 'x',
  symbol: 'BTC',
  side: 'sell',
  direction: 'long',
  type: 'limit',
  price: 55_000,
  at: '2026-03-15T11:00:00.000Z',
  slot: 2,
  sameCandle: false,
  ...f,
});

describe('«Register a trade I already opened»: the checks', () => {
  const base: RecordCheck = {
    direction: 'long',
    amount: 1000,
    entry: 40_000,
    current: 50_000,
    takeProfit: NaN,
    stopLoss: NaN,
    cash: 100_000,
    bps: 10,
    openedAt: null,
    now: NOW,
  };
  const problems = (i: Partial<RecordCheck>) => checkRecord({ ...base, ...i }).problems;

  it('takes any entry, points out a far one and works out how it is doing now', () => {
    const check = checkRecord(base);
    expect(check.problems).toEqual([]);
    expect(check.far).toBe(false);
    expect(check.estimate).toEqual({ quantity: 0.025, fee: 1, total: 1001 });
    // 0,025 at 50.000 = 1.250 €, minus 1,25 € of commission, against 1.001 € paid.
    expect(check.now!.pnl).toBeCloseTo(247.75, 2);
    expect(check.liquidation).toBeNull();
    expect(checkRecord({ ...base, entry: 20_000 }).far).toBe(true);
    expect(checkRecord({ ...base, entry: 80_000 }).far).toBe(true);
    expect(checkRecord({ ...base, current: null }).far).toBe(false);
    expect(checkRecord({ ...base, current: null }).now).toBeNull();
  });

  it('says what is missing or out of place', () => {
    expect(problems({ current: null })).toEqual(['noPrice']);
    expect(problems({ amount: NaN })).toEqual(['amount']);
    expect(problems({ entry: NaN })).toEqual(['needPrice']);
    expect(problems({ entry: 0 })).toEqual(['needPrice']);
    expect(problems({ entry: 400 })).toEqual(['range']);
    expect(problems({ entry: 6_000_000 })).toEqual(['range']);
    expect(problems({ amount: 200_000 })).toEqual(['cash']);
    expect(problems({ takeProfit: 39_000, stopLoss: 41_000 })).toEqual([
      'takeProfitSide',
      'stopLossSide',
    ]);
    expect(problems({ openedAt: NOW + 10 * 60_000 })).toEqual(['future']);
    expect(problems({ openedAt: NaN })).toEqual(['future']);
    expect(problems({ openedAt: NOW + 60_000 })).toEqual([]);
    expect(problems({ openedAt: NOW - (RECORDED_MAX_DAYS + 1) * 24 * HOUR })).toEqual(['tooOld']);
  });

  it('entered now, refuses exits the price already passed; entered before, the candles say', () => {
    expect(problems({ takeProfit: 45_000 })).toEqual(['takeProfitReached']);
    expect(problems({ entry: 60_000, stopLoss: 55_000 })).toEqual(['stopLossReached']);
    expect(problems({ takeProfit: 45_000, openedAt: NOW - HOUR })).toEqual([]);
    const short = { direction: 'short' as const };
    expect(problems({ ...short, entry: 60_000, takeProfit: 55_000 })).toEqual([
      'takeProfitReached',
    ]);
    expect(problems({ ...short, entry: 45_000, stopLoss: 48_000 })).toEqual(['stopLossReached']);
    expect(problems({ ...short, entry: 25_000 })).toEqual(['liquidated']);
    expect(problems({ ...short, entry: 25_000, openedAt: NOW - HOUR })).toEqual([]);
    expect(problems({ ...short, entry: 25_000, current: null })).toEqual(['noPrice']);
    const check = checkRecord({ ...base, ...short, entry: 60_000, takeProfit: 52_000 });
    expect(check.liquidation).toBe(120_000);
    expect(check.takeProfit!.pnl).toBeGreaterThan(0);
    expect(check.stopLoss).toBeNull();
  });
});

describe('the result of open trades at the live price', () => {
  const p = practice();
  const later = '2026-03-15T12:00:05.000Z';

  it('works the trades of the coin and the totals out again with a newer price', () => {
    const moved = withLivePrice(p, 'BTC', 60_000, later);
    // 0,02 BTC at 60.000 = 1.200 €, minus 1,20 €, against 1.001 € paid.
    expect(moved.open[0]).toMatchObject({
      currentPrice: 60_000,
      value: 1198.8,
      exitFee: 1.2,
      pnl: 197.8,
      pnlPercent: 19.76,
    });
    expect(moved.summary).toMatchObject({
      equity: 10_197.8,
      unrealized: 197.8,
      total: 197.8,
      totalPercent: 1.98,
    });
    expect(moved.closed).toBe(p.closed);
  });

  it('leaves the portfolio as it is when the price is not newer, missing or of no trade', () => {
    expect(withLivePrice(p, 'BTC', null, later)).toBe(p);
    expect(withLivePrice(p, 'BTC', undefined, later)).toBe(p);
    expect(withLivePrice(p, 'BTC', 60_000, null)).toBe(p);
    expect(withLivePrice(p, 'BTC', 60_000, p.market.updatedAt)).toBe(p);
    expect(withLivePrice(p, 'ETH', 3_000, later)).toBe(p);
    const unknown = { ...p, market: { ...p.market, updatedAt: null } };
    expect(withLivePrice(unknown, 'BTC', 60_000, later).open[0].currentPrice).toBe(60_000);
  });

  it('keeps the totals unknown while another coin has no price', () => {
    const eth = { ...p.open[0], id: 'e1', symbol: 'ETH', currentPrice: null, value: null };
    const both = { ...p, open: [p.open[0], { ...eth, pnl: null, pnlPercent: null }] };
    const moved = withLivePrice(both, 'BTC', 60_000, later);
    expect(moved.open[0].pnl).toBe(197.8);
    expect(moved.summary).toBe(both.summary);
  });
});

describe('the words after registering', () => {
  const money = makeMoney({ currency: 'EUR', rate: 1 }, 'es');
  const vars = { coin: 'BTC #2', direction: 'long' as const, entry: '40.000,00 €' };
  const at = (iso: string) => iso.slice(11, 16);

  it('finds the exit that closed the new trade while its candles were checked', () => {
    expect(closingFill([fill()], 'BTC', 2)).toEqual(fill());
    expect(closingFill([fill({ slot: 1 })], 'BTC', 2)).toBeNull();
    expect(closingFill([fill({ symbol: 'ETH' })], 'BTC', 2)).toBeNull();
    expect(closingFill([fill({ type: 'expired', side: 'buy' })], 'BTC', 2)).toBeNull();
    expect(closingFill([fill({ side: 'buy' })], 'BTC', 2)).toBeNull();
    const short = fill({ direction: 'short', side: 'buy', type: 'liquidation' });
    expect(closingFill([short], 'BTC', 2)).toBe(short);
  });

  it('says it is open, or closed and when, and why the stop loss when both were reached', () => {
    expect(recordedText(null, vars, t, money, at)).toBe(
      'Long de BTC #2 registrado a 40.000,00 €. Lo ves en «Abiertas», con su resultado en directo.'
    );
    expect(nb(recordedText(fill(), vars, t, money, at))).toBe(
      'Según las velas desde tu hora de entrada, BTC #2 ya habría tocado su take profit el 11:00: se ha cerrado a 55.000,00 €. La ves en «Cerradas».'
    );
    expect(recordedText(fill({ type: 'stop', sameCandle: true }), vars, t, money, at)).toMatch(
      /stop loss el 11:00.*se ha tomado la más prudente\.$/
    );
  });

  it('announces a stop taken in the same candle among the news of the orders', () => {
    expect(fillText(fill({ type: 'stop', sameCandle: true }), t, money.price)).toMatch(
      /^El stop loss de tu posición de BTC #2 se ha ejecutado a .*la más prudente\.$/
    );
    expect(fillText(fill(), t, money.price)).not.toMatch(/prudente/);
  });

  it('writes a moment as the time field of the device does', () => {
    expect(toLocalInput(Date.parse('2026-03-05T09:07:00Z'))).toBe('2026-03-05T09:07');
  });
});

function setup(change?: (api: FakeApi) => void) {
  const api = createFakeApi();
  api.cryptoApi.portfolio.mockResolvedValue(practice());
  change?.(api);
  const view = renderWithProviders(<CryptoConsoleView />, { api });
  return { ...view, api };
}
const ready = async () => {
  await screen.findByRole('img', { name: /Gráfica de/ });
  await screen.findByText('Abiertas (1)');
};
const toRecord = () =>
  fireEvent.click(screen.getByRole('radio', { name: 'Registrar una que ya abrí' }));
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => screen.getByRole('button', { name: 'Registrar operación' });
const check = () => screen.getByRole('heading', { name: 'Antes de registrar' }).closest('div')!;

beforeEach(() => {
  localStorage.clear();
  charts.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
  delete (window as { IntersectionObserver?: unknown }).IntersectionObserver;
});

describe('Crypto console: registering a trade in a practice portfolio', () => {
  it('is only offered in a practice portfolio', async () => {
    setup((api) => api.cryptoApi.portfolio.mockResolvedValue(fx.portfolio()));
    await ready();
    expect(screen.queryByRole('radio', { name: 'Registrar una que ya abrí' })).toBeNull();
  });

  it('registers one at a chosen price and moment, and says it is open', async () => {
    const { api } = setup((a) => a.cryptoApi.recordTrade.mockResolvedValue(practice()));
    await ready();
    toRecord();
    expect(screen.getByText(/no se envía ninguna orden real/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir long/ })).toBeNull();
    expect(submit()).toBeDisabled();
    expect(check()).toHaveTextContent('Escribe el precio de entrada');

    fireEvent.click(screen.getByRole('button', { name: 'Usar el precio actual' }));
    expect(screen.getByLabelText('Precio de entrada')).toHaveValue('50000');
    type('Precio de entrada', '20000');
    expect(check()).toHaveTextContent('se aleja más de la mitad del precio actual');
    type('Precio de entrada', '40000');
    expect(check()).not.toHaveTextContent('se aleja');
    fireEvent.click(screen.getByRole('button', { name: '25 %' }));
    expect(screen.getByLabelText('Capital por operación')).toHaveValue('2247.5');
    type('Capital por operación', '1000');
    expect(nb(check().textContent)).toContain('Con el precio de ahora irías+247,75 € (+24,75 %)');
    type(/^Take profit/, '45000');
    expect(check()).toHaveTextContent('ese take profit ya se habría tocado');
    expect(screen.getByText(/Vacío: entra ahora/)).toBeInTheDocument();

    const moment = toLocalInput(Date.now() - HOUR);
    type('Hora de entrada (opcional)', moment);
    expect(screen.getByText(/se revisan las velas desde esa hora/)).toBeInTheDocument();
    expect(check()).not.toHaveTextContent('ya se habría tocado');
    type(/^Stop loss/, '30000');
    expect(nb(check().textContent)).toContain('Si llega al take profit');
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());
    await waitFor(() =>
      expect(api.cryptoApi.recordTrade).toHaveBeenCalledWith(fx.PRACTICE_REF.id, {
        symbol: 'BTC',
        direction: 'long',
        entryPrice: 40_000,
        amount: 1000,
        takeProfit: 45_000,
        stopLoss: 30_000,
        openedAt: new Date(moment).toISOString(),
      })
    );
    expect(
      await screen.findByText(
        'Long de BTC #2 registrado a 40.000,00 €. Lo ves en «Abiertas», con su resultado en directo.',
        { normalizer: nb }
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Precio de entrada')).toHaveValue('');
  });

  it('says when the candles since the entry closed it already', async () => {
    const closed = fill({ type: 'stop', price: 30_000, sameCandle: true });
    setup((a) => a.cryptoApi.recordTrade.mockResolvedValue(practice({ fills: [closed] })));
    await ready();
    toRecord();
    fireEvent.click(screen.getByRole('radio', { name: /Osos/ }));
    type('Precio de entrada', '45000');
    type('Capital por operación', '500');
    type('Hora de entrada (opcional)', toLocalInput(Date.now() - 2 * HOUR));
    fireEvent.click(screen.getByRole('button', { name: 'Ahora' }));
    expect(screen.getByLabelText('Hora de entrada (opcional)')).toHaveValue('');
    type('Hora de entrada (opcional)', toLocalInput(Date.now() - 2 * HOUR));
    fireEvent.click(submit());
    expect(await screen.findByText(/ya habría tocado su stop loss/)).toHaveTextContent(
      /se ha tomado la más prudente/
    );
  });

  it('shows why the API refused it and keeps what was typed', async () => {
    setup((a) =>
      a.cryptoApi.recordTrade.mockRejectedValue(
        new ApiError(
          'La cartera oficial del mes no admite operaciones registradas a mano.',
          400,
          'CRYPTO_RECORD_OFFICIAL'
        )
      )
    );
    await ready();
    toRecord();
    type('Precio de entrada', '40000');
    type('Capital por operación', '100');
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('no admite operaciones registradas');
    expect(screen.getByLabelText('Precio de entrada')).toHaveValue('40000');
  });

  it('is off without the price and with two operations of the coin', async () => {
    setup((a) => {
      a.cryptoApi.coins.mockResolvedValue({
        ...fx.coins(),
        coins: fx.coins().coins.map((c) => ({ ...c, price: null })),
      });
      a.cryptoApi.portfolio.mockResolvedValue(
        practice({
          open: [fx.portfolio().open[0], { ...fx.portfolio().open[0], id: 'p2', slot: 2 }],
        })
      );
    });
    await screen.findByRole('img', { name: /Gráfica de/ });
    await screen.findByText('Abiertas (2)');
    toRecord();
    expect(screen.queryByRole('button', { name: 'Usar el precio actual' })).toBeNull();
    expect(check()).toHaveTextContent('no tenemos el precio');
    expect(screen.getByText(/Ya tienes 2 de 2 operaciones de BTC/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('tells registered trades apart on their cards and in the history', async () => {
    setup((a) =>
      a.cryptoApi.portfolio.mockResolvedValue(
        practice({
          open: [{ ...fx.portfolio().open[0], recorded: true }],
          closed: [
            {
              id: 'c1',
              symbol: 'ETH',
              slot: 1,
              direction: 'long',
              quantity: 0.5,
              entryPrice: 1_800,
              exitPrice: 2_000,
              invested: 900,
              fees: 1.9,
              proceeds: 999,
              pnl: 98.1,
              pnlPercent: 10.88,
              openType: 'market',
              closeType: 'limit',
              openedAt: '2026-03-15T10:00:00.000Z',
              closedAt: '2026-03-15T11:00:00.000Z',
              recorded: true,
              transfer: null,
            },
          ],
        })
      )
    );
    await ready();
    const badges = screen.getAllByText('Registrada');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveAttribute(
      'title',
      expect.stringMatching(/precio de entrada que elegiste/)
    );
  });
});

describe('Crypto console: open trades follow the live price', () => {
  it('moves the result of the card with each tick', async () => {
    let tick = fx.live(60_000);
    const api = createFakeApi();
    api.cryptoApi.portfolio.mockResolvedValue(practice());
    api.cryptoApi.live.mockImplementation(() => Promise.resolve(tick));
    jest.useFakeTimers();
    renderWithProviders(<CryptoConsoleView />, { api });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    await screen.findByText('Abiertas (1)');
    await act(async () => {
      await jest.advanceTimersByTimeAsync(LIVE_REFRESH_MS);
    });
    const card = () => document.querySelector('.cc-trade--open') as HTMLElement;
    await waitFor(() => expect(nb(card().textContent)).toContain('+197,80 €'));
    tick = fx.live(45_000, { seconds: 4 });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(LIVE_REFRESH_MS);
    });
    await waitFor(() => expect(nb(card().textContent)).toContain('−101,90 €'));
    expect(within(card()).getByText('−101,90 €', { normalizer: nb })).toHaveClass('cc-big');
  });

  it('keeps the tick on while the open trades of the coin are on screen', async () => {
    const watched: { cb: (e: { isIntersecting: boolean }[]) => void; gone: boolean }[] = [];
    Object.assign(window, {
      IntersectionObserver: class {
        entry: (typeof watched)[number];
        constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
          this.entry = { cb, gone: false };
          watched.push(this.entry);
        }
        observe() {}
        disconnect() {
          this.entry.gone = true;
        }
      },
    });
    const api = createFakeApi();
    api.cryptoApi.portfolio.mockResolvedValue(practice());
    api.cryptoApi.live.mockResolvedValue(fx.live(60_000));
    const view = renderWithProviders(<CryptoConsoleView />, { api });
    await ready();
    expect(api.cryptoApi.live).not.toHaveBeenCalled();
    // The last observer is the panel of open trades (the chart's came first).
    act(() =>
      watched
        .filter((w) => !w.gone)
        .at(-1)!
        .cb([{ isIntersecting: true }])
    );
    await waitFor(() => expect(api.cryptoApi.live).toHaveBeenCalled());
    view.unmount();
    expect(watched.every((w) => w.gone)).toBe(true);
  });
});
