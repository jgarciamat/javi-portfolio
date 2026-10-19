/**
 * `npm run validar-archivo -- <ruta>` (from frontend/): reads one file of a broker, exchange or fund
 * manager (CSV, XLSX, JSON or PDF) with the same importer as the app and prints only its structure
 * and totals: the format found, operations, years, kinds, totals, warnings and the column names of
 * what was not recognised. It never prints names, ids, addresses or rows, and sends nothing: it is
 * for the owner to try real exports on their own computer.
 */
import { readFileSync, existsSync } from 'fs';
import { basename, join } from 'path';
import { pathToFileURL } from 'url';
import { JSDOM } from 'jsdom';
import { readInvestFile } from '../src/modules/tools/application/investImport';
import { linesOf } from '../src/modules/tools/application/readPdf';
import { buildLedger } from '../src/modules/tools/domain/invest/ledger';
import { withheldInOf } from '../src/modules/tools/domain/invest/formats';
import {
  isCertificate,
  isQuantfury,
  readCertificate,
  readQuantfury,
} from '../src/modules/tools/domain/invest/pdfReports';
import type { TableReading } from '../src/modules/tools/domain/invest/detect';
import type { RateTable } from '../src/modules/tools/domain/invest/fx';
import { reportLines, validationReport } from '../src/modules/tools/domain/invest/validate';
import { rentaState } from '../src/modules/tools/data/renta/state';

// The spreadsheet reader of the app parses XML with the browser's DOMParser.
(globalThis as { DOMParser?: unknown }).DOMParser = new JSDOM().window.DOMParser;

async function pdfLines(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = (await import(
    pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href
  )) as typeof import('pdfjs-dist');
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    const pieces = content.items
      .filter((it): it is Extract<typeof it, { str: string }> => 'str' in it)
      .map((it) => ({ x: it.transform[4], y: it.transform[5], str: it.str }));
    out.push(...linesOf(pieces));
  }
  return out;
}

async function main() {
  const path = process.argv[2];
  if (!path || !existsSync(path)) {
    console.error('Uso: npm run validar-archivo -- <ruta del archivo>');
    process.exit(1);
  }
  const bytes = new Uint8Array(readFileSync(path));
  const ratesFile = join(process.cwd(), 'public', 'ecb-rates.json');
  const rates: RateTable = existsSync(ratesFile)
    ? (JSON.parse(readFileSync(ratesFile, 'utf8')) as { rates: RateTable }).rates
    : {};
  let readings: TableReading[] = [];
  let certificate: ReturnType<typeof readCertificate> = [];
  if (path.toLowerCase().endsWith('.pdf')) {
    const lines = await pdfLines(bytes);
    if (isQuantfury(lines)) {
      const ops = readQuantfury(lines);
      readings = [
        {
          table: 'pdf',
          format: null,
          ops,
          skipped: 0,
          header: [],
          headerRow: 0,
          info: false,
          dataRows: ops.length,
        },
      ];
      console.log('PDF reconocido: Quantfury, informe del historial de trading');
    } else if (isCertificate(lines)) certificate = readCertificate(lines);
    else console.log('PDF sin operaciones ni certificado reconocible');
  } else {
    const file = new File([bytes], basename(path));
    const read = await readInvestFile(file);
    if (read.error) console.log(`No se ha podido leer: ${read.error}`);
    readings = read.readings;
  }
  const ledger = buildLedger(
    readings.flatMap((r) => r.ops),
    { year: rentaState.year, rates, withheldIn: withheldInOf() }
  );
  console.log(
    reportLines(validationReport(readings, ledger, certificate, basename(path))).join('\n')
  );
}

void main();
