// The Android app carries only what it uses:
// - not the receipt scanner's files (14 MB): it loads them from our server the first time a
//   receipt is scanned (see OCR_PATH in ReceiptScanner);
// - not the files only the website needs: images for shared links, the landing page (the app
//   opens on the login screen) and the install prompt, files for search engines, unused logo
//   sizes, and the compressed copies nginx serves.
// The PDF reader stays: the Renta draft step reads PDFs inside the app.
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const WEB_ONLY = [
  'ocr',
  'landing',
  'og-image.png',
  'logo-192.png',
  'logo-512.png',
  'logo-mark.png',
  'icon-512.png',
  'screenshots',
  'sitemap.xml',
  'robots.txt',
];
for (const name of WEB_ONLY) rmSync(join(dist, name), { recursive: true, force: true });
for (const name of readdirSync(dist)) {
  if (/^google[0-9a-f]+\.html$/.test(name)) rmSync(join(dist, name));
}
const assets = join(dist, 'assets');
for (const name of readdirSync(assets)) {
  if (/\.(br|gz)$/.test(name)) rmSync(join(assets, name));
}

// Older app versions installed a service worker; it must still find every file it precaches,
// or it can never update to the version that removes it (see UpdatePrompt).
const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
const missing = [...sw.matchAll(/url:"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((url) => !existsSync(join(dist, url)));
if (missing.length) throw new Error(`[slim-android] precached but removed: ${missing.join(', ')}`);
