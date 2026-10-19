/**
 * Writes the synthetic invoices in PDF (docs/ejemplos-importacion/facturas-pdf) used to try the
 * invoice reader of Autónomos: `npm run invoices:examples`.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { INVOICE_EXAMPLES } from './invoice-pdfs';

const dir = join(__dirname, '..', '..', 'docs', 'ejemplos-importacion', 'facturas-pdf');
mkdirSync(dir, { recursive: true });

void (async () => {
  for (const example of INVOICE_EXAMPLES) {
    writeFileSync(join(dir, example.file), await example.build());
  }
  console.log(`${INVOICE_EXAMPLES.length} facturas en ${dir}`);
})();
