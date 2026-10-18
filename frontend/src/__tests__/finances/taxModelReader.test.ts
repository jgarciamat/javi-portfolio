import { readTaxModelPdf, tokensFromPdf } from '@modules/finances/application/taxModelPdf';

/** A page as pdf.js hands it over: text with its transform, and the form fields with their rectangle. */
const page = (items: unknown[], widgets: unknown[]) => ({
  getTextContent: async () => ({ items }),
  getAnnotations: async () => widgets,
});

const text = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
const widget = (fieldName: string, fieldValue: unknown, x: number, y: number, over = {}) => ({
  subtype: 'Widget',
  fieldType: 'Tx',
  fieldName,
  fieldValue,
  rect: [x, y, x + 80, y + 14],
  ...over,
});

const pdf = {
  numPages: 2,
  getPage: async (n: number) =>
    n === 1
      ? page(
          [
            text(' Modelo 130 ', 10, 700),
            text('   ', 20, 700),
            { str: 'sin sitio' },
            { type: 'mark' },
          ],
          [
            widget('dato.4', ' 11.300,00 ', 475, 579),
            widget('textofijo.7', '01', 462, 577),
            widget('dato.5', '', 475, 567),
            widget('dato.6', null, 475, 555),
            widget('dato.7', ['a', 'b'], 475, 543),
            widget('dato.24', 'Off', 343, 206, { fieldType: 'Btn' }),
            widget('dato.9', '5', 475, 100, { subtype: 'Link' }),
            { subtype: 'Widget', fieldType: 'Tx', rect: [1, 2, 3, 4], fieldValue: '7' },
          ]
        )
      : page([text('Página 2', 5, 5)], []),
};

describe('Reading the pieces of a PDF', () => {
  it('turns text and typed fields into tokens with a place, and leaves out the empty ones', async () => {
    const pages = await tokensFromPdf(pdf);
    expect(pages[0]).toEqual([
      { text: 'Modelo 130', x: 10, y: 700, field: false },
      // The baseline of a field is a little above its bottom edge.
      { text: '11.300,00', x: 475, y: 581, field: true },
      // The labels of the official form are fields, but they are printed text.
      { text: '01', x: 462, y: 579, field: false },
      { text: '7', x: 1, y: 4, field: true },
    ]);
    expect(pages[1]).toEqual([{ text: 'Página 2', x: 5, y: 5, field: false }]);
  });
});

jest.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, getDocument: jest.fn() }), {
  virtual: true,
});
jest.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }), {
  virtual: true,
});

describe('readTaxModelPdf', () => {
  const file = { arrayBuffer: async () => new ArrayBuffer(1) } as unknown as File;
  const open = (doc: unknown) =>
    (jest.requireMock('pdfjs-dist').getDocument as jest.Mock).mockReturnValue({
      promise: Promise.resolve(doc),
    });

  it('reads a PDF in the browser and gives the boxes of the form', async () => {
    open({
      numPages: 1,
      getPage: async () =>
        page(
          [
            text('Pago fraccionado', 40, 756),
            text('Actividades económicas en estimación directa', 40, 768),
            text('Ejercicio', 373, 733),
            text('2026', 423, 733),
            text('Período', 488, 733),
            text('1T', 538, 733),
            text('01', 462, 577),
            text('5.300,00', 475, 577),
          ],
          []
        ),
    });
    expect(await readTaxModelPdf(file)).toEqual({
      ok: true,
      data: { model: '130', year: 2026, quarter: 1, boxes: { '01': 5300 } },
    });
  });

  it('says it is not a form it knows when the PDF has no title of the modelo 130 or 303', async () => {
    open({ numPages: 1, getPage: async () => page([text('Una factura', 1, 1)], []) });
    expect(await readTaxModelPdf(file)).toEqual({ ok: false, reason: 'unknownModel' });
  });
});
