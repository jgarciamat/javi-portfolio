import { isNativeApp } from '@shared/utils/platform';
import { type OcrLine, textFromOcrLines } from '../domain/pastedMovements';

/**
 * Where the OCR files are served from (see scripts/copy-ocr.mjs): our own server, not a CDN. The
 * Android app does not carry them (they weigh 14 MB): it fetches them from the site. Only the
 * reader's files are downloaded: the images are read on the device and never uploaded.
 */
const WEB_OCR_PATH = 'https://finanverso.app/ocr/';
const ocrPath = (): string => (isNativeApp() ? WEB_OCR_PATH : '/ocr/');

/** A Spanish OCR worker running on the device (terminate it when done). */
export async function ocrWorker() {
  const { createWorker } = await import('tesseract.js');
  const path = ocrPath();
  return createWorker('spa', 1, {
    workerPath: `${path}worker.min.js`,
    corePath: path,
    langPath: path,
    gzip: true,
  });
}

/**
 * Grey, with a dark theme turned into dark text on white (the OCR reads light screenshots far
 * better). Changes the RGBA pixels in place.
 */
export function toReadableGrey(pixels: Uint8ClampedArray): void {
  const grey = (i: number) => 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) total += grey(i);
  const dark = total / (pixels.length / 4) < 128;
  for (let i = 0; i < pixels.length; i += 4) {
    const g = dark ? 255 - grey(i) : grey(i);
    pixels[i] = pixels[i + 1] = pixels[i + 2] = g;
  }
}

/** The screenshot drawn on a canvas and made readable; the image itself when that is not possible. */
async function readableImage(image: Blob): Promise<Blob | HTMLCanvasElement> {
  if (typeof createImageBitmap !== 'function') return image;
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) return image;
  context.drawImage(bitmap, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  toReadableGrey(data.data);
  context.putImageData(data, 0, 0);
  return canvas;
}

/**
 * The text of a screenshot of the bank's movements, on the device: one line per row as it looks
 * (concepts and amounts read as two columns are put back side by side).
 */
export async function readScreenshot(image: Blob): Promise<string> {
  const worker = await ocrWorker();
  try {
    const { data } = await worker.recognize(await readableImage(image), {}, { blocks: true });
    const lines: OcrLine[] = (data.blocks ?? [])
      .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines))
      .map((line) => ({ text: line.text, ...line.bbox }));
    return textFromOcrLines(lines);
  } finally {
    await worker.terminate();
  }
}
