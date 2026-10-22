import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { translate } from '@core/i18n/I18nContext';
import { savedLayers } from '@modules/crypto/application/useLayers';
import { EURO } from '@modules/crypto/domain/currency';
import type {
  ClosedTrade,
  CryptoCandles,
  CryptoCoins,
  OpenTrade,
  PendingOrder,
  SimFill,
  SimPortfolio,
} from '@modules/crypto/domain/types';
import {
  CryptoConsoleView,
  chartLines,
  fillText,
  savedView,
} from '@modules/crypto/ui/CryptoConsoleView';
import { makeMoney } from '@modules/crypto/ui/money';
import { historyTable } from '@modules/crypto/ui/SimSummary';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';
import { charts } from '../../__mocks__/lightweightCharts';

// Every price, amount and operation here is made up.
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');
const t = (key: string, vars?: Record<string, string | number>) => translate('es', key, vars);

function setup(change?: (api: FakeApi) => void) {
  const api = createFakeApi();
  change?.(api);
  const view = renderWithProviders(<CryptoConsoleView />, { api });
  return { ...view, api };
}

const order = (o: Partial<PendingOrder>): PendingOrder => ({
  id: 'o1',
  symbol: 'BTC',
  side: 'buy',
  direction: 'long',
  type: 'limit',
  price: 45_000,
  amount: 900,
  reserved: 900.9,
  positionId: null,
  takeProfit: null,
  stopLoss: null,
  createdAt: '2026-03-15T12:00:00.000Z',
  expiresAt: '2026-04-14T12:00:00.000Z',
  currentPrice: 50_000,
  ...o,
});

const short: OpenTrade = {
  ...fx.portfolio().open[0],
  id: 's1',
  direction: 'short',
  liquidationPrice: 100_000,
  pnl: -97.9,
  pnlPercent: -9.78,
};

const closed = (i: number, pnl: number, extra: Partial<ClosedTrade> = {}): ClosedTrade => ({
  id: `c${i}`,
  symbol: 'ETH',
  direction: 'long',
  quantity: 0.5,
  entryPrice: 2_000,
  exitPrice: 2_000 + pnl * 2,
  invested: 1_000,
  fees: 2,
  proceeds: 1_000 + pnl,
  pnl,
  pnlPercent: pnl / 10,
  openType: 'market',
  closeType: i % 2 ? 'limit' : 'stop',
  openedAt: '2026-03-10T12:00:00.000Z',
  closedAt: '2026-03-11T12:00:00.000Z',
  ...extra,
});

const withPortfolio = (p: Partial<SimPortfolio>) => (api: FakeApi) =>
  api.cryptoApi.portfolio.mockResolvedValue(fx.portfolio(p));

const capital = () => screen.getByLabelText('Capital por operación');
const openButton = () => screen.getByRole('button', { name: /Abrir (long|short)/ });
const check = () => screen.getByRole('heading', { name: 'Antes de abrir' }).closest('div')!;
const ready = async () => {
  await screen.findByRole('img', { name: /Gráfica de/ });
  await screen.findByText('Abiertas (1)');
};

const phone = (matches: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches && query.includes('max-width: 719px') && !query.includes('orientation'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });

