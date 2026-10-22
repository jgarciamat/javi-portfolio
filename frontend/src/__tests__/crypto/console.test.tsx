import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { translate } from '@core/i18n/I18nContext';
import { savedLayers } from '@modules/crypto/application/useLayers';
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
import { FALLBACK_ROWS, rowsThatFit } from '@modules/crypto/ui/CoinList';
import { makeMoney } from '@modules/crypto/ui/money';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { mockMatchMedia } from '@test-utils/dom';
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
const LEARN = 'Antes de empezar a jugar, aprende todo sobre el análisis de criptomonedas';
const learn = () => screen.getByRole('region', { name: LEARN });
const opener = () => screen.getByRole('button', { name: 'Aprende antes de jugar' });
const ready = async () => {
  await screen.findByRole('img', { name: /Gráfica de/ });
  await screen.findByText('Abiertas (1)');
};

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

  const many: CryptoCoins = {
    ...fx.coins(),
    coins: Array.from({ length: 30 }, (_, i) => ({
      ...fx.coins().coins[0],
      symbol: `C${String.fromCharCode(65 + (i % 26), 65 + Math.floor(i / 26))}X`,
      name: `Coin ${i}`,
    })),
  };
  const coinNav = () => screen.getByRole('navigation', { name: 'Monedas' });
  const shownCoins = () => within(within(coinNav()).getByRole('list')).getAllByRole('button');

  it('pages the coins beside the chart, starting on the page of the chosen one', async () => {
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'CDBX', interval: '1h' }));
    setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    expect(await screen.findByRole('button', { name: /Coin 29/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Until the column is measured, pages of FALLBACK_ROWS rows: 30 coins, 4 pages.
    expect(FALLBACK_ROWS).toBe(8);
    expect(shownCoins()).toHaveLength(6);
    expect(within(coinNav()).getByText('4 / 4')).toBeInTheDocument();
    const prev = within(coinNav()).getByRole('button', { name: 'Ant. Página anterior de monedas' });
    const next = within(coinNav()).getByRole('button', {
      name: 'Sig. Página siguiente de monedas',
    });
    expect(next).toBeDisabled();
    fireEvent.click(prev);
    expect(within(coinNav()).getByText('3 / 4')).toBeInTheDocument();
    expect(shownCoins()[0]).toHaveTextContent('Coin 16');
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(prev).toBeDisabled();
    expect(shownCoins()).toHaveLength(8);
    fireEvent.click(next);
    expect(shownCoins()[0]).toHaveTextContent('Coin 8');
    fireEvent.click(screen.getByRole('button', { name: /Coin 9/ }));
    expect(screen.getByRole('button', { name: /Coin 9/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(coinNav()).getByText('2 / 4')).toBeInTheDocument();
  });

  it('fits as many whole rows as the column holds, and measures again when it resizes', async () => {
    const observers: (() => void)[] = [];
    Object.assign(window, {
      ResizeObserver: class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    });
    let height = 300;
    const tall = jest
      .spyOn(Element.prototype, 'clientHeight', 'get')
      .mockImplementation(() => height);
    const row = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(44);
    const { unmount } = setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    await screen.findByRole('button', { name: /Coin 0/ });
    expect(shownCoins()).toHaveLength(6);
    const list = within(coinNav()).getByRole('list');
    list.style.rowGap = '6px';
    list.style.paddingTop = '4px';
    height = 200;
    act(() => observers.forEach((measure) => measure()));
    expect(shownCoins()).toHaveLength(4);
    height = 2_000;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(shownCoins()).toHaveLength(30);
    expect(within(coinNav()).queryByRole('button', { name: /^Sig\./ })).toBeNull();
    unmount();
    tall.mockRestore();
    row.mockRestore();
    delete (window as { ResizeObserver?: unknown }).ResizeObserver;
    expect(rowsThatFit(0, 44, 6)).toBe(FALLBACK_ROWS);
    expect(rowsThatFit(30, 44, 6)).toBe(1);
  });

  it('on phones, every coin in a row that slides, keeping the chosen one in sight', async () => {
    const restore = mockMatchMedia(true);
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'CDBX', interval: '1h' }));
    setup((api) => api.cryptoApi.coins.mockResolvedValue(many));
    expect(await screen.findByRole('button', { name: /Coin 29/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(shownCoins()).toHaveLength(30);
    expect(within(coinNav()).queryByRole('button', { name: /^Ant\./ })).toBeNull();
    restore();
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

  it('opens the words of the console in the guide, from the foot and from the order box', async () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    setup();
    await ready();
    expect(screen.queryByRole('heading', { name: 'Palabras de la consola' })).toBeNull();
    expect(learn()).toHaveAttribute('inert');
    const buttons = screen.getAllByRole('button', {
      name: 'Aprende todas las palabras importantes',
    });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    const words = await screen.findByRole('region', { name: 'Palabras de la consola' });
    expect(learn()).not.toHaveAttribute('inert');
    expect(opener()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tab', { name: 'Palabras de la consola' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(screen.getByRole('heading', { name: LEARN })).toHaveFocus();
    expect(within(words).getAllByRole('term')).toHaveLength(16);
    const search = within(words).getByRole('searchbox', { name: 'Buscar una palabra' });
    fireEvent.change(search, { target: { value: ' COMISIÓN ' } });
    const found = within(words)
      .getAllByRole('term')
      .map((d) => d.textContent);
    expect(found).toContain('Comisión');
    expect(found).not.toContain('Vela');
    fireEvent.change(search, { target: { value: 'garantia' } });
    expect(
      within(words)
        .getAllByRole('term')
        .map((d) => d.textContent)
    ).toContain('Short (osos)');
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(within(words).getByRole('status')).toHaveTextContent(
      'Ninguna palabra coincide con «zzz».'
    );
    fireEvent.click(within(learn()).getByRole('button', { name: 'Cerrar' }));
    expect(opener()).toHaveAttribute('aria-expanded', 'false');
    expect(opener()).toHaveFocus();
    fireEvent.click(buttons[0]);
    expect(opener()).toHaveAttribute('aria-expanded', 'true');
    expect(scroll).toHaveBeenCalledTimes(2);
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('opens the guide from its button above the chart, moves between tabs and closes it', async () => {
    setup();
    await ready();
    const button = opener();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'cc-learn');
    expect(button).toHaveAttribute(
      'title',
      expect.stringMatching(/^Son herramientas para aprender/)
    );
    expect(screen.queryByText(/Son herramientas para aprender/)).toBeInTheDocument();
    fireEvent.click(button);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Velas y tiempo',
      'Medias (EMA)',
      'Bandas y precio medio',
      'Niveles (soportes, Fibonacci, volumen)',
      'Patrones',
      'Toros y osos, Long y Short',
      'Órdenes (mercado, límite, stop, TP/SL)',
      'Apalancamiento',
      'Palabras de la consola',
      'Gratis y Premium',
    ]);
    const panel = () => screen.getByRole('tabpanel');
    expect(panel()).toHaveAccessibleName('Velas y tiempo');
    expect(within(panel()).getByRole('heading', { name: 'Velas y volumen' })).toBeInTheDocument();
    expect(
      within(panel()).getByRole('heading', { name: 'Temporalidades (tamaño de la vela)' })
    ).toBeInTheDocument();
    // Arrows go round, Home and End go to the ends; other keys do nothing.
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[9]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[9]).toHaveFocus();
    fireEvent.keyDown(tabs[9], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    fireEvent.keyDown(tabs[9], { key: 'Home' });
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
    fireEvent.keyDown(tabs[0], { key: 'a' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(tabs[2]);
    expect(
      within(panel()).getByRole('heading', { name: 'Bandas de Bollinger' })
    ).toBeInTheDocument();
    expect(
      within(panel()).getByRole('heading', { name: 'Precio medio con el volumen (VWAP)' })
    ).toBeInTheDocument();
    fireEvent.click(tabs[3]);
    expect(
      within(panel()).getByRole('heading', { name: 'Retrocesos de Fibonacci' })
    ).toBeInTheDocument();
    fireEvent.click(tabs[4]);
    expect(
      within(panel()).getAllByText(/Un patrón no garantiza lo que pasará después/)
    ).toHaveLength(2);
    fireEvent.click(tabs[5]);
    expect(
      within(panel()).getByRole('heading', { name: 'Toros y osos: long y short' })
    ).toBeInTheDocument();
    fireEvent.click(tabs[6]);
    expect(within(panel()).getByText(/la comisión es fija para todos/)).toBeInTheDocument();
    fireEvent.click(tabs[7]);
    expect(within(panel()).getByText(/Finanverso no lo ofrece/)).toBeInTheDocument();
    // Esc closes it (unless something else already took the key); other keys do not.
    fireEvent.keyDown(window, { key: 'a' });
    const taken = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    taken.preventDefault();
    window.dispatchEvent(taken);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(tabs[7]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
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
    expect(box).toContain('Comisión simulada1,00 €');
    expect(screen.queryByRole('button', { name: '¿Qué es la comisión?' })).toBeNull();
    const help = screen.getByRole('button', { name: '¿Qué es una orden a mercado?' });
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

describe('Crypto console: history', () => {
  it('has no commission or balance settings, and no notice about the commission', async () => {
    setup();
    await screen.findByText('Abiertas (1)');
    expect(screen.queryByText('Tu historial y ajustes')).toBeNull();
    expect(screen.queryByRole('radio', { name: /^0,25/ })).toBeNull();
    expect(nb(check().textContent)).not.toContain('Comisión fija');
  });

  it('has no free CSV of the history on screen', async () => {
    setup(withPortfolio({ closed: [closed(1, 10)] }));
    await screen.findByText('Cerradas (1)');
    expect(screen.queryByRole('button', { name: /Exportar CSV/ })).toBeNull();
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
