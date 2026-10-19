/**
 * `node scripts/casos/run-personas2.mjs` (from frontend/): builds the documents of the second batch of
 * the case bank (personas «p2-», generar-personas2.ts), bundled with esbuild into a temporary folder
 * that is removed afterwards. It does not touch personas 01-28 nor the backend comparison.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.build-p2');
const banner = [
  "import { fileURLToPath as __f } from 'url';",
  "import { dirname as __d } from 'path';",
  "import { createRequire as __r } from 'module';",
  'const __dirname = __d(__f(import.meta.url));',
  'const require = __r(import.meta.url);',
].join(' ');

try {
  await build({
    entryPoints: [join(here, 'generar-personas2.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['pdfjs-dist'],
    outdir: out,
    outExtension: { '.js': '.mjs' },
    banner: { js: banner },
    logLevel: 'warning',
  });
  execFileSync(process.execPath, [join(out, 'generar-personas2.mjs')], { stdio: 'inherit' });
} finally {
  rmSync(out, { recursive: true, force: true });
}