beforeEach(() => {
  localStorage.clear();
  charts.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('Crypto console: market', () => {
  it('shows the risk notice, the coins, the price with its figures and the chart', async () => {
    setup();
    expect(screen.getByRole('note', { name: 'Aviso importante' })).toHaveTextContent(
      /Operar en corto o con apalancamiento en el mercado real puede hacer perder más de lo invertido/
    );
    expect(screen.getByText('Cargando precios…')).toBeInTheDocument();
    await ready();
    expect(screen.getByText(/Precios públicos de Binance en euros/)).toBeInTheDocument();
    expect(nb(document.querySelector('.cc-quote-price')!.textContent)).toBe('50.000,00 €');
    expect(nb(screen.getByText(/en 24 horas/).textContent)).toBe('+1,50 % en 24 horas');
    const stats = document.querySelector('.cc-stats')!;
    expect(nb(stats.textContent)).toContain('49.990,00 €');
    expect(nb(stats.textContent)).toContain('12.345.678,00 €');
    expect(screen.getByText(/La vela cierra en/)).toBeInTheDocument();
    expect(screen.queryByText(/Cambio en lo que ves/)).toBeNull();
    act(() => charts[charts.length - 1].show({ from: 0, to: 1 }));
    expect(nb(screen.getByText(/Cambio en lo que ves/).textContent)).toBe(
      'Cambio en lo que ves: +0,50 %'
    );
    expect(screen.getByRole('button', { name: /Bitcoin/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByText('Ver las últimas 5 velas en una tabla'));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Palabras de la consola' })).toBeInTheDocument();
  });

  it('changes coin and candle size, and remembers them on this device', async () => {
    const { api, unmount } = setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: /Ethereum/ }));
    fireEvent.click(screen.getByRole('radio', { name: '1 día' }));
    await screen.findByRole('img', { name: 'Gráfica de Ethereum, velas de 1 día' });
    expect(api.cryptoApi.candles).toHaveBeenLastCalledWith('ETH', '1d');
    expect(nb(document.querySelector('.cc-stats')!.textContent)).toContain('—');
    unmount();
    expect(savedView()).toEqual({ symbol: 'ETH', interval: '1d' });
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: '<b>', interval: '2h' }));
    expect(savedView()).toEqual({ symbol: 'BTC', interval: '1h' });
    localStorage.setItem('mm_crypto_view', '{');
    expect(savedView()).toEqual({ symbol: 'BTC', interval: '1h' });
  });

  it('pages the coins on wide screens and slides them all on phones', async () => {
    const many: CryptoCoins = {
      ...fx.coins(),
      coins: Array.from({ length: 10 }, (_, i) => ({
        ...fx.coins().coins[0],
        symbol: `C${String.fromCharCode(65 + i)}X`,
        name: `Coin ${i}`,
      })),
    };
    const { unmount } = setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    await screen.findByText('Coin 0');
    expect(screen.queryByText('Coin 9')).toBeNull();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Coin 9')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Coin 0')).toBeInTheDocument();
    unmount();
    // The page with the chosen coin opens first.
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'CJX', interval: '1h' }));
    const chosen = setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    expect(await screen.findByRole('button', { name: /Coin 9/ })).toBeInTheDocument();
    chosen.unmount();
    localStorage.clear();
    phone(true);
    setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    await screen.findByText('Coin 9');
    expect(screen.getByText('Coin 0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
  });

  it('shows a coin without a price, and nothing while the prices load', async () => {
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'SHIB', interval: '1h' }));
    const { unmount } = setup();
    await screen.findByRole('img', { name: /Shiba Inu/ });
    expect(document.querySelector('.cc-quote-price')!.textContent).toBe('—');
    expect(screen.queryByText(/en 24 horas/)).toBeNull();
    unmount();
    localStorage.clear();
    setup((api) => api.cryptoApi.coins.mockReturnValue(new Promise(() => undefined)));
    expect(screen.queryByRole('button', { name: /Bitcoin/ })).toBeNull();
    expect(document.querySelector('.cc-quote-name')!.textContent).toContain('BTC');
  });

  it('explains when the market data cannot be loaded and lets the person retry', async () => {
    const { api } = setup((a) => {
      a.cryptoApi.candles.mockRejectedValue(
        new ApiError('Sin datos de mercado', 503, 'MARKET_UNAVAILABLE')
      );
      a.cryptoApi.coins.mockRejectedValue(new Error('down'));
    });
    expect(await screen.findByText('Sin datos de mercado')).toBeInTheDocument();
    api.cryptoApi.candles.mockRejectedValueOnce(new Error(''));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('No se han podido cargar los precios.')).toBeInTheDocument();
    api.cryptoApi.candles.mockResolvedValue(fx.candles());
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('img', { name: 'Gráfica de BTC, velas de 1 hora' })
    ).toBeInTheDocument();
  });

  it('warns about old or missing data, and says when the prices are invented', async () => {
    const { unmount } = setup((api) =>
      api.cryptoApi.candles.mockResolvedValue({
        ...fx.candles(),
        market: { ...fx.MARKET, stale: true },
      })
    );
    expect(await screen.findByText(/La fuente no responde: ves los datos de/)).toBeInTheDocument();
    unmount();
    const down = { ...fx.MARKET, available: false, updatedAt: null };
    const second = setup((api) => {
      api.cryptoApi.candles.mockRejectedValue(new Error('x'));
      api.cryptoApi.coins.mockResolvedValue({ ...fx.coins(), market: down });
    });
    expect(await screen.findByText(/Ahora no hay datos de mercado/)).toBeInTheDocument();
    second.unmount();
    setup((api) =>
      api.cryptoApi.candles.mockResolvedValue({
        ...fx.candles(),
        market: { ...fx.MARKET, source: 'demo' },
      })
    );
    expect(await screen.findByText(/Precios inventados de demostración/)).toBeInTheDocument();
  });

  it('only shows the newest answer when the coin changes quickly', async () => {
    let late: (value: CryptoCandles) => void = () => undefined;
    let lateCoins: (value: CryptoCoins) => void = () => undefined;
    let lateFail: (reason: unknown) => void = () => undefined;
    const { api } = setup((a) => {
      a.cryptoApi.candles
        .mockImplementationOnce(() => new Promise((resolve) => (late = resolve)))
        .mockImplementationOnce(() => new Promise((_, reject) => (lateFail = reject)));
      a.cryptoApi.coins
        .mockResolvedValueOnce(fx.coins())
        .mockImplementationOnce(() => new Promise((resolve) => (lateCoins = resolve)));
    });
    fireEvent.click(await screen.findByRole('button', { name: /Ethereum/ }));
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/ }));
    await screen.findByRole('img', { name: /Bitcoin/ });
    await act(async () => {
      late(fx.candles('BTC', '1h', 2));
      lateCoins({ ...fx.coins(), coins: [] });
      lateFail(new Error('old'));
    });
    expect(api.cryptoApi.candles).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('old')).toBeNull();
    expect(screen.getByRole('button', { name: /Ethereum/ })).toBeInTheDocument();
  });

  it('refreshes while on screen and not while hidden, and counts down the candle', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-03-15T14:30:00Z'));
    const { api } = setup();
    await act(async () => undefined);
    await act(async () => undefined);
    const before = api.cryptoApi.portfolio.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(api.cryptoApi.portfolio.mock.calls.length).toBe(before + 1);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(api.cryptoApi.portfolio.mock.calls.length).toBe(before + 1);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(api.cryptoApi.portfolio.mock.calls.length).toBe(before + 2);
    expect(screen.getByText(/La vela cierra en/)).toHaveTextContent('00:00');
  });
});

