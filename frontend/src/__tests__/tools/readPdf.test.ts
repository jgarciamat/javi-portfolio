import { linesOf, readPdf, readPdfText } from '@modules/tools/application/readPdf';

const at = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
const pages = [
  [at('Retribuciones', 10, 700), at('dinerarias', 60, 700)],
  [at('30.000,00', 10, 500), null],
];
jest.mock(
  'pdfjs-dist',
  () => ({
    GlobalWorkerOptions: {},
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: async (n: number) => ({
          getTextContent: async () => ({
            items: pages[n - 1].map((item) => item ?? { type: 'mark' }),
          }),
        }),
      }),
    }),
  }),
  { virtual: true }
);
jest.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }), {
  virtual: true,
});

const file = { arrayBuffer: async () => new ArrayBuffer(1) } as unknown as File;

describe('reading a PDF', () => {
  it('joins the text of every page', async () => {
    expect(await readPdfText(file)).toBe('Retribuciones dinerarias\n30.000,00 ');
  });

  it('gives the printed lines too', async () => {
    expect((await readPdf(file)).lines).toEqual(['Retribuciones   dinerarias', '30.000,00']);
  });

  it('groups pieces by their height, top to bottom and left to right, without blanks', () => {
    const piece = (str: string, x: number, y: number) => ({ str, x, y });
    expect(
      linesOf([
        piece('0003', 400, 486),
        piece('Retribuciones dinerarias', 20, 487),
        piece(' ', 200, 486),
        piece('18.000,00', 300, 485.5),
        piece('Modelo 100', 20, 700),
      ])
    ).toEqual(['Modelo 100', 'Retribuciones dinerarias   18.000,00   0003']);
  });
});
