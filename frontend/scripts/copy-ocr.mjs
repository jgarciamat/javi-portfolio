// Copies what the receipt scanner needs (OCR worker, engine and Spanish data) into public/ocr,
// so it runs from our own server and offline instead of loading from a CDN.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const out = join('public', 'ocr');
mkdirSync(out, { recursive: true });

cpSync(join('node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
const core = join('node_modules', 'tesseract.js-core');
for (const file of readdirSync(core)) {
  if (file.endsWith('-lstm.wasm.js')) cpSync(join(core, file), join(out, file));
}
const data = join(
  'node_modules',
  '@tesseract.js-data',
  'spa',
  '4.0.0_best_int',
  'spa.traineddata.gz'
);
if (!existsSync(data)) throw new Error('Missing @tesseract.js-data/spa');
cpSync(data, join(out, 'spa.traineddata.gz'));