describe('Crypto console: layers, guide and currency', () => {
  it('turns layers on and off and remembers them', async () => {
    setup();
    await ready();
    const ema = screen.getByRole('button', { name: 'EMA 20' });
    expect(ema).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(ema);
    expect(ema).toHaveAttribute('aria-pressed', 'true');
    expect(savedLayers()).toEqual(['ema20']);
    fireEvent.click(ema);
    expect(savedLayers()).toEqual([]);
    localStorage.setItem('mm_crypto_layers', '{"a":1}');
    expect(savedLayers()).toEqual([]);
    localStorage.setItem('mm_crypto_layers', '[');
    expect(savedLayers()).toEqual([]);
    localStorage.setItem('mm_crypto_layers', '["vwap","nope"]');
    expect(savedLayers()).toEqual(['vwap']);
  });

  it('opens the guide from the big button and from each «?», and closes it', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: '¿Qué es cada cosa?' }));
    const dialog = await screen.findByRole('dialog', { name: '¿Qué es cada cosa?' });
    expect(
      within(dialog).getByRole('heading', { name: 'Toros y osos: long y short' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/Un patrón no garantiza lo que pasará después/)
    ).toHaveLength(2);
    expect(within(dialog).getByText(/Finanverso no lo ofrece/)).toBeInTheDocument();
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retrocesos de Fibonacci' }));
    expect(scroll).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '¿Qué es Bandas de Bollinger?' }));
    await screen.findByRole('dialog');
    expect(scroll).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('shows everything in dollars with the ECB rate, and sends euros', async () => {
    const { api } = setup((a) =>
      a.ratesApi.get.mockResolvedValue({ from: 'EUR', to: 'USD', rate: 1.1 })
    );
    await ready();
    fireEvent.click(screen.getByRole('radio', { name: '$ USD' }));
    expect(
      await screen.findByText(/Conversión informativa al cambio del BCE de hoy/)
    ).toBeInTheDocument();
    expect(api.ratesApi.get).toHaveBeenCalledWith('EUR', 'USD');
    expect(nb(document.querySelector('.cc-quote-price')!.textContent)).toBe('55.000,00 US$');
    fireEvent.change(capital(), { target: { value: '110' } });
    fireEvent.click(openButton());
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
        action: 'buy',
        symbol: 'BTC',
        direction: 'long',
        type: 'market',
        amount: 100,
      })
    );
    expect(localStorage.getItem('mm_crypto_currency')).toBe('USD');
    fireEvent.click(screen.getByRole('radio', { name: '€ EUR' }));
    expect(nb(document.querySelector('.cc-quote-price')!.textContent)).toBe('50.000,00 €');
  });

  it('keeps euros and says so when the dollar rate is not available', async () => {
    localStorage.setItem('mm_crypto_currency', 'USD');
    const { unmount } = setup((a) => a.ratesApi.get.mockRejectedValue(new Error('down')));
    expect(await screen.findByText(/no tenemos el cambio a dólares/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '$ USD' })).toBeChecked();
    unmount();
    let resolve: (v: { from: string; to: string; rate: number }) => void = () => undefined;
    const late = setup((a) => a.ratesApi.get.mockReturnValue(new Promise((r) => (resolve = r))));
    late.unmount();
    await act(async () => resolve({ from: 'EUR', to: 'USD', rate: 1.2 }));
    let reject: (e: unknown) => void = () => undefined;
    const failing = setup((a) =>
      a.ratesApi.get.mockReturnValue(new Promise((_, r) => (reject = r)))
    );
    failing.unmount();
    await act(async () => reject(new Error('late')));
  });
});

