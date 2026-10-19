/**
 * Reads the filled VAT forms with the real pdf.js (its Node build) and the app's own reader, and says
 * whether the boxes come out as expected: the examples of docs/ejemplos-importacion and, when
 * OFFICIAL_DIR points to them, the filled forms of the Manual práctico de IVA 2025 of the AEAT
 * (Cap_9_303_es_es.pdf and Cap_9_390_resumen_anual_es_es.pdf, downloaded from its site). With
 * FIXTURES=1 it writes their pieces of text as the fixture of the Jest tests (format it with prettier
 * afterwards). Run from frontend/:
 *
 *   npx esbuild scripts/verify-tax-models.ts --bundle --platform=node --format=cjs \
 *     --external:pdfjs-dist --outfile=scripts/.verify-tax-models.cjs --log-level=warning \
 *     && OFFICIAL_DIR=/path/to/pdfs node scripts/.verify-tax-models.cjs; rm -f scripts/.verify-tax-models.cjs
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { tokensFromPdf, type PdfDocument } from '../src/modules/finances/application/taxModelPdf';
import {
  parseTaxModelTokens,
  type PdfToken,
  type TaxModelPdf,
} from '../src/modules/finances/domain/taxModelPdf';

const frontend = process.cwd();
const examples = join(frontend, '..', 'docs', 'ejemplos-importacion');
const FIXTURE = join(frontend, 'src', '__tests__', 'finances', 'fixtures', 'vatModelTokens.json');

interface Check {
  file: string;
  dir: 'examples' | 'official';
  model: TaxModelPdf['model'];
  year: number;
  quarter: number | null;
  /** Boxes that must be read with these amounts (the 349: its operators). */
  boxes?: Record<string, number>;
  operators?: number;
  /** Pages kept in the fixture (all when absent). */
  pages?: number[];
}

// The official figures are those of docs/casos-practicos/oficiales.json (303-01 and 390-01/02).
const CHECKS: Check[] = [
  {
    file: 'ejemplo-ue-modelo-303-2T-2026.pdf',
    dir: 'examples',
    model: '303',
    year: 2026,
    quarter: 2,
    boxes: { '07': 5000, '10': 1500, '28': 1800, '36': 1500, '59': 1500, '60': 1000, '71': 672 },
  },
  {
    file: 'ejemplo-ue-modelo-349-2T-2026.pdf',
    dir: 'examples',
    model: '349',
    year: 2026,
    quarter: 2,
    operators: 3,
  },
  {
    file: 'ejemplo-ue-modelo-390-2026.pdf',
    dir: 'examples',
    model: '390',
    year: 2026,
    quarter: null,
    boxes: { '05': 20500, '33': 25300, '47': 5255, '64': 3633, '86': 1622, '108': 31500 },
  },
  {
    file: 'Cap_9_303_es_es.pdf',
    dir: 'official',
    model: '303',
    year: 2025,
    quarter: 1,
    boxes: {
      '07': 83000,
      '09': 17430,
      '10': 21000,
      '22': 24000,
      '24': 1248,
      '27': 23088,
      '28': 47000,
      '32': 12000,
      '36': 21000,
      '45': 16800,
      '46': 6288,
      '60': 12000,
      '110': 3000,
      '78': 3000,
      '71': 3288,
    },
    // The first quarter: its three pages.
    pages: [1, 2, 3],
  },
  {
    file: 'Cap_9_390_resumen_anual_es_es.pdf',
    dir: 'official',
    model: '390',
    year: 2025,
    quarter: null,
    boxes: {
      '05': 370200,
      '06': 77742,
      '33': 403200,
      '34': 84672,
      '47': 88416,
      '64': 68202,
      '65': 20214,
      '86': 17214,
      '95': 21546,
      '97': 2226,
      '662': 2106,
      '99': 361200,
      '108': 470376,
    },
  },
];

const round = (n: number) => Math.round(n * 100) / 100;

void (async () => {
  const require = createRequire(join(frontend, 'package.json'));
  const pdfjs = await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  );
  const fixtures: Record<string, PdfToken[][]> = {};
  let failures = 0;
  for (const c of CHECKS) {
    const dir = c.dir === 'examples' ? examples : process.env.OFFICIAL_DIR;
    const path = dir ? join(dir, c.file) : '';
    if (!dir || !existsSync(path)) {
      console.log(`--  ${c.file}: no está (OFFICIAL_DIR)`);
      continue;
    }
    const data = new Uint8Array(readFileSync(path));
    const pdf = await pdfjs.getDocument({ data, isEvalSupported: false, verbosity: 0 }).promise;
    const all = await tokensFromPdf(pdf as unknown as PdfDocument);
    const pages = c.pages ? c.pages.map((n) => all[n - 1]) : all;
    const parsed = parseTaxModelTokens(pages);
    const wrong: string[] = [];
    if (!parsed.ok) wrong.push(parsed.reason);
    else {
      const d = parsed.data;
      if (d.model !== c.model) wrong.push(`modelo ${d.model}`);
      if (d.year !== c.year) wrong.push(`ejercicio ${d.year}`);
      if (d.quarter !== c.quarter) wrong.push(`periodo ${d.quarter}`);
      for (const [box, amount] of Object.entries(c.boxes ?? {}))
        if (d.boxes[box] !== amount) wrong.push(`${box}=${d.boxes[box]} (esperado ${amount})`);
      if (c.operators !== undefined && (d.operators ?? []).length !== c.operators)
        wrong.push(`operadores ${(d.operators ?? []).length}`);
    }
    if (wrong.length > 0) failures++;
    console.log(
      `${wrong.length === 0 ? 'OK ' : 'MAL'} ${c.file}${
        wrong.length ? `: ${wrong.join(', ')}` : ''
      }`
    );
    fixtures[c.file] = pages.map((tokens) =>
      tokens.map((t) => ({
        ...t,
        x: round(t.x),
        y: round(t.y),
        ...(t.w !== undefined ? { w: round(t.w) } : {}),
        ...(t.h !== undefined ? { h: round(t.h) } : {}),
      }))
    );
  }
  if (process.env.FIXTURES === '1') {
    writeFileSync(FIXTURE, `${JSON.stringify(fixtures)}\n`);
    console.log(`\nFixture: ${FIXTURE}`);
  }
  process.exitCode = failures > 0 ? 1 : 0;
})();
