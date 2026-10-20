import {
  MAP_YEARS,
  decodeText,
  loadXmlMap,
  mapYearFor,
  readDraftFile,
} from '@modules/tools/application/readDraftFile';
import { readPdf } from '@modules/tools/application/readPdf';
import { draftXml, latin1 } from '@test-utils/draftXml';

jest.mock('@modules/tools/application/readPdf', () => ({ readPdf: jest.fn() }));
const pdf = readPdf as jest.Mock;

const file = (bytes: Uint8Array | string, name: string, type = '') =>
  new File([bytes as BlobPart], name, { type });

describe('reading the file of a draft', () => {
  it('decodes the text in the encoding its XML declaration names', () => {
    const xml = draftXml().replace('PRUEBA FICTICIA, ANA', 'MUÑOZ ÁLVAREZ');
    expect(decodeText(latin1(xml))).toContain('MUÑOZ ÁLVAREZ');
    const utf8 = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><a>Ñ</a>');
    expect(decodeText(utf8)).toContain('Ñ');
    // An encoding the browser does not know is read as Latin-1.
    expect(decodeText(latin1('<?xml version="1.0" encoding="x-desconocida"?><a>Ñ</a>'))).toContain(
      'Ñ'
    );
  });

  it('tells a PDF, the Agency file and plain text apart by their content', async () => {
    pdf.mockResolvedValue({ text: 't', lines: ['t'] });
    expect(await readDraftFile(file('%PDF-1.7 ...', 'cualquiera.bin'))).toEqual({
      kind: 'pdf',
      pdf: { text: 't', lines: ['t'] },
    });
    expect((await readDraftFile(file('x', 'b.pdf'))).kind).toBe('pdf');
    expect((await readDraftFile(file('x', 'b', 'application/pdf'))).kind).toBe('pdf');
    const xml = await readDraftFile(file(latin1(draftXml({ exercise: 2024 })), 'borrador.txt'));
    expect(xml).toMatchObject({ kind: 'xml', exercise: 2024 });
    expect(await readDraftFile(file('Retribuciones 1.000,00 0003', 'notas.txt'))).toEqual({
      kind: 'text',
      text: 'Retribuciones 1.000,00 0003',
    });
  });

  it('reads the bytes with a FileReader where the file has no arrayBuffer', async () => {
    const f = file('hola', 'a.txt');
    Object.defineProperty(f, 'arrayBuffer', { value: undefined });
    expect(await readDraftFile(f)).toEqual({ kind: 'text', text: 'hola' });
    const modern = file('x', 'a.txt');
    Object.defineProperty(modern, 'arrayBuffer', {
      value: () => Promise.resolve(latin1('adios').buffer),
    });
    expect(await readDraftFile(modern)).toEqual({ kind: 'text', text: 'adios' });
    const broken = file('x', 'a.txt');
    Object.defineProperty(broken, 'arrayBuffer', { value: undefined });
    const spy = jest.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (
      this: FileReader
    ) {
      this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
    });
    await expect(readDraftFile(broken)).rejects.toBeNull();
    spy.mockRestore();
  });

  it('reads each exercise with its map, or the nearest one published', async () => {
    expect(MAP_YEARS).toEqual([2023, 2024, 2025]);
    expect(mapYearFor(2025)).toBe(2025);
    expect(mapYearFor(2026)).toBe(2025);
    expect(mapYearFor(2024)).toBe(2024);
    expect(mapYearFor(2019)).toBe(2023);
    expect(mapYearFor(null)).toBe(2025);
    for (const year of MAP_YEARS) {
      const map = await loadXmlMap(year);
      expect(map.exercise).toBe(year);
      // Pay (box 0003) and the result (box 0670) are in every exercise.
      expect(map.boxes['DatosEconomicos/TomaDatosAmpliada/RdtoTrabajo/TPDIN'][0]).toBe('0003');
      expect(map.boxes['DatosEconomicos/Resultados/CalculoImpuestoRes/RESULTADO'][0]).toBe('0670');
    }
  });
});