describe('Crypto console: opening positions', () => {
  it('says how the simulation is going', async () => {
    setup(
      withPortfolio({
        summary: { ...fx.portfolio().summary, winRate: 66.7, wins: 2, losses: 1, trades: 3 },
      })
    );
    expect(nb((await screen.findByText(/Si vendieras todo ahora tendrías/)).textContent)).toBe(
      'Si vendieras todo ahora tendrías 97,90 € más que al empezar (+0,98 %).'
    );
    expect(nb(screen.getByText(/66,7 %/).textContent)).toBe(
      '66,7 % (2 con ganancia, 1 con pérdida)'
    );
  });

  it('says when it would lose, when there are no prices and when the money ran out', async () => {
    const { unmount } = setup(
      withPortfolio({ summary: { ...fx.portfolio().summary, total: -50, totalPercent: -0.5 } })
    );
    expect(nb((await screen.findByText(/menos que al empezar/)).textContent)).toMatch(
      /50,00 € menos/
    );
    unmount();
    setup(
      withPortfolio({
        account: { ...fx.portfolio().account, cash: 0.5 },
        open: [
          {
            ...fx.portfolio().open[0],
            currentPrice: null,
            value: null,
            pnl: null,
            pnlPercent: null,
          },
        ],
        summary: {
          ...fx.portfolio().summary,
          equity: null,
          unrealized: null,
          total: null,
          totalPercent: null,
        },
      })
    );
    expect(
      await screen.findByText('Sin precios ahora no podemos calcular el resultado.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar ahora (simulado)' })).toBeDisabled();
    expect(screen.getByText('Te has quedado sin dinero ficticio.')).toBeInTheDocument();
  });

  it('shows the error when the simulator cannot be loaded', async () => {
    setup((api) => api.cryptoApi.portfolio.mockRejectedValue(new Error('')));
    expect(await screen.findByText('No se ha podido cargar tu simulador.')).toBeInTheDocument();
  });

  it('opens a long at market with its estimate, take profit and stop loss', async () => {
    const { api } = setup();
    await ready();
    expect(nb(document.querySelector('.cc-strips')!.textContent)).toContain(
      'Capital inicial10.000,00 €'
    );
    fireEvent.click(screen.getByRole('button', { name: '25 %' }));
    expect(capital()).toHaveValue('2247.5');
    fireEvent.change(capital(), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Take profit (opcional)'), {
      target: { value: '55000' },
    });
    fireEvent.change(screen.getByLabelText('Stop loss (opcional)'), {
      target: { value: '45000' },
    });
    const box = nb(check().textContent);
    expect(box).toContain('Todo listo');
    expect(box).toContain('Total que se aparta (importe y comisión)1.001,00 €');
    expect(box).toContain('Si llega al take profit+97,90 €');
    expect(box).toContain('Si llega al stop loss-101,90 €');
    fireEvent.click(openButton());
    expect(
      await screen.findByText('Long simulado de Bitcoin abierto. Lo ves en «Abiertas».')
    ).toBeInTheDocument();
    expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
      action: 'buy',
      symbol: 'BTC',
      direction: 'long',
      type: 'market',
      amount: 1000,
      takeProfit: 55_000,
      stopLoss: 45_000,
    });
    expect(capital()).toHaveValue('');
    const help = screen.getByRole('button', { name: '¿Qué es la comisión?' });
    fireEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a pending short and checks every field live', async () => {
    const { api } = setup();
    await ready();
    expect(openButton()).toBeDisabled();
    expect(check()).toHaveTextContent('Escribe cuánto quieres usar');
    fireEvent.click(screen.getByRole('radio', { name: /Osos · Short/ }));
    expect(
      screen.getByText(/Short: vendes y ganarías si el precio baja/, { selector: 'p' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Límite' }));
    fireEvent.change(capital(), { target: { value: '500' } });
    expect(check()).toHaveTextContent('Escribe el precio de la orden');
    const price = screen.getByLabelText('Abrir si el precio sube a');
    fireEvent.change(price, { target: { value: '49000' } });
    expect(check()).toHaveTextContent('se abriría al momento');
    fireEvent.change(price, { target: { value: '52000' } });
    fireEvent.change(screen.getByLabelText('Take profit (opcional)'), {
      target: { value: '60000' },
    });
    expect(check()).toHaveTextContent('En un short, el take profit tiene que estar por debajo');
    fireEvent.change(screen.getByLabelText('Take profit (opcional)'), {
      target: { value: '48000' },
    });
    expect(nb(check().textContent)).toContain('Se cerraría sola (garantía agotada) a104.000,00 €');
    fireEvent.change(capital(), { target: { value: '20000' } });
    expect(check()).toHaveTextContent('para la garantía y la comisión');
    fireEvent.change(capital(), { target: { value: '500' } });
    fireEvent.click(openButton());
    expect(await screen.findByText(/Orden short de Bitcoin guardada/)).toBeInTheDocument();
    expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
      action: 'buy',
      symbol: 'BTC',
      direction: 'short',
      type: 'limit',
      amount: 500,
      price: 52_000,
      takeProfit: 48_000,
    });
  });

  it('keeps the form when the API refuses it', async () => {
    const { api } = setup((a) =>
      a.cryptoApi.placeOrder.mockRejectedValue(new ApiError('Los precios no están al día', 503))
    );
    await ready();
    fireEvent.click(screen.getByRole('radio', { name: 'Stop' }));
    fireEvent.change(capital(), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Abrir cuando el precio suba a'), {
      target: { value: '52000' },
    });
    fireEvent.click(openButton());
    expect(await screen.findByText('Los precios no están al día')).toBeInTheDocument();
    expect(capital()).toHaveValue('10');
    expect(api.cryptoApi.placeOrder).toHaveBeenCalled();
  });

  it('does not open a coin without a price', async () => {
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'SHIB', interval: '1h' }));
    setup();
    await screen.findByText('Abiertas (1)');
    fireEvent.change(capital(), { target: { value: '10' } });
    expect(check()).toHaveTextContent('no tenemos el precio de esta moneda');
    expect(document.querySelector('.cc-auto')!.textContent).toContain('—');
    expect(document.querySelector('.cc-order-asset')!.textContent).toContain('—');
  });
});

