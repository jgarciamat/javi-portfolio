import { strToU8, zipSync } from 'fflate';
import { readSpreadsheet, SpreadsheetError } from '@modules/finances/application/spreadsheet';
import { storage } from '@shared/utils/storage';
import { readTables, jsonTables, withInfoSheets, type TableReading } from '../domain/invest/detect';
import { parseEcb, type RateTable } from '../domain/invest/fx';
import type { Mapping } from '../domain/invest/mapping';
import {
  isCertificate,
  isQuantfury,
  readCertificate,
  readQuantfury,
  type CertificateLine,
} from '../domain/invest/pdfReports';
import type { Table } from '../domain/invest/read';
import { readPdf } from './readPdf';

/** What a file gave: tables read with a format, tables still to map, or a certificate's lines. */
export interface FileReading {
  file: string;
  readings: TableReading[];
  /** The tables kept to read them again with the person's mapping. */
  tables: Table[];
  certificate: CertificateLine[];
  error?: 'unsupported' | 'unreadable' | 'tooBig' | 'empty';
}

/**
 * Reads one file in the browser: CSV/TXT, XLSX, JSON or PDF. Nothing is sent anywhere.
 */
export async function readInvestFile(file: File): Promise<FileReading> {
  const name = file.name;
  const lower = name.toLowerCase();
  const empty: FileReading = { file: name, readings: [], tables: [], certificate: [] };
  try {
    if (lower.endsWith('.pdf')) {
      const { lines } = await readPdf(file);
      if (isQuantfury(lines)) {
        const ops = readQuantfury(lines);
        return {
          ...empty,
          readings: [{ table: name, format: QUANTFURY, ops, skipped: 0, header: [], headerRow: 0 }],
        };
      }
      const certificate = isCertificate(lines) ? readCertificate(lines) : [];
      return { ...empty, certificate, error: certificate.length ? undefined : 'empty' };
    }
    const tables: Table[] = lower.endsWith('.json')
      ? jsonTables(name, await file.text())
      : await readSpreadsheet(file);
    const readings = withInfoSheets(readTables(tables, name));
    // Only the tables still to map are kept: an informative sheet may hold personal data.
    const toMap = new Set(readings.filter((r) => !r.format && !r.info).map((r) => r.table));
    return { ...empty, tables: tables.filter((tb) => toMap.has(tb.name)), readings };
  } catch (e) {
    const code = e instanceof SpreadsheetError ? e.code : 'unreadable';
    return { ...empty, error: code };
  }
}

/** Quantfury's PDF report (pdfReports.ts), shown in the list of formats like the others. */
export const QUANTFURY = {
  id: 'quantfury',
  platform: 'Quantfury',
  file: 'Informe del historial de trading (PDF): posiciones cerradas',
  category: 'broker' as const,
  docs: 'https://quantfury.com/',
  confirmed: null,
  signature: [],
  locale: 'en' as const,
  order: 'dmy' as const,
  columns: {},
  types: [],
  defaultClass: 'derivative' as const,
  shape: 'rows' as const,
};

// ─── What is remembered on this device ────────────────────────────────────────

const MAPPINGS_KEY = 'renta.invest.mappings';
const RATES_KEY = 'renta.invest.rates';

/** The mappings the person confirmed, by header (mapping.headerKey). */
export const savedMappings = (): Record<string, Mapping> =>
  storage.getJSON<Record<string, Mapping>>(MAPPINGS_KEY, {});

export function rememberMapping(key: string, mapping: Mapping): void {
  storage.setJSON(MAPPINGS_KEY, { ...savedMappings(), [key]: mapping });
}

/** «Start a new return»: the confirmed mappings go with the rest of the year's data. */
export function forgetMappings(): void {
  storage.set(MAPPINGS_KEY, null);
}

/** The exchange rates loaded (only the currencies the files use, to keep it small). */
export const savedRates = (): RateTable => storage.getJSON<RateTable>(RATES_KEY, {});

