/** The part of a pdf.js page the preview uses (so tests can hand their own). */
export interface ViewPage {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
    annotationMode?: number;
  }): RenderTask;
}

/** A drawing under way: pdf.js lets it be cancelled. */
export interface RenderTask {
  promise: Promise<void>;
  cancel?: () => void;
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

/** The drawing under way on each canvas: a canvas can only take one at a time. */
const drawing = new WeakMap<HTMLCanvasElement, { task: RenderTask; turn: number }>();
/** The last drawing asked for on each canvas. */
const latest = new WeakMap<HTMLCanvasElement, number>();

export function viewOf(doc: ViewDocument): FormView {
  return {
    pages: doc.numPages,
    async draw(n, canvas, width) {
      // A new page asked for while another is being drawn (quick «next» taps): the old one stops.
      const turn = (latest.get(canvas) ?? 0) + 1;
      latest.set(canvas, turn);
      const running = drawing.get(canvas);
      if (running) {
        running.task.cancel?.();
        await running.task.promise.catch(() => undefined);
      }
      const page = await doc.getPage(n);
      // A later call took the canvas meanwhile: it draws, this one does not.
      if (turn !== latest.get(canvas)) return;
      const ratio = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * ratio });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) return;
      const task = page.render({
        canvasContext: context,
        viewport,
        annotationMode: ANNOTATIONS_IN_CANVAS,
      });
      drawing.set(canvas, { task, turn });
      try {
        await task.promise;
      } catch (e) {
        // Cancelled for a newer page: not a failure.
        if ((e as { name?: string })?.name !== 'RenderingCancelledException') throw e;
      } finally {
        if (drawing.get(canvas)?.turn === turn) drawing.delete(canvas);
      }
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