describe('Crypto console: open, pending and closed', () => {
  it('closes now and schedules a close for a long and for a short', async () => {
    const both = fx.portfolio({ open: [fx.portfolio().open[0], short] });
    const { api } = setup((a) => {
      a.cryptoApi.portfolio.mockResolvedValue(both);
      a.cryptoApi.placeOrder.mockResolvedValue(both);
    });
    await screen.findByText('Abiertas (2)');
    expect(screen.getAllByText('Long', { selector: '.cc-dir' })).toHaveLength(1);
    expect(nb(screen.getByText('Se cerraría sola a').nextSibling!.textContent)).toBe(
      '100.000,00 €'
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar ahora (simulado)' })[0]);
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
        action: 'sell',
        positionId: 'p1',
        type: 'market',
      })
    );
    const schedule = screen.getAllByRole('button', { name: 'Programar el cierre' })[1];
    fireEvent.click(schedule);
    expect(schedule).toHaveAttribute('aria-expanded', 'true');
    const save = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Guardar la orden de cierre' }));
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el precio de la orden');
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '56000' } });
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('se cerraría al momento');
    fireEvent.click(screen.getByLabelText('si sube a (stop loss)'));
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '60000' } });
    save();
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenLastCalledWith({
        action: 'sell',
        positionId: 's1',
        type: 'stop',
        price: 60_000,
      })
    );
    await waitFor(() => expect(screen.queryByLabelText('Precio (€)')).toBeNull());
  });

  it('keeps the close form when the API refuses it, and skips the check without a price', async () => {
    const open = { ...fx.portfolio().open[0], currentPrice: null };
    const { api } = setup((a) => {
      withPortfolio({ open: [open] })(a);
      a.cryptoApi.placeOrder.mockRejectedValue(new Error('no'));
    });
    await screen.findByText('Abiertas (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Programar el cierre' }));
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la orden de cierre' }));
    await waitFor(() => expect(api.cryptoApi.placeOrder).toHaveBeenCalled());
    expect(screen.getByLabelText('Precio (€)')).toBeInTheDocument();
  });

  it('lists pending orders that open and that close, draws them and cancels them', async () => {
    const pending = [
      order({ id: 'o1', takeProfit: 52_000, stopLoss: 40_000 }),
      order({
        id: 'o2',
        side: 'sell',
        type: 'stop',
        price: 45_000,
        amount: null,
        reserved: 0,
        positionId: 'p1',
        currentPrice: null,
      }),
      order({
        id: 'o3',
        type: 'limit',
        price: 60_000,
        amount: null,
        reserved: 0,
        positionId: 'p1',
      }),
      order({ id: 'o4', symbol: 'ETH', direction: 'short', side: 'sell', price: 2_500 }),
    ];
    const { api } = setup(withPortfolio({ pending }));
    expect(await screen.findByText('Pendientes (4)')).toBeInTheDocument();
    expect(nb(screen.getByText(/^Cierres programados:/).textContent)).toBe(
      'Cierres programados: Stop loss 45.000,00 € · Take profit 60.000,00 €'
    );
    const pendingPanel = screen.getByText('Pendientes (4)').closest('section')!;
    expect(within(pendingPanel).getAllByText('Reservado')).toHaveLength(2);
    expect(screen.getByText('Abrir short (límite)')).toBeInTheDocument();
    await screen.findByRole('img', { name: /Bitcoin/ });
    const candleSeries = charts[charts.length - 1].series.find((s) => s.kind === 'Candlestick')!;
    await waitFor(() =>
      expect(candleSeries.lines.filter((l) => !l.removed).map((l) => l.options.title)).toEqual([
        'Entrada long',
        'Abrir long (límite)',
        'SL',
        'TP',
      ])
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Stop loss BTC' }));
    await waitFor(() => expect(api.cryptoApi.cancelOrder).toHaveBeenCalledWith('o2'));
  });

  it('shows empty panels and the closed operations, ten at a time', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      closed(i, i % 3 ? 10 : -5, i === 0 ? { direction: 'short', closeType: 'liquidation' } : {})
    );
    setup(withPortfolio({ open: [], closed: many }));
    expect(await screen.findByText('Todavía no tienes posiciones abiertas.')).toBeInTheDocument();
    expect(screen.getByText('No tienes órdenes esperando.')).toBeInTheDocument();
    expect(screen.getByText(/Garantía agotada/)).toBeInTheDocument();
    const list = () => screen.getByText('Cerradas (12)').closest('section')!.querySelectorAll('li');
    expect(list()).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(list()).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
  });

  it('says when there is nothing closed yet', async () => {
    setup();
    expect(await screen.findByText(/Cuando cierres una posición/)).toBeInTheDocument();
  });

  it('announces orders filled, expired or closed by themselves since the last look', async () => {
    const fill = (f: Partial<SimFill>): SimFill => ({
      orderId: 'x',
      symbol: 'BTC',
      side: 'buy',
      direction: 'long',
      type: 'limit',
      price: 45_000,
      at: 'x',
      ...f,
    });
    const fills = [
      fill({ orderId: 'a' }),
      fill({ orderId: 'b', side: 'sell', type: 'stop' }),
      fill({ orderId: 'c', direction: 'short', type: 'liquidation', price: 100_000 }),
      fill({ orderId: 'd', type: 'expired', price: null }),
    ];
    const { api } = setup(withPortfolio({ fills }));
    const box = await screen.findByText('Novedades de tus órdenes');
    const items = [...box.closest('div')!.querySelectorAll('li')].map((li) => nb(li.textContent));
    expect(items).toEqual([
      'Se ha abierto tu long de BTC a 45.000,00 €.',
      'El stop loss de tu posición de BTC se ha ejecutado a 45.000,00 €.',
      'Tu short de BTC se ha cerrado solo a 100.000,00 €: el precio llegó al doble y su garantía se agotó.',
      'Una orden de BTC ha caducado. Si reservaba dinero, ha vuelto a tu saldo.',
    ]);
    api.cryptoApi.placeOrder.mockResolvedValue(fx.portfolio());
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ahora (simulado)' }));
    await waitFor(() => expect(screen.queryByText('Novedades de tus órdenes')).toBeNull());
  });
});

