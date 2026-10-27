import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { ImportModal } from '@modules/finances/ui/components/ImportModal';
import { readScreenshot, toReadableGrey } from '@modules/finances/application/ocr';
import { isImage } from '@modules/finances/application/hooks/useImport';
import { parsePastedMovements, textFromOcrLines } from '@modules/finances/domain/pastedMovements';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { literal, renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';
import {
  darkDayBelow,
  dayColumnBalance,
  headerGreeting,
  headerGreetingWide,
  headerHolderAvailable,
  headerLightSignedWide,
  headerNoGreeting,
  headerTabs,
  lightBlocks,
  webListBalances,
} from './fixtures/ocrScreenshots';

const worker = { recognize: jest.fn(), terminate: jest.fn() };
jest.mock('tesseract.js', () => ({ createWorker: jest.fn(async () => worker) }));

/** What Tesseract answers for an image: its lines, as blocks of paragraphs. */
const ocrAnswer = (lines: { text: string; x0: number; x1: number; y0: number; y1: number }[]) => ({
  data: {
    blocks: [
      {
        paragraphs: [{ lines: lines.map(({ text, ...bbox }) => ({ text: `${text}\n`, bbox })) }],
      },
    ],
  },
});

const TODAY = '2026-10-26';
const brief = (text: string) =>
  parsePastedMovements(text, TODAY).rows.map((r) => [r.date, r.description, r.amount]);

describe('reading screenshots of bank apps (real OCR output of invented screenshots)', () => {
  it('a light app with a day above each block and the amount on the right', () => {
    const rows = brief(textFromOcrLines(lightBlocks));
    expect(rows).toEqual([
      ['2026-10-26', 'CAFETERIA LA PLAZA', -1.5],
      ['2026-10-26', 'MERCADONA VALENCIA', -62.18],
      ['2026-10-25', 'NETFLIX.COM', -12.99],
      ['2026-10-25', 'Bizum de Laura G.', 20],
      ['2026-10-22', 'NOMINA EMPRESA SL', 1845.32],
      ['2026-10-22', 'REPSOL ES. 4521', -50],
      ['2026-10-22', 'AMAZON MKTPLACE', -23.47],
      ['2026-10-20', 'IBERDROLA CLIENTES', -67.8],
      ['2026-10-20', 'SPOTIFY', -10.99],
    ]);
  });

  it('a dark app with the day under each movement, read as two columns', () => {
    expect(brief(textFromOcrLines(darkDayBelow))).toEqual([
      ['2026-10-24', 'Glovo', -18.4],
      ['2026-10-23', 'Lidl Ruzafa', -34.05],
      ['2026-10-22', 'Devolución Zara', 29.95],
      ['2026-10-21', 'Seguro Hogar Maptre', -31.2],
      ['2026-10-20', 'Gimnasio Basic-Fit', -29.99],
      ['2026-10-19', 'Metro Valencia', -8.5],
    ]);
  });

  it('a day column split in two lines and the balance under each amount', () => {
    expect(brief(textFromOcrLines(dayColumnBalance))).toEqual([
      ['2026-10-25', 'COMPRA TARJ. 5402 CARREFOUR EXPRESS', -14.35],
      ['2026-10-24', 'RECIBO MOVISTAR', -45],
      ['2026-10-24', 'TRANSF. DE JUAN PEREZ ALQUILER PARKING', 60],
      ['2026-10-23', 'BIZUM A MARTA CENA', -22.5],
      ['2026-10-21', 'COMISION MANTENIMIENTO', -3],
      ['2026-10-20', 'PAGO MOVIL EN FARMACIA LOPEZ', -8.95],
    ]);
  });
});

/**
 * A web bank list like the one of a real report: the typographic minus «−», the balance «+ 430,10 €»
 * under each amount, the booked day and «Fecha de operación» under the concept, «Fraccionar pago».
 * Every row comes out with its type, amount, day of the payment and concept.
 */
const WEB_LIST: [string, string, number][] = [
  ['2026-10-23', 'WWW.AMAZON', -38.84],
  ['2026-10-23', 'WWW.AMAZON', -15.49],
  ['2026-10-23', 'WWW.AMAZON', -14.66],
  ['2026-10-24', 'BIZUM RECIBIDO', 10],
  ['2026-10-24', 'BIZUM RECIBIDO', 10],
  ['2026-10-23', 'TRANSFER INMEDIATA', 300],
  ['2026-10-21', 'Revolut', -130],
  ['2026-10-21', 'BIZUM ENVIADO', -50],
  ['2026-10-21', 'BIZUM RECIBIDO', 130],
  ['2026-10-18', 'GAS POWER31168968', -47.61],
];

describe('a web bank list with the balance under each amount (reported case)', () => {
  it('reads the screenshot: signs, days of payment and concepts, without the balances', () => {
    const parsed = parsePastedMovements(textFromOcrLines(webListBalances), TODAY);
    expect(parsed.rows.map((r) => [r.date, r.description, r.amount])).toEqual(WEB_LIST);
    expect(parsed.rows.map((r) => r.type)).toEqual(
      WEB_LIST.map(([, , amount]) => (amount < 0 ? 'EXPENSE' : 'INCOME'))
    );
    expect(parsed.skipped).toEqual([]);
  });

  it('reads the same list copied as text, with «−», «+ 430,10 €» on its own line and «Fraccionar pago»', () => {
    const text = [
      ['WWW.AMAZON', '25 Oct 2026', 'Fecha de operación: 23-10-2026', '−38,84 €', '+ 430,10 €'],
      ['WWW.AMAZON', '25 Oct 2026', 'Fecha de operación: 23-10-2026', '−15,49 €', '+ 468,94 €'],
      ['WWW.AMAZON', '25 Oct 2026', 'Fecha de operación: 23-10-2026', '−14,66 €', '+ 484,43 €'],
      ['BIZUM RECIBIDO', '24 Oct 2026', 'BIZUM', '+10,00 €', '+ 499,09 €'],
      ['BIZUM RECIBIDO', '24 Oct 2026', 'BIZUM', '+10,00 €', '+ 489,09 €'],
      ['TRANSFER INMEDIATA', '23 Oct 2026', 'Lucía Martín Sanz', '+300,00 €', '+ 479,09 €'],
      [
        'Revolut**4321*',
        '23 Oct 2026',
        'Fecha de operación: 21-10-2026',
        'Fraccionar pago',
        '−130,00 €',
        '+ 179,09 €',
      ],
      ['BIZUM ENVIADO', '21 Oct 2026', '− 50,00 €', '+ 309,09 €'],
      ['BIZUM RECIBIDO', '21 Oct 2026', 'BIZUM', '+130,00 €', '+ 359,09 €'],
      [
        'GAS POWER31168968',
        '20 Oct. 2026',
        'Fecha de operación: 18-10-2026',
        '–47,61 €',
        '+ 229,09 €',
      ],
    ]
      .flat()
      .join('\n');
    const parsed = parsePastedMovements(text, TODAY);
    expect(parsed.rows.map((r) => [r.date, r.description, r.amount])).toEqual(WEB_LIST);
    expect(parsed.review).toEqual([]);
  });

  it('takes the sign the balances give when the OCR lost a minus', () => {
    const lost = webListBalances.map((l) => ({ ...l, text: l.text.replace('—50,00', '50,00') }));
    const parsed = parsePastedMovements(textFromOcrLines(lost), TODAY);
    expect(parsed.rows.find((r) => r.description === 'BIZUM ENVIADO')).toMatchObject({
      amount: -50,
      type: 'EXPENSE',
    });
  });

  it('a minus of any kind makes an expense, and the first amount of a line is the movement', () => {
    for (const dash of ['−', '–', '—', '‐', '-']) {
      const [row] = parsePastedMovements(
        `21/10/2026 BIZUM ENVIADO ${dash}50,00 € + 309,09 €`,
        TODAY
      ).rows;
      expect(row).toMatchObject({ amount: -50, type: 'EXPENSE', description: 'BIZUM ENVIADO' });
    }
  });
});

/** The 10 movements of the invented bank app of the videos, newest first. */
const BANK_APP: [string, string, number][] = [
  ['2026-10-26', 'Supermercado Los Olivos', -38.45],
  ['2026-10-26', 'Café del Parque', -1.8],
  ['2026-10-25', 'Cine Mirador', -17],
  ['2026-10-24', 'Panadería La Espiga', -3.2],
  ['2026-10-24', 'Gasolinera Ruta 9', -52.1],
  ['2026-10-23', 'Transferencia de Marta R.', 25],
  ['2026-10-22', 'Recibo luz Hogar Eléctrica', -64.38],
  ['2026-10-21', 'Nómina Estudio Aurora', 1450],
  ['2026-10-21', 'Farmacia Central', -12.45],
  ['2026-10-20', 'Suscripción Música Plus', -9.99],
];

describe('a screenshot with the header of the bank app above the movements (reported case)', () => {
  it.each([
    ['a greeting, the account, the big balance and «Saldo disponible»', headerGreeting],
    ['the same 2000 px wide', headerGreetingWide],
    ['no greeting', headerNoGreeting],
    ['the holder, «Saldo», the balance, «disponible» and a search box', headerHolderAvailable],
    ['the tab «Movimientos | Tarjetas» and «Fraccionar pago»', headerTabs],
    [
      'a light header with a signed balance, tabs and «Buscar», 2000 px wide',
      headerLightSignedWide,
    ],
  ])('reads the 10 movements and nothing of the header: %s', (_name, lines) => {
    const parsed = parsePastedMovements(textFromOcrLines(lines), TODAY);
    expect(parsed.rows.map((r) => [r.date, r.description, r.amount])).toEqual(BANK_APP);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.review).toEqual([]);
  });

  it('leaves out the big balance even without a label around it', () => {
    const bare = headerHolderAvailable.filter(
      (l) => !['Saldo', 'disponible', 'Tarjetas Recibos', 'Buscar movimientos'].includes(l.text)
    );
    expect(textFromOcrLines(bare)).not.toContain('2.186,32 €\nLunes');
    expect(brief(textFromOcrLines(bare))).toEqual(BANK_APP);
  });

  it('the same header copied as text is not a movement either', () => {
    const header = ['Hola, Lucía', 'Cuenta corriente ···· 4821', '+2.186,32 €', 'Saldo disponible'];
    for (const tabs of [[], ['Movimientos | Tarjetas'], ['Buscar']]) {
      const text = [...header, ...tabs, '26/10/2026', 'Cine Mirador', '-17,00 €'].join('\n');
      expect(brief(text)).toEqual([['2026-10-26', 'Cine Mirador', -17]]);
    }
    // An amount alone at the top, with nothing above it, is no movement.
    expect(brief('2.186,32 €\nLunes, 26 de octubre\nCine Mirador -17,00 €')).toEqual([
      ['2026-10-26', 'Cine Mirador', -17],
    ]);
  });

  it('keeps the first movement when its day is written under it, or its concept above the day', () => {
    expect(brief('Hola, Lucía\nGlovo\n-18,40 €\n24/10/2026\nLidl\n-3,00 €\n23/10/2026')).toEqual([
      ['2026-10-24', 'Glovo', -18.4],
      ['2026-10-23', 'Lidl', -3],
    ]);
    expect(brief('Cuentas\nWWW.AMAZON\n25/10/2026\n-38,84 €')).toEqual([
      ['2026-10-25', 'WWW.AMAZON', -38.84],
    ]);
    // Below the first day, a concept may start like the header.
    expect(brief('26/10/2026\nCuenta nómina comisión -2,00 €')).toEqual([
      ['2026-10-26', 'Cuenta nómina comisión', -2],
    ]);
  });
});

