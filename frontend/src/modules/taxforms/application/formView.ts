/** The part of a pdf.js page the preview uses (so tests can hand their own). */
export interface ViewPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
    annotationMode?: number;
  }): { promise: Promise<void> };
}

export interface ViewDocument {
  numPages: number;
  getPage(n: number): Promise<ViewPage>;
  destroy(): Promise<void>;
}

/** A PDF opened to be shown page by page on a canvas. */
export interface FormView {
  pages: number;
  /** Draws page `n` (1-based) as wide as `width` CSS pixels, sharp on dense screens. */
  draw(n: number, canvas: HTMLCanvasElement, width: number): Promise<void>;
  close(): Promise<void>;
}

/** pdf.js draws the fields with their typed values in the picture (not as inputs on top). */
const ANNOTATIONS_IN_CANVAS = 1;

/** Opens the bytes of a preview with pdf.js, loaded on demand: the file never leaves the device. */
export async function openFormView(bytes: Uint8Array): Promise<FormView> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // pdf.js takes over the buffer it is given: it gets a copy, the PDF stays to be downloaded.
  const doc = (await pdfjs.getDocument({ data: bytes.slice() }).promise) as unknown as ViewDocument;
  return viewOf(doc);
}

export function viewOf(doc: ViewDocument): FormView {
  return {
    pages: doc.numPages,
    async draw(n, canvas, width) {
      const page = await doc.getPage(n);
      const ratio = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return;
      await page.render({
        canvasContext: context,
        viewport,
        annotationMode: ANNOTATIONS_IN_CANVAS,
      }).promise;
    },
    close: () => doc.destroy(),
  };
}

/** The picture of a page drawn on a canvas, as a PNG file. */
export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png');
  });
}