describe('Crypto console: history and settings', () => {
  it('changes the commission and starts again after confirming', async () => {
    const { api } = setup();
    await screen.findByText('Abiertas (1)');
    fireEvent.click(screen.getByRole('radio', { name: /^0,25/ }));
    await waitFor(() => expect(api.cryptoApi.setFee).toHaveBeenCalledWith(25));
    fireEvent.click(screen.getByRole('radio', { name: /^1\.000,00/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    const dialog = screen.getByRole('dialog');
    expect(nb(dialog.textContent)).toMatch(/empezarás con 1.000,00 € ficticios/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, empezar de nuevo' }));
    await waitFor(() => expect(api.cryptoApi.reset).toHaveBeenCalledWith(1000, 10));
    expect(await screen.findByText('Abiertas (0)')).toBeInTheDocument();
  });

  it('downloads the history as CSV', async () => {
    const createObjectURL = jest.fn((_blob: Blob) => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    setup(withPortfolio({ closed: [closed(1, 10)] }));
    await screen.findByText('Cerradas (1)');
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(createObjectURL.mock.calls[0][0]);
    });
    expect(text).toContain('"Estado";"Moneda"');
    expect(text).toContain('"Precio de compra (€)"');
    expect(text).toContain('"Cerrada";"ETH"');
    click.mockRestore();
  });

  it('ignores answers that arrive after leaving the console', async () => {
    let resolve: (value: SimPortfolio) => void = () => undefined;
    let reject: (reason: unknown) => void = () => undefined;
    const first = setup((api) =>
      api.cryptoApi.portfolio.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    );
    first.unmount();
    await act(async () => resolve(fx.portfolio()));
    const second = setup((api) =>
      api.cryptoApi.portfolio.mockImplementationOnce(() => new Promise((_, r) => (reject = r)))
    );
    second.unmount();
    await act(async () => reject(new Error('late')));
    expect(screen.queryByText('late')).toBeNull();
  });
});

describe('Crypto console: helpers', () => {
  it('builds the history table in the chosen currency', () => {
    const p = fx.portfolio({ closed: [closed(1, 10)] });
    const table = historyTable(p, t, 'es', { currency: 'USD', rate: 2 });
    expect(table.head[3]).toBe('Precio de compra ($)');
    expect(table.rows[0].slice(0, 4)).toEqual([
      'Abierta (resultado si se vendiera ahora)',
      'BTC',
      0.02,
      100_000,
    ]);
    expect(table.rows[1].slice(6, 12)).toEqual([
      4040,
      expect.stringContaining('2026'),
      'Límite',
      2000,
      4,
      20,
    ]);
    const noPrice = historyTable(
      fx.portfolio({ open: [{ ...p.open[0], currentPrice: null, pnl: null }] }),
      t,
      'es',
      EURO
    );
    expect(noPrice.rows[0][6]).toBeNull();
    expect(noPrice.rows[0][11]).toBeNull();
  });

  it('draws lines only for the chosen coin, converted', () => {
    const money = makeMoney({ currency: 'USD', rate: 2 }, 'es');
    expect(chartLines(null, 'BTC', t, money)).toEqual([]);
    const lines = chartLines(
      fx.portfolio({ pending: [order({}), order({ id: 'x', symbol: 'ETH' })] }),
      'BTC',
      t,
      money
    );
    expect(lines.map((l) => [l.kind, l.price])).toEqual([
      ['entry', 100_000],
      ['order', 90_000],
    ]);
    const take: SimFill = {
      orderId: 'z',
      symbol: 'ETH',
      side: 'sell',
      direction: 'long',
      type: 'limit',
      price: 1,
      at: '',
    };
    expect(fillText(take, t, money.price)).toMatch(/take profit/);
  });
});