describe('pasted movements: days below and balances', () => {
  it('a movement waiting for its day that never comes is skipped, and so is the one before', () => {
    const parsed = parsePastedMovements('Glovo -18,40 €\nLidl -3,00 €', TODAY);
    expect(parsed.rows).toEqual([]);
    expect(parsed.skipped).toEqual([1, 2]);
  });

  it('balances that do not add up are movements; oldest first they add up too', () => {
    expect(brief('12/10 Bar -3,00 €\nBizum 5,00 €\n13/10 Pan -1,00 €\nAna 9,00 €')).toHaveLength(4);
    expect(brief('12/10 Bar -3,00 €\n97,00 €\n13/10 Pan -1,00 €\n96,00 €')).toEqual([
      ['2026-10-12', 'Bar', -3],
      ['2026-10-13', 'Pan', -1],
    ]);
  });

  it('«Saldo» at the end of a line is not the amount', () => {
    expect(brief('12/10/2026 Bar -3,00 € Saldo 1.200,00 €')).toEqual([['2026-10-12', 'Bar', -3]]);
  });
});

describe('the OCR on the device', () => {
  const pixels = (...rgb: number[]) => new Uint8ClampedArray(rgb.flatMap((v) => [v, v, v, 255]));

  it('turns a dark screenshot into dark text on white, and leaves a light one grey', () => {
    const dark = pixels(10, 10, 250);
    toReadableGrey(dark);
    expect(Array.from(dark.slice(0, 4))).toEqual([245, 245, 245, 255]);
    const light = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255]);
    toReadableGrey(light);
    expect(Array.from(light)).toEqual([76, 76, 76, 255, 255, 255, 255, 255]);
  });

  afterEach(() => {
    delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
    jest.restoreAllMocks();
  });

  it('reads the image as it is where it cannot be drawn on a canvas, and frees the worker', async () => {
    worker.recognize.mockResolvedValueOnce({ data: { blocks: null } });
    const image = new File(['x'], 'captura.png', { type: 'image/png' });
    expect(await readScreenshot(image)).toBe('');
    expect(worker.recognize).toHaveBeenLastCalledWith(image, {}, { blocks: true });
    expect(worker.terminate).toHaveBeenCalled();

    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = jest.fn(async () => ({
      width: 2,
      height: 1,
    }));
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    worker.recognize.mockResolvedValueOnce(ocrAnswer([]));
    await readScreenshot(image);
    expect(worker.recognize).toHaveBeenLastCalledWith(image, {}, { blocks: true });
  });

  it('draws the screenshot on a canvas, makes it readable and puts its rows together', async () => {
    const data = { data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]) };
    const context = {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => data),
      putImageData: jest.fn(),
    };
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = jest.fn(async () => ({
      width: 2,
      height: 1,
    }));
    jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    worker.recognize.mockResolvedValueOnce(
      ocrAnswer([
        { text: 'Bar', x0: 0, x1: 50, y0: 0, y1: 20 },
        { text: '', x0: 0, x1: 50, y0: 30, y1: 40 },
        { text: '-3,00 €', x0: 200, x1: 260, y0: 2, y1: 22 },
      ])
    );
    expect(await readScreenshot(new File(['x'], 'c.png', { type: 'image/png' }))).toBe(
      'Bar  -3,00 €'
    );
    expect(Array.from(data.data.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(context.putImageData).toHaveBeenCalledWith(data, 0, 0);
    expect(worker.recognize.mock.lastCall[0]).toBeInstanceOf(HTMLCanvasElement);
  });

  it('knows a picture by its type or its name', () => {
    expect(isImage(new File(['x'], 'a.bin', { type: 'image/jpeg' }))).toBe(true);
    expect(isImage(new File(['x'], 'Captura.PNG'))).toBe(true);
    expect(isImage(new File(['x'], 'extracto.csv', { type: 'text/csv' }))).toBe(false);
  });
});

