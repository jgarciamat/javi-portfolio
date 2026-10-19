/**
 * `npm run validar-archivo -- <ruta>`: bundles validar-archivo.ts with esbuild into a temporary
 * folder, runs it on the file and removes the bundle.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.build-validar');
const banner = [
  "import { fileURLToPath as __f } from 'url';",
  "import { dirname as __d } from 'path';",
  "import { createRequire as __r } from 'module';",
  'const __filename = __f(import.meta.url);',
  'const __dirname = __d(__filename);',
  'const require = __r(import.meta.url);',
].join(' ');

try {
  await build({
    entryPoints: [join(here, 'validar-archivo.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['pdfjs-dist', 'pdfjs-dist/*', 'jsdom'],
    outdir: out,
    outExtension: { '.js': '.mjs' },
    banner: { js: banner },
    logLevel: 'warning',
  });
  execFileSync(process.execPath, [join(out, 'validar-archivo.mjs'), ...process.argv.slice(2)], {
    stdio: 'inherit',
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
