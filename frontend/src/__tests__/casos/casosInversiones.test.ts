/**
 * Case bank, investors (personas «p4-»): the made-up files of each platform in archivos/ are read
 * again from disk as the app reads them, and what «Llevar a mi Renta» gives must be what persona.json
 * keeps (whose Renta casosRenta.test.ts checks against the hand calculation of esperado.json), with
 * the warnings the case expects.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { readXlsx } from '@modules/finances/application/spreadsheet';
import { investCase, type CaseFile } from '@test-utils/investCase';

const PEOPLE = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'personas');

interface Persona {
  slug: string;
  archivos: string[];
  tiposDeCambioInventados: { USD: number } | null;
  avisos: string[];
  renta: { declaraciones: { form: { savingsDetail: { imported: unknown } } }[] };
}

const cases = readdirSync(PEOPLE)
  .filter((slug) => slug.startsWith('p4-') && existsSync(join(PEOPLE, slug, 'persona.json')))
  .map((slug) => JSON.parse(readFileSync(join(PEOPLE, slug, 'persona.json'), 'utf8')) as Persona);

/** A file of the persona as the app gets it: text, a workbook, or the lines of a PDF. */
function fileOf(slug: string, name: string): CaseFile {
  const path = join(PEOPLE, slug, 'archivos', name);
  if (name.endsWith('.pdf')) {
    const lines = readFileSync(`${path}.lineas.txt`, 'utf8').split('\n').filter(Boolean);
    return { name, lines };
  }
  if (name.endsWith('.xlsx')) {
    const bytes = readFileSync(path);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return { name, sheets: readXlsx(buffer as ArrayBuffer) };
  }
  return { name, text: readFileSync(path, 'utf8') };
}

it('has the ten investors of the fourth batch', () => {
  expect(cases.map((c) => c.slug.slice(0, 6))).toEqual([
    'p4-109',
    'p4-110',
    'p4-111',
    'p4-112',
    'p4-113',
    'p4-114',
    'p4-115',
    'p4-116',
    'p4-117',
    'p4-118',
  ]);
});

describe.each(cases)('$slug', (persona) => {
  it('reads its files into what the persona takes to the Renta, with its warnings', () => {
    const files = persona.archivos.map((name) => fileOf(persona.slug, name));
    const { imported, warnings } = investCase(files, persona.tiposDeCambioInventados?.USD);
    expect(imported).toEqual(persona.renta.declaraciones[0].form.savingsDetail.imported);
    expect(warnings).toEqual(expect.arrayContaining(persona.avisos));
  });
});
