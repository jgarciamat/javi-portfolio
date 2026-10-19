import { dateFromSerial, parseBookDate } from '@modules/finances/domain/excelDates';
import {
  readSpreadsheet,
  readXlsx,
  sheetAsText,
  SpreadsheetError,
} from '@modules/finances/application/spreadsheet';
import { buildXlsx, type XlsxSheet } from '../../../scripts/xlsx';

const buffer = (sheets: XlsxSheet[], shared = false): ArrayBuffer => {
  const bytes = buildXlsx(sheets, { sharedStrings: shared });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const fileOf = (name: string, content: ArrayBuffer | string): File => {
  const data: ArrayBuffer =
    typeof content === 'string'
      ? (new TextEncoder().encode(content).buffer as ArrayBuffer)
      : content;
  return Object.assign(new File([data], name), { arrayBuffer: async () => data });
};

const catchError = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return null;
};

describe('Excel dates', () => {
  it('turns serial numbers into dates, with the 1900 leap-year quirk already inside', () => {
    expect(dateFromSerial(44572)).toBe('2022-01-11');
    expect(dateFromSerial(46023)).toBe('2026-01-01');
    expect(dateFromSerial(44572.75)).toBe('2022-01-11');
  });

  it('reads the dates people type', () => {
    expect(parseBookDate('2026-03-05')).toBe('2026-03-05');
    expect(parseBookDate('05/03/2026')).toBe('2026-03-05');
    expect(parseBookDate('5-3-26')).toBe('2026-03-05');
    expect(parseBookDate('31.12.2025')).toBe('2025-12-31');
    expect(parseBookDate(46100)).toBe(dateFromSerial(46100));
  });

  it('rejects what is not a date', () => {
    for (const value of [
      '31/02/2026',
      '2026-13-01',
      'hola',
      '',
      12,
      90000,
      null,
      undefined,
      true,
    ]) {
      expect(parseBookDate(value)).toBeNull();
    }
  });
});

describe('readXlsx', () => {
  const sheets: XlsxSheet[] = [
    {
      name: 'Ingresos',
      rows: [
        ['Fecha', 'Importe', 'Tipo', 'Texto'],
        [{ date: '2026-03-05' }, 1234.5, { percent: 0.21 }, 'a & b <c>'],
        [null, null, null, 'solo la última'],
      ],
    },
    { name: 'Gastos', rows: [['x'], [{ date: '2026-04-01', custom: true }]] },
  ];

  it('reads every sheet: text, numbers, dates from their format and empty cells', () => {
    for (const shared of [false, true]) {
      const read = readXlsx(buffer(sheets, shared));
      expect(read.map((s) => s.name)).toEqual(['Ingresos', 'Gastos']);
      expect(read[0].rows[0]).toEqual(['Fecha', 'Importe', 'Tipo', 'Texto']);
      expect(read[0].rows[1]).toEqual(['2026-03-05', 1234.5, 0.21, 'a & b <c>']);
      expect(read[0].rows[2]).toEqual([null, null, null, 'solo la última']);
      // A date format written by the user (dd/mm/yyyy) is a date too.
      expect(read[1].rows[1]).toEqual(['2026-04-01']);
    }
  });

  it('gives the sheet as text for the importers that work on CSV tables', () => {
    const [first] = readXlsx(buffer(sheets));
    expect(sheetAsText(first)[1]).toEqual(['2026-03-05', '1234.5', '0.21', 'a & b <c>']);
    expect(sheetAsText(first)[2]).toEqual(['', '', '', 'solo la última']);
  });

  it('refuses what is not a workbook, or too big', () => {
    const notZip = new TextEncoder().encode('esto no es un excel').buffer as ArrayBuffer;
    expect((catchError(() => readXlsx(notZip)) as SpreadsheetError).code).toBe('unreadable');
    expect(
      (catchError(() => readXlsx(new ArrayBuffer(9 * 1024 * 1024))) as SpreadsheetError).code
    ).toBe('tooBig');
  });

  it('refuses a zip that has no workbook inside', async () => {
    const { zipSync, strToU8 } = await import('fflate');
    const bytes = zipSync({ 'hola.txt': strToU8('hola') });
    const data = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    expect((catchError(() => readXlsx(data)) as SpreadsheetError).code).toBe('unreadable');
  });
});

describe('readSpreadsheet', () => {
  it('reads an .xlsx file', async () => {
    const sheet = {
      name: 'Hoja',
      rows: [
        ['a', 'b'],
        [1, 2],
      ],
    };
    const read = await readSpreadsheet(fileOf('libro.xlsx', buffer([sheet])));
    expect(read[0].rows).toEqual([
      ['a', 'b'],
      [1, 2],
    ]);
  });

  it('reads a CSV as one sheet, in UTF-8 or in Latin-1', async () => {
    const utf8 = await readSpreadsheet(fileOf('f.csv', 'Fecha;Base\n05/03/2026;100,5\n'));
    expect(utf8[0].rows).toEqual([
      ['Fecha', 'Base'],
      ['05/03/2026', '100,5'],
    ]);
    // "Descripción" in Latin-1: the byte 0xF3 is not valid UTF-8.
    const latin1 = new Uint8Array([68, 101, 115, 99, 114, 105, 112, 99, 105, 0xf3, 110, 10, 120]);
    const read = await readSpreadsheet(fileOf('f.csv', latin1.buffer as ArrayBuffer));
    expect(read[0].rows[0]).toEqual(['Descripción']);
  });

  it('refuses the old binary formats', async () => {
    for (const name of ['viejo.xls', 'hoja.ods']) {
      await expect(readSpreadsheet(fileOf(name, 'x'))).rejects.toMatchObject({
        code: 'unsupported',
      });
    }
  });
});