export function saveRates(rates: RateTable): void {
  storage.setJSON(RATES_KEY, rates);
}

/** The ECB rates that come with the app (public/ecb-rates.json, updated with `npm run ecb:update`). */
export interface BundledRates {
  rates: RateTable;
  /** The last day the file has a rate for (YYYY-MM-DD). */
  until: string;
}

/** Loads them from the app's own origin, once; null when the file is missing or unreadable. */
let bundled: Promise<BundledRates | null> | null = null;
export function loadBundledRates(): Promise<BundledRates | null> {
  bundled ??= (async () => {
    try {
      const res = await fetch('/ecb-rates.json');
      if (!res.ok) return null;
      const data = (await res.json()) as { rates?: RateTable; until?: string };
      return data.rates && data.until ? { rates: data.rates, until: data.until } : null;
    } catch {
      return null;
    }
  })();
  return bundled;
}

/** Forget what was loaded (tests). */
export const resetBundledRates = () => {
  bundled = null;
};

/** Reads the ECB's eurofxref-hist file (CSV, or the ZIP as the ECB gives it). */
export async function readEcbFile(file: File, keep?: Set<string>): Promise<RateTable> {
  if (file.name.toLowerCase().endsWith('.zip')) {
    const { unzipSync, strFromU8 } = await import('fflate');
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (f) => f.name.toLowerCase().endsWith('.csv'),
    });
    const csv = Object.values(files)[0];
    return csv ? parseEcb(strFromU8(csv), keep) : {};
  }
  return parseEcb(await file.text(), keep);
}

// ─── Downloads ────────────────────────────────────────────────────────────────

/** Bytes of a text, as an array of this page (fflate tells files from folders by their type). */
const text = (s: string) => new Uint8Array(strToU8(s));

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const col = (i: number): string =>
  (i >= 26 ? col(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

/** A plain workbook (one sheet per table, numbers as numbers): opens in Excel and LibreOffice. */
export function xlsxOf(sheets: { name: string; rows: (string | number)[][] }[]): Uint8Array {
  const sheetXml = (rows: (string | number)[][]) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
      .map(
        (row, r) =>
          `<row r="${r + 1}">${row
            .map((v, c) =>
              typeof v === 'number'
                ? `<c r="${col(c)}${r + 1}"><v>${v}</v></c>`
                : `<c r="${col(c)}${r + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`
            )
            .join('')}</row>`
      )
      .join('')}</sheetData></worksheet>`;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': text(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${
              i + 1
            }.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('')}</Types>`
    ),
    '_rels/.rels': text(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    ),
    'xl/workbook.xml': text(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map(
          (s, i) =>
            `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
        )
        .join('')}</sheets></workbook>`
    ),
    'xl/_rels/workbook.xml.rels': text(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${
              i + 1
            }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
              i + 1
            }.xml"/>`
        )
        .join('')}</Relationships>`
    ),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = text(sheetXml(s.rows))));
  return zipSync(files);
}

/** A workbook as a file to save. */
export const xlsxBlob = (bytes: Uint8Array) =>
  new Blob([bytes.slice().buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

/** Hands a file to the browser to save. */
export function download(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** The report as a PDF: one table per sheet (jsPDF, as the other PDFs of the app). */
export async function reportPdf(
  title: string,
  sheets: { name: string; rows: (string | number)[][] }[]
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(8);
  doc.text('Simulación orientativa de Finanverso: no es un documento oficial.', 14, 22);
  let y = 28;
  for (const sheet of sheets) {
    doc.setFontSize(11);
    doc.text(sheet.name, 14, y);
    autoTable(doc, {
      startY: y + 2,
      head: [sheet.rows[0].map(String)],
      body: sheet.rows.slice(1).map((r) => r.map(String)),
      styles: { fontSize: 7 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  return doc.output('blob');
}
