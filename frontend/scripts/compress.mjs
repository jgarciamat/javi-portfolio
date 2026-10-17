// The hashed build assets never change, so they are compressed once here, at the highest levels,
// instead of on every request: nginx serves `<file>.br` or `<file>.gz` to the browsers that accept
// them (see deploy/nginx-web.conf). Every asset gets both files, even tiny ones: nginx relies on
// the .br file existing. The Android build skips this step (scripts/slim-android.mjs).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const dir = join('dist', 'assets');
const COMPRESSIBLE = /\.(js|mjs|css|svg|json)$/;
let raw = 0;
let br = 0;
let gz = 0;
for (const name of readdirSync(dir)) {
  if (!COMPRESSIBLE.test(name)) continue;
  const file = join(dir, name);
  const source = readFileSync(file);
  const brotli = brotliCompressSync(source, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
    },
  });
  const gzip = gzipSync(source, { level: 9 });
  writeFileSync(`${file}.br`, brotli);
  writeFileSync(`${file}.gz`, gzip);
  raw += source.length;
  br += brotli.length;
  gz += gzip.length;
}
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.info(`[compress] assets ${kb(raw)} → brotli ${kb(br)}, gzip ${kb(gz)}`);
