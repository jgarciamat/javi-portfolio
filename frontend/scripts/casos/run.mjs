/**
 * `npm run casos`: builds the documents of the case bank and checks the self-employed cases against the
 * backend engine (modelos 130 and 303). Both scripts are bundled with esbuild (the backend aliases come
 * from its own tsconfig) into a temporary folder that is removed afterwards.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '.build');
const banner = [
  "import { fileURLToPath as __f } from 'url';",
  "import { dirname as __d } from 'path';",
  "import { createRequire as __r } from 'module';",
  'const __dirname = __d(__f(import.meta.url));',
  'const require = __r(import.meta.url);',
].join(' ');

try {
  await build({
    entryPoints: [join(here, 'generar.ts'), join(here, 'comprobar-autonomos.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    external: ['pdfjs-dist'],
    outdir: out,
    outExtension: { '.js': '.mjs' },
    banner: { js: banner },
    logLevel: 'warning',
  });
  for (const script of ['generar.mjs', 'comprobar-autonomos.mjs']) {
    execFileSync(process.execPath, [join(out, script), ...process.argv.slice(2)], {
      stdio: 'inherit',
    });
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
