import { readPdfText } from '@modules/tools/application/readPdf';

const pages = [
  ['Retribuciones', 'dinerarias'],
  ['30.000,00', null],
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
            items: pages[n - 1].map((str) => (str === null ? { type: 'mark' } : { str })),
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

describe('reading a PDF', () => {
  it('joins the text of every page', async () => {
    const file = { arrayBuffer: async () => new ArrayBuffer(1) } as unknown as File;
    expect(await readPdfText(file)).toBe('Retribuciones dinerarias\n30.000,00 ');
  });
});
