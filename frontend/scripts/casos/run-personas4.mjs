/**
 * `node scripts/casos/run-personas4.mjs` (from frontend/): builds the fourth batch of the case bank
 * (investors «p4-109» to «p4-118», generar-personas4.ts), bundled with esbuild into a temporary
 * folder that is removed afterwards. It does not touch the other personas.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.build-p4');
const banner = [
  "import { fileURLToPath as __f } from 'url';",
  "import { dirname as __d } from 'path';",
  "import { createRequire as __r } from 'module';",
  'const __dirname = __d(__f(import.meta.url));',
  'const require = __r(import.meta.url);',
].join(' ');

try {
  await build({
    entryPoints: [join(here, 'generar-personas4.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['pdfjs-dist'],
    outdir: out,
    outExtension: { '.js': '.mjs' },
    banner: { js: banner },
    logLevel: 'warning',
  });
  execFileSync(process.execPath, [join(out, 'generar-personas4.mjs')], { stdio: 'inherit' });
} finally {
  rmSync(out, { recursive: true, force: true });
}
