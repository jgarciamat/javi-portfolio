import { strToU8, zipSync } from 'fflate';
import type { ReportSheet, Zone } from '../domain/invest/report';
import { webValue } from '../domain/invest/rentaWeb';
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
          readings: [
            {
              table: name,
              format: QUANTFURY,
              ops,
              skipped: 0,
              header: [],
              headerRow: 0,
              dataRows: ops.length,
            },
          ],
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

/** The labels over each kind of column of a table with zones, in the file and in the PDF. */
export const ZONE_BAND: Record<Exclude<Zone, 'plain'>, string> = {
  copy: 'COPIA ESTO EN RENTA WEB (un campo por columna)',
  check: 'NO COPIAR: COMPROBACIÓN (lo que Renta WEB debe mostrarte)',
  done: 'MARCA',
};

/**
 * Styles of the workbook (xl/styles.xml): 0 plain, 1 title, 2 bold; the header of each zone
 * (3 plain, 4 copy, 5 check, 6 done), its cells (7-10), its cells in euros with two decimals
 * (11-14), and the band over the header (15-17). Copy is yellow, check grey, done green.
 */
const STYLES = (() => {
  const fills = ['FFDDE6F5', 'FFFFF2CC', 'FFEDEDED', 'FFE2EFDA'];
  const xf = (font: number, fill: number, border: number, numFmt = 0, wrap = false) =>
    `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${border}"${
      numFmt ? ' applyNumberFormat="1"' : ''
    }${fill ? ' applyFill="1"' : ''}${border ? ' applyBorder="1"' : ''}${
      font ? ' applyFont="1"' : ''
    }${wrap ? ' applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' : '/>'}`;
  const zones = [2, 3, 4, 5];
  const cellXfs = [
    xf(0, 0, 0),
    xf(2, 0, 0),
    xf(1, 0, 0),
    ...zones.map((f) => xf(1, f, 1, 0, true)),
    ...zones.map((f) => xf(0, f === 2 ? 0 : f, 1)),
    ...zones.map((f) => xf(0, f === 2 ? 0 : f, 1, 164)),
    ...[3, 4, 5].map((f) => xf(1, f, 0)),
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="${
    fills.length + 2
  }"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills
    .map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/></patternFill></fill>`)
    .join(
      ''
    )}</fills><borders count="2"><border/><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${
    cellXfs.length
  }">${cellXfs.join(
    ''
  )}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
})();

const ZONE_INDEX: Record<Zone, number> = { plain: 0, copy: 1, check: 2, done: 3 };

/** The rows of one sheet as cells with their style: the intro, the band, the header and the body. */
function sheetCells(sheet: ReportSheet): { rows: [string | number, number][][]; merges: string[] } {
  const rows: [string | number, number][][] = [];
  const merges: string[] = [];
  (sheet.intro ?? []).forEach((line, i) => rows.push([[line, i === 0 ? 1 : 0]]));
  if (sheet.intro?.length) rows.push([]);
  const zones = sheet.zones;
  const [head, ...body] = sheet.rows;
  if (zones?.some((z) => z !== 'plain')) {
    // The band over the header: one label over each run of columns of the same zone.
    const band: [string | number, number][] = [];
    const r = rows.length + 1;
    zones.forEach((z, c) => {
      const starts = c === 0 || zones[c - 1] !== z;
      if (z === 'plain' || !starts) return band.push(['', 0]);
      band.push([ZONE_BAND[z], 14 + ZONE_INDEX[z]]);
      let end = c;
      while (zones[end + 1] === z) end++;
      if (end > c) merges.push(`${col(c)}${r}:${col(end)}${r}`);
    });
    rows.push(band);
  }
  const zoneOf = (c: number) => ZONE_INDEX[zones?.[c] ?? 'plain'];
  rows.push(head.map((v, c) => [v, zones ? 3 + zoneOf(c) : 2]));
  for (const row of body)
    rows.push(
      row.map((v, c) => [
        v,
        !zones && !sheet.money
          ? 0
          : (sheet.money?.[c] && typeof v === 'number' ? 11 : 7) + zoneOf(c),
      ])
    );
  return { rows, merges };
}

/**
 * A workbook (one sheet per table, numbers as numbers): opens in Excel and LibreOffice. A sheet
 * may bring lines of text before its table and the zones of its columns (report.ts), which are
 * coloured; the euros keep two decimals, shown with the decimal sign of the computer's language.
 */
export function xlsxOf(sheets: ReportSheet[]): Uint8Array {
  const sheetXml = (sheet: ReportSheet) => {
    const { rows, merges } = sheetCells(sheet);
    const width = Math.max(...sheet.rows.map((r) => r.length));
    const cols = sheet.zones
      ? `<cols><col min="1" max="${width}" width="${width <= 3 ? 48 : 22}" customWidth="1"/></cols>`
      : '';
    // Printed, a tab with zones fits the width of a landscape page.
    const fit = sheet.zones ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : '';
    const print = sheet.zones
      ? '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
      : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fit}${cols}<sheetData>${rows
      .map(
        (row, r) =>
          `<row r="${r + 1}">${row
            .map(([v, st], c) => {
              const s = st ? ` s="${st}"` : '';
              return typeof v === 'number'
                ? `<c r="${col(c)}${r + 1}"${s}><v>${v}</v></c>`
                : `<c r="${col(c)}${r + 1}"${s} t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
            })
            .join('')}</row>`
      )
      .join('')}</sheetData>${
      merges.length
        ? `<mergeCells count="${merges.length}">${merges
            .map((m) => `<mergeCell ref="${m}"/>`)
            .join('')}</mergeCells>`
        : ''
    }${print}</worksheet>`;
  };
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': text(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
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
        .join(
          ''
        )}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    ),
    'xl/styles.xml': text(STYLES),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = text(sheetXml(s))));
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

/** Colours of the zones in the PDF (the same as in the workbook). */
const PDF_FILL: Record<Zone, [number, number, number]> = {
  plain: [221, 230, 245],
  copy: [255, 242, 204],
  check: [237, 237, 237],
  done: [226, 239, 218],
};

/** A value as the PDF shows it: with a decimal comma, the euros with two decimals (as Renta WEB). */
const pdfValue = (v: string | number, money: boolean) =>
  typeof v === 'string' ? v : money ? webValue(v) : String(v).replace('.', ',');

/**
 * The report as a PDF: for each sheet its lines of text and its table, the columns coloured by
 * zone with a band over them, as the workbook (jsPDF, as the other PDFs of the app).
 */
export async function reportPdf(title: string, sheets: ReportSheet[]): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  const bottom = doc.internal.pageSize.getHeight() - 14;
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(8);
  doc.text('Simulación orientativa de Finanverso: no es un documento oficial.', 14, 22);
  let y = 28;
  const line = (text: string, size: number, bold: boolean) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    for (const part of doc.splitTextToSize(text, 268) as string[]) {
      if (y > bottom) {
        doc.addPage();
        y = 16;
      }
      doc.text(part, 14, y);
      y += size * 0.45;
    }
  };
  sheets.forEach((sheet, i) => {
    // Every window on a page of its own, so it can be followed beside Renta WEB.
    if (i > 0 && sheet.zones?.includes('copy')) {
      doc.addPage();
      y = 16;
    }
    line(sheet.name, 11, true);
    (sheet.intro ?? []).forEach((text, j) => line(text, j === 0 ? 10 : 8, j === 0));
    const zones = sheet.zones;
    const band = zones?.some((z) => z !== 'plain')
      ? zones.reduce<{ content: string; colSpan: number; zone: Zone }[]>((cells, z, c) => {
          if (c > 0 && zones[c - 1] === z) cells[cells.length - 1].colSpan++;
          else cells.push({ content: z === 'plain' ? '' : ZONE_BAND[z], colSpan: 1, zone: z });
          return cells;
        }, [])
      : null;
    const fill = (c: number) => PDF_FILL[zones?.[c] ?? 'plain'];
    autoTable(doc, {
      startY: y + 1,
      head: [
        ...(band
          ? [
              band.map((b) => ({
                content: b.content,
                colSpan: b.colSpan,
                styles: { fillColor: PDF_FILL[b.zone], textColor: 20, fontStyle: 'bold' as const },
              })),
            ]
          : []),
        sheet.rows[0].map(String),
      ],
      body: sheet.rows.slice(1).map((r) => r.map((v, c) => pdfValue(v, !!sheet.money?.[c]))),
      styles: { fontSize: 7 },
      headStyles: { textColor: 20 },
      didParseCell: (data) => {
        if (
          data.section === 'body' ||
          (data.section === 'head' && data.row.index === (band ? 1 : 0))
        )
          data.cell.styles.fillColor = fill(data.column.index);
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  });
  return doc.output('blob');
}
