import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@core/api/http';
import { translate } from '@core/i18n/I18nContext';
import { CryptoConsoleView, chartLines, savedView } from '@modules/crypto/ui/CryptoConsoleView';
import { historyTable } from '@modules/crypto/ui/SimSummary';
import type {
  ClosedTrade,
  CryptoCandles,
  CryptoCoins,
  PendingOrder,
  SimPortfolio,
} from '@modules/crypto/domain/types';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';
import { charts } from '../../__mocks__/lightweightCharts';

const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');

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
  type: 'limit',
  price: 45_000,
  amount: 900,
  reserved: 900.9,
  positionId: null,
  createdAt: '2026-03-15T12:00:00.000Z',
  expiresAt: '2026-04-14T12:00:00.000Z',
  currentPrice: 50_000,
  ...o,
});

const closed = (i: number, pnl: number): ClosedTrade => ({
  id: `c${i}`,
  symbol: 'ETH',
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
});

const withPortfolio = (p: Partial<SimPortfolio>) => (api: FakeApi) =>
  api.cryptoApi.portfolio.mockResolvedValue(fx.portfolio(p));

const amountField = () => screen.getByLabelText('¿Cuántos euros ficticios quieres usar?');
const submitBuy = (name = 'Comprar (simulado)') =>
  fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  charts.length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Crypto console: market', () => {
  it('shows the risk notice, the data source, the price and the chart of the coin', async () => {
    setup();
    expect(screen.getByRole('note', { name: 'Aviso importante' })).toHaveTextContent(
      /No es asesoramiento financiero ni una recomendación de inversión/
    );
    expect(screen.getByText('Cargando precios…')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Gráfica de Bitcoin, velas de 1 hora' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Precios públicos de Binance en euros/)).toBeInTheDocument();
    expect(screen.getByText(/Actualizado:/)).toBeInTheDocument();
    expect(nb(document.querySelector('.cc-quote-price')!.textContent)).toBe('50.000,00 €');
    expect(nb(screen.getByText(/en 24 horas/).textContent)).toBe('+1,50 % en 24 horas');
    expect(nb(screen.getByText(/En 24 horas: entre/).textContent)).toBe(
      'En 24 horas: entre 48.500,00 € y 51.000,00 €'
    );
    fireEvent.click(screen.getByText('Ver las últimas 5 velas en una tabla'));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Palabras de la consola' })).toBeInTheDocument();
  });

  it('changes coin and candle size, and remembers them on this device', async () => {
    const { api, unmount } = setup();
    await screen.findByRole('img', { name: /Bitcoin/ });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ETH' } });
    fireEvent.click(screen.getByRole('radio', { name: '1 día' }));
    await screen.findByRole('img', { name: 'Gráfica de Ethereum, velas de 1 día' });
    expect(api.cryptoApi.candles).toHaveBeenLastCalledWith('ETH', '1d');
    expect(nb(screen.getByText(/en 24 horas/).textContent)).toBe('-2,25 % en 24 horas');
    expect(JSON.parse(localStorage.getItem('mm_crypto_view')!)).toEqual({
      symbol: 'ETH',
      interval: '1d',
    });
    unmount();
    expect(savedView()).toEqual({ symbol: 'ETH', interval: '1d' });
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: '<b>', interval: '2h' }));
    expect(savedView()).toEqual({ symbol: 'BTC', interval: '1h' });
    localStorage.setItem('mm_crypto_view', '{');
    expect(savedView()).toEqual({ symbol: 'BTC', interval: '1h' });
  });

  it('shows the coin it has no price for with dashes', async () => {
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'SHIB', interval: '1h' }));
    setup();
    await screen.findByRole('img', { name: /Shiba Inu/ });
    expect(screen.queryByText(/en 24 horas/)).toBeNull();
    expect(screen.queryByText(/En 24 horas: entre/)).toBeNull();
  });

  it('shows the list with only the chosen coin until the prices arrive', () => {
    setup((api) => api.cryptoApi.coins.mockReturnValue(new Promise(() => undefined)));
    expect(screen.getByRole('option', { name: 'BTC (BTC)' })).toBeInTheDocument();
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
    const stale = { ...fx.MARKET, stale: true };
    const { unmount } = setup((api) =>
      api.cryptoApi.candles.mockResolvedValue({ ...fx.candles(), market: stale })
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
    await screen.findByRole('option', { name: 'Ethereum (ETH)' });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'ETH' } });
    fireEvent.change(screen.getByLabelText('Moneda'), { target: { value: 'BTC' } });
    await screen.findByRole('img', { name: /Bitcoin/ });
    await act(async () => {
      late(fx.candles('BTC', '1h', 2));
      lateCoins({ ...fx.coins(), coins: [] });
      lateFail(new Error('old'));
    });
    expect(api.cryptoApi.candles).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('old')).toBeNull();
    expect(screen.getByRole('option', { name: 'Ethereum (ETH)' })).toBeInTheDocument();
  });

  it('opens each «What is this?» explanation in place', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: '¿Qué es una vela?' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeVisible();
    await screen.findByRole('img', { name: /Bitcoin/ });
  });

  it('refreshes while on screen and not while the page is hidden', async () => {
    jest.useFakeTimers();
    const { api } = setup();
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
  });
});

