import { strToU8 as encode, zipSync } from 'fflate';

/** A copy made here: under jsdom the encoder's arrays come from another realm and zip refuses them. */
const strToU8 = (text: string): Uint8Array => Uint8Array.from(encode(text));

/**
 * A minimal .xlsx writer: text, numbers, dates and percentages, several sheets. It is what the tests
 * and `make-templates.ts` use to build the workbooks that the importers read; it is not shipped to users.
 */
export type XlsxCell =
  | string
  | number
  | null
  | { date: string; custom?: boolean }
  | { percent: number };
export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const columnName = (index: number): string => {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};

/** Days since 30 Dec 1899, the way Excel stores a date. */
const serialOf = (iso: string): number =>
  Math.round(
    (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) /
      86400000
  );

function cellXml(cell: XlsxCell, ref: string, strings: string[] | null): string {
  if (cell === null) return '';
  if (typeof cell === 'number') return `<c r="${ref}"><v>${cell}</v></c>`;
  if (typeof cell === 'string') {
    if (!strings)
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(cell)}</t></is></c>`;
    if (!strings.includes(cell)) strings.push(cell);
    return `<c r="${ref}" t="s"><v>${strings.indexOf(cell)}</v></c>`;
  }
  if ('date' in cell)
    return `<c r="${ref}" s="${cell.custom ? 3 : 1}"><v>${serialOf(cell.date)}</v></c>`;
  return `<c r="${ref}" s="2"><v>${cell.percent}</v></c>`;
}

function sheetXml(rows: XlsxCell[][], strings: string[] | null): string {
  const body = rows
    .map(
      (row, r) =>
        `<row r="${r + 1}">${row
          .map((cell, c) => cellXml(cell, `${columnName(c)}${r + 1}`, strings))
          .join('')}</row>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';

/** `sharedStrings` writes the text the way Excel does (one table of strings) instead of inline. */
export function buildXlsx(
  sheets: XlsxSheet[],
  options: { sharedStrings?: boolean } = {}
): Uint8Array {
  const strings: string[] | null = options.sharedStrings ? [] : null;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${
        strings
          ? '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
          : ''
      }${sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${
              i + 1
            }.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('')}</Types>`
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${
              i + 1
            }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
              i + 1
            }.xml"/>`
        )
        .join('')}<Relationship Id="rId${
        sheets.length + 1
      }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${
        strings
          ? `<Relationship Id="rId${
              sheets.length + 2
            }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`
          : ''
      }</Relationships>`
    ),
    'xl/styles.xml': strToU8(STYLES),
  };
  sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows, strings));
  });
  if (strings) {
    files['xl/sharedStrings.xml'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${
        strings.length
      }" uniqueCount="${strings.length}">${strings
        .map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`)
        .join('')}</sst>`
    );
  }
  return zipSync(files);
}