describe('the screenshot tab of the importer', () => {
  beforeEach(() => freezeTime('2026-10-26T12:00:00'));
  afterEach(restoreTime);

  const setup = () => {
    const api = createFakeApi();
    renderWithProviders(
      <ImportModal accounts={[f.account()]} onClose={jest.fn()} onImported={jest.fn()} />,
      { api, finances: false }
    );
    return api;
  };
  const image = new File(['x'], 'captura.png', { type: 'image/png' });

  it('reads a chosen screenshot on the device and shows its rows to correct', async () => {
    const api = setup();
    fireEvent.click(screen.getByRole('tab', { name: literal(tr('app.import.source.screenshot')) }));
    expect(screen.getByText(tr('app.import.screenshot.private'))).toBeVisible();
    let answer!: (value: unknown) => void;
    worker.recognize.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const input = screen.getByLabelText(tr('app.import.screenshot.choose'));
    fireEvent.change(input, { target: { files: [] } });
    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByRole('status')).toHaveTextContent(
      tr('app.import.screenshot.reading')
    );
    await act(async () => answer(ocrAnswer(lightBlocks)));
    expect(
      await screen.findByText(literal(tr('app.import.rowsFound', { count: 9 })))
    ).toBeVisible();
    expect(screen.getByText(/captura\.png · Captura/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.import.preview') }));
    await waitFor(() => expect(api.transactionApi.import).toHaveBeenCalled());
    expect(api.transactionApi.import.mock.calls[0][0]).toHaveLength(9);
  });

  it('says so when the image has no movements or cannot be read', async () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: literal(tr('app.import.source.screenshot')) }));
    const input = screen.getByLabelText(tr('app.import.screenshot.choose'));
    worker.recognize.mockResolvedValueOnce(ocrAnswer([]));
    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByText(tr('app.import.screenshot.nothing'))).toBeInTheDocument();
    worker.recognize.mockRejectedValueOnce(new Error('bad image'));
    fireEvent.change(input, { target: { files: [image] } });
    expect(await screen.findByText(tr('app.import.screenshot.error'))).toBeInTheDocument();
  });

  it('reads an image pasted with Ctrl/Cmd+V, and leaves other pastes alone', async () => {
    setup();
    const paste = (files: File[] | null) => {
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.assign(event, { clipboardData: files ? { files } : null });
      document.dispatchEvent(event);
      return event;
    };
    expect(paste(null).defaultPrevented).toBe(false);
    expect(paste([new File(['x'], 'a.txt', { type: 'text/plain' })]).defaultPrevented).toBe(false);
    worker.recognize.mockResolvedValueOnce(ocrAnswer(darkDayBelow));
    let event!: Event;
    act(() => {
      event = paste([image]);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(
      await screen.findByText(literal(tr('app.import.rowsFound', { count: 6 })))
    ).toBeVisible();
  });
});