describe('Crypto console: simulator', () => {
  it('says how the simulation is going', async () => {
    setup((api) =>
      withPortfolio({
        summary: { ...fx.portfolio().summary, winRate: 66.7, wins: 2, losses: 1, trades: 3 },
      })(api)
    );
    expect(nb((await screen.findByText(/Si vendieras todo ahora tendrías/)).textContent)).toBe(
      'Si vendieras todo ahora tendrías 97,90 € más que al empezar (+0,98 %).'
    );
    expect(nb(screen.getByText(/66,7 %/).textContent)).toBe(
      '66,7 % (2 con ganancia, 1 con pérdida)'
    );
  });

  it('says when it would lose and when there are no prices to tell', async () => {
    const { unmount } = setup(
      withPortfolio({ summary: { ...fx.portfolio().summary, total: -50, totalPercent: -0.5 } })
    );
    expect(nb((await screen.findByText(/menos que al empezar/)).textContent)).toMatch(
      /50,00 € menos/
    );
    unmount();
    setup(
      withPortfolio({
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
    expect(screen.getByRole('button', { name: 'Vender ahora (simulado)' })).toBeDisabled();
  });

  it('shows the error when the simulator cannot be loaded', async () => {
    setup((api) => api.cryptoApi.portfolio.mockRejectedValue(new Error('')));
    expect(await screen.findByText('No se ha podido cargar tu simulador.')).toBeInTheDocument();
  });

  it('buys at market with an estimate of coins, commission and total', async () => {
    const { api } = setup();
    await screen.findByText('Abiertas (1)');
    await screen.findByRole('img', { name: /Bitcoin/ });
    fireEvent.click(screen.getByRole('button', { name: /1\.000,00/ }));
    expect(amountField()).toHaveValue('1000');
    const estimate = screen.getByText('Total que pagarías').closest('dl')!;
    expect(nb(estimate.textContent)).toContain('0,02');
    expect(nb(estimate.textContent)).toContain('1.001,00 €');
    expect(nb(estimate.textContent)).toContain('Comisión simulada (0,1 %)1,00 €');
    submitBuy();
    expect(
      await screen.findByText('Compra simulada de Bitcoin hecha. La ves en «Abiertas».')
    ).toBeInTheDocument();
    expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
      action: 'buy',
      symbol: 'BTC',
      type: 'market',
      amount: 1000,
    });
    expect(amountField()).toHaveValue('');
  });

  it('checks the purchase before sending it', async () => {
    const { api } = setup();
    await screen.findByRole('img', { name: /Bitcoin/ });
    await screen.findByText('Abiertas (1)');
    submitBuy();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un importe de 1 € o más.');
    fireEvent.change(amountField(), { target: { value: '9000' } });
    submitBuy();
    expect(screen.getByRole('alert')).toHaveTextContent(/No tienes dinero ficticio suficiente/);

    fireEvent.click(screen.getByLabelText(/Límite/));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.change(amountField(), { target: { value: '100,5' } });
    submitBuy('Guardar la orden (simulada)');
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el precio de la orden.');
    const price = screen.getByLabelText('Comprar si el precio baja a (€)');
    fireEvent.change(price, { target: { value: '51000' } });
    submitBuy('Guardar la orden (simulada)');
    expect(screen.getByRole('alert')).toHaveTextContent(/ya está por debajo de ese límite/);

    fireEvent.click(screen.getByLabelText(/Stop/));
    fireEvent.change(screen.getByLabelText('Comprar cuando el precio suba a (€)'), {
      target: { value: '49000' },
    });
    submitBuy('Guardar la orden (simulada)');
    expect(screen.getByRole('alert')).toHaveTextContent(/ya está por encima de ese stop/);
    fireEvent.change(screen.getByLabelText('Comprar cuando el precio suba a (€)'), {
      target: { value: '52000' },
    });
    submitBuy('Guardar la orden (simulada)');
    expect(
      await screen.findByText('Orden de Bitcoin guardada. La ves en «Pendientes».')
    ).toBeInTheDocument();
    expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
      action: 'buy',
      symbol: 'BTC',
      type: 'stop',
      amount: 100.5,
      price: 52_000,
    });
  });

  it('does not buy a coin without a price, and shows what the API refused', async () => {
    localStorage.setItem('mm_crypto_view', JSON.stringify({ symbol: 'SHIB', interval: '1h' }));
    const { api, unmount } = setup();
    await screen.findByRole('img', { name: /Shiba/ });
    await screen.findByText('Abiertas (1)');
    fireEvent.change(amountField(), { target: { value: '10' } });
    submitBuy();
    expect(screen.getByRole('alert')).toHaveTextContent(/no tenemos el precio de esta moneda/);
    unmount();
    localStorage.clear();
    api.cryptoApi.placeOrder.mockRejectedValue(new ApiError('Los precios no están al día', 503));
    renderWithProviders(<CryptoConsoleView />, { api });
    await screen.findByRole('img', { name: /Bitcoin/ });
    await screen.findByText('Abiertas (1)');
    fireEvent.change(amountField(), { target: { value: '10' } });
    submitBuy();
    expect(await screen.findByText('Los precios no están al día')).toBeInTheDocument();
    expect(screen.queryByText(/Compra simulada/)).toBeNull();
  });

  it('sells now and schedules a sale with a limit or a stop', async () => {
    const { api } = setup();
    await screen.findByText('Abiertas (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Vender ahora (simulado)' }));
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenCalledWith({
        action: 'sell',
        positionId: 'p1',
        type: 'market',
      })
    );
    const schedule = screen.getByRole('button', { name: 'Programar una venta' });
    fireEvent.click(schedule);
    expect(schedule).toHaveAttribute('aria-expanded', 'true');
    const save = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Guardar la orden de venta' }));
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el precio de la orden.');
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '54000' } });
    save();
    expect(screen.getByRole('alert')).toHaveTextContent(/ya está por encima: se vendería/);
    fireEvent.click(screen.getByLabelText(/si el precio baja a/));
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '56000' } });
    save();
    expect(screen.getByRole('alert')).toHaveTextContent(/ya está por debajo: se vendería/);
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '45000' } });
    save();
    await waitFor(() =>
      expect(api.cryptoApi.placeOrder).toHaveBeenLastCalledWith({
        action: 'sell',
        positionId: 'p1',
        type: 'stop',
        price: 45_000,
      })
    );
    await waitFor(() => expect(screen.queryByLabelText('Precio (€)')).toBeNull());
  });

  it('keeps the sale form open when the API refuses it, and skips the check without a price', async () => {
    const open = { ...fx.portfolio().open[0], currentPrice: null };
    const { api } = setup((a) => {
      withPortfolio({ open: [open] })(a);
      a.cryptoApi.placeOrder.mockRejectedValue(new Error('no'));
    });
    await screen.findByText('Abiertas (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Programar una venta' }));
    fireEvent.change(screen.getByLabelText('Precio (€)'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar la orden de venta' }));
    await waitFor(() => expect(api.cryptoApi.placeOrder).toHaveBeenCalled());
    expect(screen.getByLabelText('Precio (€)')).toBeInTheDocument();
  });

  it('lists pending orders with their scheduled sales and cancels them', async () => {
    const pending = [
      order({ id: 'o1' }),
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
      order({ id: 'o3', symbol: 'ETH', price: 1_500, amount: 300, reserved: 300.3 }),
    ];
    const { api } = setup(withPortfolio({ pending }));
    expect(await screen.findByText('Pendientes (3)')).toBeInTheDocument();
    expect(nb(screen.getByText(/^Ventas programadas:/).textContent)).toBe(
      'Ventas programadas: Venta stop 45.000,00 €'
    );
    expect(screen.getAllByText('Reservado')).toHaveLength(2);
    await screen.findByRole('img', { name: /Bitcoin/ });
    const candleSeries = charts[charts.length - 1].series.find((s) => s.kind === 'Candlestick')!;
    await waitFor(() =>
      expect(candleSeries.lines.filter((l) => !l.removed).map((l) => l.options.title)).toEqual([
        'Tu compra',
        'Compra límite',
        'Venta stop',
      ])
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Venta stop BTC' }));
    await waitFor(() => expect(api.cryptoApi.cancelOrder).toHaveBeenCalledWith('o2'));
  });

  it('shows empty panels and the closed operations, ten at a time', async () => {
    const many = Array.from({ length: 12 }, (_, i) => closed(i, i % 3 ? 10 : -5));
    setup(withPortfolio({ open: [], closed: many }));
    expect(await screen.findByText('Todavía no tienes compras abiertas.')).toBeInTheDocument();
    expect(screen.getByText('No tienes órdenes esperando.')).toBeInTheDocument();
    expect(screen.getByText('Cerradas (12)')).toBeInTheDocument();
    const list = () => screen.getByText('Cerradas (12)').closest('section')!.querySelectorAll('li');
    expect(list()).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(list()).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
  });

  it('says when there is nothing closed yet', async () => {
    setup();
    expect(await screen.findByText(/Cuando vendas una compra/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar CSV/ })).toBeEnabled();
  });

  it('announces orders filled or expired since the last look', async () => {
    const fills = [
      {
        orderId: 'a',
        symbol: 'BTC',
        side: 'buy' as const,
        type: 'limit' as const,
        price: 45_000,
        at: 'x',
      },
      {
        orderId: 'b',
        symbol: 'ETH',
        side: 'buy' as const,
        type: 'expired' as const,
        price: null,
        at: 'x',
      },
      {
        orderId: 'c',
        symbol: 'SOL',
        side: 'sell' as const,
        type: 'expired' as const,
        price: null,
        at: 'x',
      },
    ];
    const { api } = setup(withPortfolio({ fills }));
    const box = await screen.findByText('Novedades de tus órdenes');
    const items = box.closest('div')!.querySelectorAll('li');
    expect(nb(items[0].textContent)).toBe('Se ha ejecutado tu Compra límite de BTC a 45.000,00 €.');
    expect(items[1].textContent).toMatch(/compra de ETH ha caducado/);
    expect(items[2].textContent).toBe('Tu orden de venta de SOL ha caducado.');
    api.cryptoApi.placeOrder.mockResolvedValue(fx.portfolio());
    fireEvent.click(screen.getByRole('button', { name: 'Vender ahora (simulado)' }));
    await waitFor(() => expect(screen.queryByText('Novedades de tus órdenes')).toBeNull());
  });

  it('changes the commission and starts again after confirming', async () => {
    const { api } = setup();
    await screen.findByText('Abiertas (1)');
    fireEvent.change(screen.getByLabelText('Comisión simulada por compra y por venta'), {
      target: { value: '25' },
    });
    await waitFor(() => expect(api.cryptoApi.setFee).toHaveBeenCalledWith(25));
    fireEvent.change(screen.getByLabelText('Saldo para empezar de nuevo'), {
      target: { value: '1000' },
    });
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
  const t = (key: string, vars?: Record<string, string | number>) => translate('es', key, vars);

  it('builds the history table with open and closed operations', () => {
    const table = historyTable(fx.portfolio({ closed: [closed(1, 10)] }), t, 'es');
    expect(table.head).toHaveLength(13);
    expect(table.rows[0].slice(0, 3)).toEqual([
      'Abierta (resultado si se vendiera ahora)',
      'BTC',
      0.02,
    ]);
    expect(table.rows[1].slice(6, 9)).toEqual([2020, expect.stringContaining('2026'), 'Límite']);
  });

  it('draws lines only for the chosen coin', () => {
    expect(chartLines(null, 'BTC', t)).toEqual([]);
    const lines = chartLines(
      fx.portfolio({ pending: [order({}), order({ id: 'x', symbol: 'ETH' })] }),
      'BTC',
      t
    );
    expect(lines.map((l) => l.kind)).toEqual(['entry', 'buy']);
  });
});
