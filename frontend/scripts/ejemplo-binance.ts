/**
 * Writes the made-up Binance statement of the tests (src/test-utils/binanceWorkbook.ts, every sheet
 * with the exact headers of a real export and invented data) to an .xlsx to try in the app:
 * `npm run ejemplo-binance` → docs/casos-practicos/ejemplos/binance-informe-inventado.xlsx.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { BINANCE_WORKBOOK } from '../src/test-utils/binanceWorkbook';
import { buildXlsx } from './xlsx';

const out = join(
  process.cwd(),
  '..',
  'docs',
  'casos-practicos',
  'ejemplos',
  'binance-informe-inventado.xlsx'
);
writeFileSync(out, buildXlsx(BINANCE_WORKBOOK));
console.log(out);