describe('readXlsx with the oddities of real workbooks', () => {
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

  const zip = async (parts: Record<string, string>): Promise<ArrayBuffer> => {
    const { zipSync, strToU8 } = await import('fflate');
    const files: Record<string, Uint8Array> = {};
    for (const [name, text] of Object.entries(parts)) files[name] = Uint8Array.from(strToU8(text));
    const bytes = zipSync(files);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  };

  const styles = `<styleSheet ${NS}><numFmts count="3"><numFmt numFmtId="165" formatCode="General"/><numFmt numFmtId="166" formatCode="&quot;día&quot; 0"/><numFmt numFmtId="167" formatCode="[$-409]yyyy\\-mm\\-dd;@"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="167"/><xf numFmtId="165"/><xf numFmtId="166"/></cellXfs></styleSheet>`;

  const sheet1 = `<worksheet ${NS}><sheetData>
    <row r="1"><c r="A1" t="b"><v>1</v></c><c r="B1" t="e"><v>#N/A</v></c><c r="C1" t="str"><v>resultado de fórmula</v></c><c r="D1" t="s"><v>0</v></c><c r="E1" t="inlineStr"><is><t>en línea</t></is></c><c r="F1" t="inlineStr"/></row>
    <row r="2"><c r="A2" s="1"><v>46100</v></c><c r="B2" s="1"><v>0.5</v></c><c r="C2" s="2"><v>46100</v></c><c r="D2" s="3"><v>46100</v></c><c r="E2"><v>abc</v></c><c r="F2" t="s"><v>99</v></c><c r="G2"><v></v></c><c r="H2"/><c r="I2" t="b"><v>0</v></c><c><v>5</v></c></row>
    <row><c r="A3"><v>1</v></c></row>
    <row r="30000"><c r="A30000"><v>1</v></c></row>
    <row r="4"><c r="ZZ4"><v>1</v></c><c r="B4"><v>7</v></c></row>
  </sheetData></worksheet>`;

  const base = {
    'xl/workbook.xml': `<workbook ${NS} ${R}><sheets><sheet name="Datos" sheetId="1" r:id="rId1"/><sheet name="Perdida" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/missing.xml"/></Relationships>`,
    'xl/sharedStrings.xml': `<sst ${NS}><si><r><t>a</t></r><r><t>b</t></r><rPh sb="0" eb="1"><t>ignorado</t></rPh></si></sst>`,
    'xl/worksheets/sheet1.xml': sheet1,
  };

  it('reads every kind of cell, absolute sheet paths and the date formats of the file', async () => {
    const [sheet] = readXlsx(await zip({ ...base, 'xl/styles.xml': styles }));
    expect(sheet.name).toBe('Datos');
    expect(sheet.rows[0]).toEqual([1, null, 'resultado de fórmula', 'ab', 'en línea', null]);
    // A date format of the file, a time (under one day), and formats that only look like dates.
    expect(sheet.rows[1]).toEqual(['2026-03-19', 0.5, 46100, 46100, 'abc', null, null, null, 0]);
    // Rows without a number, beyond the limit or in columns that do not exist are left out.
    expect(sheet.rows[2]).toEqual([]);
    expect(sheet.rows[3]).toEqual([null, 7]);
    expect(sheet.rows).toHaveLength(4);
  });

  it('copes with a workbook that leaves out names, ids, targets, formats and style tables', async () => {
    const [sheet] = readXlsx(
      await zip({
        'xl/workbook.xml': `<workbook ${NS} ${R}><sheets><sheet r:id="rId1"/><sheet name="Sin id"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship/><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
        'xl/styles.xml': `<styleSheet ${NS}><numFmts count="1"><numFmt numFmtId="170"/></numFmts></styleSheet>`,
        'xl/worksheets/sheet1.xml': `<worksheet ${NS}><sheetData><row r="1"><c r="A1" s="9"><v>46100</v></c></row></sheetData></worksheet>`,
      })
    );
    expect(sheet).toEqual({ name: '', rows: [[46100]] });
  });

  it('reads dates as numbers when the workbook has no styles', async () => {
    const [sheet] = readXlsx(await zip(base));
    expect(sheet.rows[1][0]).toBe(46100);
  });

  it('refuses a workbook with no sheets, or whose sheets have no file', async () => {
    const noSheets = await zip({ 'xl/workbook.xml': `<workbook ${NS}><sheets/></workbook>` });
    expect((catchError(() => readXlsx(noSheets)) as SpreadsheetError).code).toBe('unreadable');
    const lost = await zip({
      ...base,
      'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    });
    expect((catchError(() => readXlsx(lost)) as SpreadsheetError).code).toBe('unreadable');
  });
});
