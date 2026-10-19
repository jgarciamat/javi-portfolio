/**
 * Reads the synthetic invoices with the real pdf.js (its Node build) and the app's own reader, and
 * says how many fields of each one came out right: `npm run invoices:verify`. With `FIXTURES=1` it
 * also writes the pieces of text of each PDF as the fixture of the Jest tests.
 */
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
import { join } from 'path';
import { pathToFileURL } from 'url';
import {
  classifyPdf,
  tokensFromPdf,
  type PdfDocument,
} from '../src/modules/finances/application/taxModelPdf';
import { bookOf, type InvoicePdf } from '../src/modules/finances/domain/invoicePdf';
import type { PdfToken } from '../src/modules/finances/domain/taxModelPdf';
import { INVOICE_EXAMPLES, type Expected } from './invoice-pdfs';

// Run from the frontend folder (the bundle lives elsewhere).
const frontend = process.cwd();
const FIXTURE = join(frontend, 'src', '__tests__', 'finances', 'fixtures', 'invoicePdfTokens.json');

type Fields = Record<string, boolean>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function compare(read: InvoicePdf, want: Expected): Fields {
  return {
    date: read.date === want.date,
    number: read.number === want.number,
    issuerName: read.issuer.name === want.issuer.name,
    issuerNif: read.issuer.nif === want.issuer.nif,
    clientName: read.client.name === want.client.name,
    clientNif: read.client.nif === want.client.nif,
    taxes: same(read.taxes, want.taxes),
    withheld: read.withheld === want.withheld,
    total: read.total === want.total,
    credit: read.credit === want.credit,
    review: same([...read.review].sort(), [...want.review].sort()),
    book: bookOf(read, null).book === want.book,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

void (async () => {
  const require = createRequire(join(frontend, 'package.json'));
  const pdfjs = await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  );
  const fixtures: Record<string, PdfToken[][]> = {};
  const totals: Record<string, [number, number]> = {};
  let failures = 0;
  for (const example of INVOICE_EXAMPLES) {
    const data = await example.build();
    const pdf = await pdfjs.getDocument({ data, isEvalSupported: false, verbosity: 0 }).promise;
    const pages = await tokensFromPdf(pdf as unknown as PdfDocument);
    fixtures[example.file] = pages.map((tokens) =>
      tokens.map((t) => ({
        ...t,
        x: round(t.x),
        y: round(t.y),
        ...(t.w !== undefined ? { w: round(t.w) } : {}),
        ...(t.h !== undefined ? { h: round(t.h) } : {}),
      }))
    );
    const result = classifyPdf(pages);
    if (example.rejected) {
      const ok =
        result.kind === 'invoice' && !result.parsed.ok && result.parsed.reason === example.rejected;
      const entry = (totals.rejected ??= [0, 0]);
      entry[0] += ok ? 1 : 0;
      entry[1] += 1;
      if (!ok) failures++;
      console.log(`${ok ? 'OK ' : 'MAL'} ${example.file}: ${JSON.stringify(result.parsed)}`);
      continue;
    }
    if (result.kind !== 'invoice' || !result.parsed.ok) {
      failures++;
      console.log(`MAL ${example.file}: ${JSON.stringify(result)}`);
      continue;
    }
    const fields = compare(result.parsed.invoice, example.expected as Expected);
    for (const [name, ok] of Object.entries(fields)) {
      const entry = (totals[name] ??= [0, 0]);
      entry[0] += ok ? 1 : 0;
      entry[1] += 1;
    }
    const wrong = Object.keys(fields).filter((k) => !fields[k]);
    if (wrong.length > 0) failures++;
    console.log(
      `${wrong.length === 0 ? 'OK ' : 'MAL'} ${example.file}${
        wrong.length ? ` (${wrong.join(', ')})` : ''
      }`
    );
    if (wrong.length > 0) console.log(JSON.stringify(result.parsed.invoice, null, 1));
  }
  console.log('\nAciertos por campo:');
  for (const [name, [ok, all]] of Object.entries(totals)) console.log(`  ${name}: ${ok}/${all}`);
  if (process.env.FIXTURES === '1') {
    writeFileSync(FIXTURE, `${JSON.stringify(fixtures)}\n`);
    console.log(`\nFixture: ${FIXTURE}`);
  }
  process.exitCode = failures > 0 ? 1 : 0;
})();
