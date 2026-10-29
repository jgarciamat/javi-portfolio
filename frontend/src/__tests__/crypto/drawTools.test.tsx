import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SAVE_MS, useDrawings } from '@modules/crypto/application/useDrawings';
import type { Drawing } from '@modules/crypto/domain/drawings';
import type { Candle } from '@modules/crypto/domain/types';
import { CryptoConsoleView } from '@modules/crypto/ui/CryptoConsoleView';
import { MoneyProvider } from '@modules/crypto/ui/money';
import { PriceChart } from '@modules/crypto/ui/PriceChart';
import * as fx from '@test-utils/crypto';
import { createFakeApi, type FakeApi } from '@test-utils/fakeApi';
import { renderWithProviders } from '@test-utils/render';
import { charts } from '../../__mocks__/lightweightCharts';

// Every price and note here is made up. The fake chart puts candle i at x = 10·i (from the first
// one on screen) and a price p at y = 300 − p.
const H = 3_600_000;
const candles = fx.candleList(5);
const T0 = candles[0].time;
const nb = (text: string | null) => (text ?? '').replace(/\u00a0|\u202f/g, ' ');

function Harness({ list = candles, symbol = 'BTC' }: { list?: Candle[]; symbol?: string }) {
  const drawings = useDrawings(symbol);
  return (
    <PriceChart
      candles={list}
      viewKey={`${symbol}:1h`}
      label="Gráfica de Bitcoin"
      interval="1h"
      lines={[]}
      layers={[]}
      onToggleLayer={jest.fn()}
      onVisibleChange={jest.fn()}
      drawings={drawings}
    />
  );
}

async function setup(
  options: {
    saved?: Drawing[];
    change?: (api: FakeApi) => void;
    rate?: number;
    list?: Candle[];
  } = {}
) {
  const api = createFakeApi();
  api.cryptoApi.drawings.mockResolvedValue(fx.drawings('BTC', options.saved ?? []));
  options.change?.(api);
  const ui = <Harness list={options.list} />;
  const view = renderWithProviders(
    options.rate ? (
      <MoneyProvider display={{ currency: 'USD', rate: options.rate }}>{ui}</MoneyProvider>
    ) : (
      ui
    ),
    { api }
  );
  await waitFor(() => expect(api.cryptoApi.drawings).toHaveBeenCalled());
  await act(async () => undefined);
  return { ...view, api, chart: charts[charts.length - 1] };
}

const bar = () => screen.getByRole('group', { name: 'Herramientas de dibujo' });
const tool = (name: string) => within(bar()).getByRole('button', { name });
const layer = () => document.querySelector<SVGSVGElement>('.cc-draw-layer')!;
const hint = () => document.querySelector('.cc-draw-hint')!;
const shapes = (kind?: string) =>
  [...layer().querySelectorAll(kind ? `[data-drawing="${kind}"]` : '[data-drawing]')] as Element[];
const at = (x: number, y: number) => ({ clientX: x, clientY: y, pointerId: 1 });
const drag = (from: [number, number], to: [number, number]) => {
  fireEvent.pointerDown(layer(), at(...from));
  fireEvent.pointerMove(layer(), at(...to));
  fireEvent.pointerUp(layer(), at(...to));
};
const tap = (x: number, y: number) => {
  fireEvent.pointerDown(layer(), at(x, y));
  fireEvent.pointerUp(layer(), at(x, y));
};
const saved = (api: FakeApi) =>
  api.cryptoApi.saveDrawings.mock.calls[api.cryptoApi.saveDrawings.mock.calls.length - 1][1];

const line = (id: string, extra: Partial<Drawing> = {}): Drawing => ({
  id,
  kind: 'horizontal',
  color: 'cyan',
  points: [{ time: T0, price: 100 }],
  ...extra,
});

// jsdom has no PointerEvent: a mouse event with a pointer id stands in (browsers have both).
beforeAll(() => {
  class FakePointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: FakePointerEvent });
});

afterAll(() => {
  delete (window as { PointerEvent?: unknown }).PointerEvent;
});

