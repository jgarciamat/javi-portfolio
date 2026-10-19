import {
  canvasPng,
  openFormView,
  viewOf,
  type ViewDocument,
} from '@modules/taxforms/application/formView';

const render = jest.fn(() => ({ promise: Promise.resolve() }));
const doc: ViewDocument = {
  numPages: 2,
  getPage: async () => ({
    getViewport: ({ scale }) => ({ width: 595 * scale, height: 842 * scale }),
    render,
  }),
  destroy: jest.fn(async () => undefined),
};

jest.mock(
  'pdfjs-dist',
  () => ({
    GlobalWorkerOptions: {},
    getDocument: (options: { data: Uint8Array }) => ({
      promise: Promise.resolve({ ...doc, numPages: options.data.length }),
    }),
  }),
  { virtual: true }
);
jest.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }), {
  virtual: true,
});

describe('Showing a preview page by page', () => {
  it('opens the bytes with pdf.js and keeps them for the download', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const view = await openFormView(bytes);
    expect(view.pages).toBe(3);
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('draws a page as wide as asked, sharp on dense screens, with the fields in the picture', async () => {
    const canvas = document.createElement('canvas');
    const context = {} as CanvasRenderingContext2D;
    jest.spyOn(canvas, 'getContext').mockReturnValue(context as never);
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    await viewOf(doc).draw(1, canvas, 595);
    expect(canvas.width).toBe(1190);
    expect(canvas.height).toBe(1684);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({ canvasContext: context, annotationMode: 1 })
    );
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    await viewOf(doc).draw(1, canvas, 300);
    expect(canvas.width).toBe(300);
  });

  it('does nothing without a 2D context, and closes the document', async () => {
    render.mockClear();
    const canvas = document.createElement('canvas');
    jest.spyOn(canvas, 'getContext').mockReturnValue(null);
    const view = viewOf(doc);
    await view.draw(1, canvas, 100);
    expect(render).not.toHaveBeenCalled();
    await view.close();
    expect(doc.destroy).toHaveBeenCalled();
  });

  it('gives the picture of a canvas as a PNG', async () => {
    const canvas = document.createElement('canvas');
    const png = new Blob(['png'], { type: 'image/png' });
    canvas.toBlob = (done: BlobCallback) => done(png);
    await expect(canvasPng(canvas)).resolves.toBe(png);
    canvas.toBlob = (done: BlobCallback) => done(null);
    await expect(canvasPng(canvas)).rejects.toThrow('png');
  });
});