beforeEach(() => {
  localStorage.clear();
  charts.length = 0;
});

afterEach(() => jest.useRealTimers());

describe('Drawing on the chart', () => {
  it('shows the bar with every tool named, off until the saved drawings arrive', async () => {
    let answer: (value: ReturnType<typeof fx.drawings>) => void = () => undefined;
    const api = createFakeApi();
    api.cryptoApi.drawings.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderWithProviders(<Harness />, { api });
    for (const name of [
      'Línea de tendencia',
      'Línea horizontal',
      'Zona',
      'Nota de texto',
      'Goma: borrar un dibujo',
      'Deshacer',
      'Borrar todos los dibujos de esta moneda',
    ]) {
      expect(tool(name)).toBeDisabled();
    }
    expect(tool('Amarillo')).toHaveAttribute('aria-pressed', 'true');
    expect(tool('Turquesa')).toHaveAttribute('aria-pressed', 'false');
    await act(async () => answer(fx.drawings('BTC')));
    expect(tool('Línea de tendencia')).toBeEnabled();
    expect(tool('Línea de tendencia')).toHaveAttribute('aria-pressed', 'false');
    // Nothing to erase, undo or delete yet.
    expect(tool('Goma: borrar un dibujo')).toBeDisabled();
    expect(tool('Deshacer')).toBeDisabled();
    // Off, the drawings take no touch: the chart moves and zooms as always.
    expect(layer()).toHaveAttribute('class', 'cc-draw-layer');
    expect(layer()).toHaveAttribute('aria-hidden', 'true');
    expect(layer()).toHaveAttribute('width', '600');
    expect(hint()).toBeEmptyDOMElement();
  });

  it('draws a trend line with a drag, anchored to time and price, and saves it', async () => {
    const { api } = await setup();
    jest.useFakeTimers();
    fireEvent.click(tool('Línea de tendencia'));
    expect(tool('Línea de tendencia')).toHaveAttribute('aria-pressed', 'true');
    expect(layer()).toHaveClass('cc-draw-layer--on');
    expect(hint()).toHaveTextContent(
      'Arrastra de un punto a otro, o toca los dos. Esc para salir.'
    );
    fireEvent.pointerDown(layer(), at(10, 200));
    fireEvent.pointerMove(layer(), at(25, 195));
    // While dragging, the line follows the pointer.
    expect(shapes('trend')).toHaveLength(1);
    fireEvent.pointerUp(layer(), at(30, 190));
    expect(tool('Línea de tendencia')).toHaveAttribute('aria-pressed', 'false');
    const [drawn] = shapes('trend');
    const stroke = drawn.querySelectorAll('line')[1];
    expect(stroke).toHaveAttribute('x1', '10');
    expect(stroke).toHaveAttribute('y1', '200');
    expect(stroke).toHaveAttribute('x2', '30');
    expect(stroke).toHaveAttribute('style', 'stroke: var(--cc-draw-yellow);');
    act(() => jest.advanceTimersByTime(SAVE_MS));
    expect(saved(api)).toEqual([
      expect.objectContaining({
        kind: 'trend',
        color: 'yellow',
        points: [
          { time: T0 + H, price: 100 },
          { time: T0 + 3 * H, price: 110 },
        ],
      }),
    ]);
    expect(screen.getByText('Tus dibujos en esta moneda: 1.')).toHaveClass('sr-only');
  });

  it('stays in place when the chart moves or is rescaled', async () => {
    const { chart, unmount } = await setup({ saved: [line('h1')] });
    expect(shapes('horizontal')[0].querySelector('line')).toHaveAttribute('y1', '200');
    act(() => chart.show({ from: 2, to: 6 }));
    // Same paint again: nothing to move.
    act(() => chart.paint());
    unmount();
    const trend: Drawing = {
      id: 't',
      kind: 'trend',
      color: 'white',
      points: [
        { time: T0 + 2 * H, price: 100 },
        { time: T0 + 4 * H, price: 120 },
      ],
    };
    await setup({ saved: [trend] });
    const next = charts[charts.length - 1];
    expect(shapes('trend')[0].querySelectorAll('line')[1]).toHaveAttribute('x1', '20');
    // Dragged two candles to the left: the line goes with its candles.
    next.visibleRange = { from: 2, to: 6 };
    act(() => next.show({ from: 2, to: 6 }));
    const stroke = shapes('trend').at(-1)!.querySelectorAll('line')[1];
    expect(stroke).toHaveAttribute('x1', '0');
    expect(stroke).toHaveAttribute('x2', '20');
  });

  it('makes a zone with two taps, showing it while the pointer moves', async () => {
    const { api } = await setup();
    fireEvent.click(tool('Zona'));
    tap(10, 200);
    expect(shapes('rect')).toHaveLength(1);
    // Hovering moves the second corner; a cancelled touch keeps the first one.
    fireEvent.pointerMove(layer(), at(40, 180));
    expect(shapes('rect')[0].querySelector('rect')).toHaveAttribute('width', '30');
    fireEvent.pointerDown(layer(), at(40, 180));
    fireEvent.pointerCancel(layer());
    expect(shapes('rect')[0].querySelector('rect')).toHaveAttribute('width', '0');
    tap(40, 180);
    expect(tool('Zona')).toHaveAttribute('aria-pressed', 'false');
    const zone = shapes('rect')[0].querySelector('rect')!;
    expect(zone).toHaveAttribute('x', '10');
    expect(zone).toHaveAttribute('y', '180');
    expect(zone).toHaveAttribute('height', '20');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(saved(api)[0]).toMatchObject({ kind: 'rect' });
  });

  it('marks a price with a horizontal line in the colour chosen, also in dollars', async () => {
    const { api } = await setup({ rate: 2 });
    fireEvent.click(tool('Rosa'));
    expect(tool('Rosa')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tool('Línea horizontal'));
    fireEvent.pointerDown(layer(), at(5, 100));
    // A drag of a horizontal line only moves its height.
    fireEvent.pointerMove(layer(), at(15, 90));
    fireEvent.pointerUp(layer(), at(20, 100));
    const [mark] = shapes('horizontal');
    expect(mark.querySelectorAll('line')[1]).toHaveAttribute(
      'style',
      'stroke: var(--cc-draw-pink);'
    );
    expect(mark.querySelectorAll('line')[1]).toHaveAttribute('x2', '600');
    // 200 $ on screen is 100 € kept: the line sits on the same candles in either currency.
    expect(nb(mark.textContent)).toBe('200,00 US$');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(saved(api)[0]).toMatchObject({ color: 'pink', points: [{ price: 100 }] });
  });

  it('writes a note where it is tapped, and drops an empty one', async () => {
    await setup();
    fireEvent.click(tool('Nota de texto'));
    expect(hint()).toHaveTextContent('Toca donde quieras la nota.');
    fireEvent.pointerDown(layer(), at(20, 150));
    expect(shapes()).toHaveLength(0);
    fireEvent.pointerUp(layer(), at(20, 150));
    const input = screen.getByRole('textbox', { name: 'Texto de la nota' });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('maxLength', '60');
    expect(input).toHaveStyle({ left: '20px', top: '150px' });
    fireEvent.change(input, { target: { value: '  Soporte  ' } });
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(shapes('text')[0]).toHaveTextContent('Soporte');
    expect(screen.getByRole('img', { name: 'Gráfica de Bitcoin' })).toHaveFocus();
    expect(screen.getByText(/Notas: Soporte\./)).toBeInTheDocument();

    fireEvent.click(tool('Nota de texto'));
    tap(30, 120);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(shapes('text')).toHaveLength(1);
  });

  it('keeps a note once even when Enter and leaving the input come together', async () => {
    const { api } = await setup();
    fireEvent.click(tool('Nota de texto'));
    tap(20, 150);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Una' } });
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(saved(api)).toHaveLength(1);
  });

  it('leaves the tool with Escape or its button, and Escape keeps the full screen', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    expect(screen.getByRole('dialog', { name: 'Gráfica en pantalla completa' })).toBeVisible();
    fireEvent.click(tool('Línea de tendencia'));
    fireEvent.click(tool('Línea de tendencia'));
    expect(tool('Línea de tendencia')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tool('Nota de texto'));
    tap(20, 150);
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(tool('Nota de texto')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // With no tool on, Escape leaves the full screen as always.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('draws with the thickness chosen, shows it, keeps it on this device and undoes it too', async () => {
    const { api } = await setup({ saved: [line('old')] });
    jest.useFakeTimers();
    const widths = within(bar()).getByRole('group', { name: 'Grosor de la línea' });
    const width = (name: string) => within(widths).getByRole('button', { name });
    // The normal one by default; a drawing saved without a width is drawn with it.
    expect(width('Normal (2 px)')).toHaveAttribute('aria-pressed', 'true');
    expect(shapes('horizontal')[0].querySelectorAll('line')[1]).toHaveAttribute(
      'stroke-width',
      '2'
    );
    // Each choice is a preview of the stroke, in the colour chosen.
    expect(width('Muy grueso (6 px)').querySelector('line')).toHaveAttribute('stroke-width', '6');
    fireEvent.click(tool('Rosa'));
    expect(width('Fino (1 px)').querySelector('line')).toHaveAttribute(
      'style',
      'stroke: var(--cc-draw-pink);'
    );
    fireEvent.click(width('Muy grueso (6 px)'));
    expect(width('Muy grueso (6 px)')).toHaveAttribute('aria-pressed', 'true');
    expect(width('Normal (2 px)')).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('mm_crypto_draw_width')).toBe('6');
    fireEvent.click(tool('Línea de tendencia'));
    fireEvent.pointerDown(layer(), at(10, 200));
    fireEvent.pointerMove(layer(), at(25, 195));
    // The line being drawn already has it.
    expect(shapes('trend')[0].querySelectorAll('line')[1]).toHaveAttribute('stroke-width', '6');
    fireEvent.pointerUp(layer(), at(30, 190));
    fireEvent.click(width('Fino (1 px)'));
    fireEvent.click(tool('Zona'));
    drag([40, 150], [60, 170]);
    expect(shapes('rect')[0].querySelector('rect')).toHaveAttribute('stroke-width', '1');
    // A note takes no thickness.
    fireEvent.click(tool('Nota de texto'));
    tap(50, 120);
    const input = screen.getByRole('textbox', { name: 'Texto de la nota' });
    fireEvent.change(input, { target: { value: 'Ojo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => jest.advanceTimersByTime(SAVE_MS));
    expect(saved(api).map((d) => [d.kind, d.width])).toEqual([
      ['horizontal', undefined],
      ['trend', 6],
      ['rect', 1],
      ['text', undefined],
    ]);
    fireEvent.click(tool('Deshacer'));
    fireEvent.click(tool('Deshacer'));
    expect(shapes('rect')).toHaveLength(0);
    expect(shapes('trend')[0].querySelectorAll('line')[1]).toHaveAttribute('stroke-width', '6');
    // The hit area of a thin line stays wide (CSS: 16 px).
    expect(shapes('trend')[0].querySelector('.cc-draw-hit')).not.toBeNull();
    cleanup();
    // Back on this device: the last thickness chosen; a value not offered is ignored.
    await setup();
    expect(
      within(screen.getByRole('group', { name: 'Grosor de la línea' })).getByRole('button', {
        name: 'Fino (1 px)',
      })
    ).toHaveAttribute('aria-pressed', 'true');
    cleanup();
    localStorage.setItem('mm_crypto_draw_width', '3');
    await setup();
    expect(
      within(screen.getByRole('group', { name: 'Grosor de la línea' })).getByRole('button', {
        name: 'Normal (2 px)',
      })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('erases one drawing by touch or keyboard, deletes them all and undoes', async () => {
    const note: Drawing = { ...line('n1'), kind: 'text', color: 'white', text: 'Hola' };
    const zone: Drawing = {
      ...line('r1'),
      kind: 'rect',
      points: [
        { time: T0, price: 120 },
        { time: T0 + H, price: 110 },
      ],
    };
    await setup({ saved: [line('h1'), note, zone] });
    fireEvent.click(tool('Goma: borrar un dibujo'));
    expect(layer()).toHaveClass('cc-draw-layer--erase');
    expect(layer()).not.toHaveAttribute('aria-hidden');
    expect(hint()).toHaveTextContent('Toca el dibujo que quieras borrar.');
    // Taps on the empty chart erase nothing.
    tap(300, 50);
    fireEvent.click(screen.getByRole('button', { name: /^Borrar la línea horizontal de 100,00/ }));
    expect(shapes('horizontal')).toHaveLength(0);
    const erase = screen.getByRole('button', { name: 'Borrar la nota «Hola»' });
    fireEvent.keyDown(erase, { key: 'a' });
    expect(shapes('text')).toHaveLength(1);
    fireEvent.keyDown(erase, { key: 'Enter' });
    expect(shapes('text')).toHaveLength(0);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Borrar la zona' }), { key: ' ' });
    // Nothing left to erase: the eraser goes off by itself.
    expect(shapes()).toHaveLength(0);
    expect(tool('Goma: borrar un dibujo')).toBeDisabled();
    fireEvent.click(tool('Deshacer'));
    expect(shapes('rect')).toHaveLength(1);
    fireEvent.click(tool('Deshacer'));
    fireEvent.click(tool('Borrar todos los dibujos de esta moneda'));
    expect(shapes()).toHaveLength(0);
    fireEvent.click(tool('Deshacer'));
    expect(shapes()).toHaveLength(2);
  });

  it('draws with the keyboard on the last candles and undoes with Ctrl+Z or ⌘Z', async () => {
    await setup();
    const canvas = screen.getByRole('img', { name: 'Gráfica de Bitcoin' });
    expect(canvas.getAttribute('aria-describedby')!.split(' ')).toHaveLength(4);
    // Enter with no tool does nothing; the arrows still move the chart.
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(shapes()).toHaveLength(0);
    fireEvent.click(tool('Línea horizontal'));
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(shapes('horizontal')[0].querySelector('line')).toHaveAttribute(
      'y1',
      String(300 - candles[4].close)
    );
    fireEvent.click(tool('Línea de tendencia'));
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(shapes('trend')).toHaveLength(1);
    fireEvent.click(tool('Nota de texto'));
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(screen.getByRole('textbox')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    // The eraser takes no Enter on the chart: each drawing is its own button.
    fireEvent.click(tool('Goma: borrar un dibujo'));
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(shapes()).toHaveLength(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    expect(shapes()).toHaveLength(1);
    fireEvent.keyDown(canvas, { key: 'Z', metaKey: true });
    expect(shapes()).toHaveLength(0);
    fireEvent.keyDown(canvas, { key: 'z' });
  });

  it('places nothing with the keyboard when there are no candles, and skips what has no place', async () => {
    const { chart } = await setup({ list: [], saved: [line('h1')] });
    act(() => chart.paint());
    expect(shapes()).toHaveLength(0);
    const canvas = screen.getByRole('img', { name: 'Gráfica de Bitcoin' });
    fireEvent.click(tool('Línea horizontal'));
    fireEvent.keyDown(canvas, { key: 'Enter' });
    // No candle to tell the time of a pixel either.
    tap(10, 100);
    expect(tool('Línea horizontal')).toHaveAttribute('aria-pressed', 'true');
  });

  it('draws nothing where the chart cannot tell the price or the time', async () => {
    const { chart } = await setup({ saved: [line('h1')] });
    const prices = chart.series.find((s) => s.kind === 'Candlestick')!;
    fireEvent.click(tool('Nota de texto'));
    tap(20, 150);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    prices.blind = true;
    act(() => chart.paint());
    expect(shapes()).toHaveLength(0);
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(tool('Línea de tendencia'));
    tap(10, 100);
    prices.blind = false;
    chart.blind = true;
    act(() => chart.paint());
    fireEvent.pointerDown(layer(), at(10, 100));
    fireEvent.pointerMove(layer(), at(20, 100));
    fireEvent.pointerUp(layer(), at(20, 100));
    expect(tool('Línea de tendencia')).toHaveAttribute('aria-pressed', 'true');
  });

  it('takes no pointer while no tool is on, and captures it while one is', async () => {
    await setup();
    fireEvent.pointerDown(layer(), at(10, 100));
    fireEvent.pointerMove(layer(), at(20, 100));
    fireEvent.pointerUp(layer(), at(20, 100));
    expect(shapes()).toHaveLength(0);
    fireEvent.click(tool('Línea de tendencia'));
    const capture = jest.fn();
    Object.defineProperty(layer(), 'setPointerCapture', { value: capture });
    fireEvent.pointerMove(layer(), at(20, 100));
    fireEvent.pointerUp(layer(), at(20, 100));
    expect(shapes()).toHaveLength(0);
    fireEvent.pointerDown(layer(), at(10, 100));
    fireEvent.pointerCancel(layer());
    expect(shapes()).toHaveLength(0);
    drag([10, 100], [40, 100]);
    expect(capture).toHaveBeenCalledWith(1);
    expect(shapes('trend')).toHaveLength(1);
  });

  it('says when the coin is full, when a save failed and when they could not be loaded', async () => {
    const full = Array.from({ length: 50 }, (_, i) => line(`d${i}`));
    await setup({ saved: full });
    expect(tool('Zona')).toBeDisabled();
    expect(tool('Goma: borrar un dibujo')).toBeEnabled();
    expect(hint()).toHaveTextContent(
      'Tienes 50 dibujos en esta moneda, el máximo: borra alguno para dibujar otro.'
    );

    cleanup();
    await setup({ change: (a) => a.cryptoApi.saveDrawings.mockRejectedValue(new Error('x')) });
    jest.useFakeTimers();
    fireEvent.click(tool('Línea horizontal'));
    tap(10, 100);
    await act(async () => jest.advanceTimersByTime(SAVE_MS));
    expect(hint()).toHaveTextContent('Tus últimos cambios en los dibujos no se han guardado');
    jest.useRealTimers();
    cleanup();

    const { api } = await setup({
      change: (a) => a.cryptoApi.drawings.mockRejectedValueOnce(new Error('down')),
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se han podido cargar tus dibujos de esta moneda.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(api.cryptoApi.drawings).toHaveBeenCalledTimes(2);
  });
});

describe('Drawings in the console', () => {
  it('brings the drawings of each coin, also when the coin changes in full screen', async () => {
    const api = createFakeApi();
    api.cryptoApi.drawings.mockImplementation((symbol) =>
      Promise.resolve(
        fx.drawings(
          symbol,
          symbol === 'ETH' ? [line('e1'), line('e2', { kind: 'text', text: 'ETH' })] : []
        )
      )
    );
    renderWithProviders(<CryptoConsoleView />, { api });
    await screen.findByRole('img', { name: /Gráfica de Bitcoin/ });
    await waitFor(() => expect(api.cryptoApi.drawings).toHaveBeenCalledWith('BTC'));
    expect(shapes()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    const full = screen.getByRole('dialog', { name: 'Gráfica en pantalla completa' });
    // The drawing bar is in the full screen too, next to the coin selector.
    expect(within(full).getByRole('group', { name: 'Herramientas de dibujo' })).toBeInTheDocument();
    fireEvent.change(within(full).getByRole('combobox', { name: 'Cambiar de moneda' }), {
      target: { value: 'ETH' },
    });
    await within(full).findByRole('img', { name: /Gráfica de Ethereum/ });
    await waitFor(() => expect(shapes()).toHaveLength(2));
    expect(api.cryptoApi.drawings).toHaveBeenLastCalledWith('ETH');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
