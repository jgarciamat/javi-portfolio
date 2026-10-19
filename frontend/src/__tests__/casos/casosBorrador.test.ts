/**
 * Case bank: the synthetic Renta drafts (documentos/borrador-renta-2025.pdf, built by `npm run casos`
 * from persona.json) read by the app's draft reader. The lines are rebuilt here the way readPdf joins
 * the pieces of each printed line («label   amount   box»); the generator checks the PDF gives the
 * same lines. Every amount the reader takes must be the hand-calculated one of esperado.json.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { readDraft } from '@modules/tools/domain/rentaDraft';
import { CCAA_OPTIONS } from '@modules/tools/data/renta';

const PEOPLE = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos', 'personas');

interface Line {
  label: string;
  amount?: number;
  text?: string;
  box: string;
}
interface Persona {
  slug: string;
  comunidad: string;
  renta?: { declaraciones: { id: string; form: { age: string; children: unknown[] } }[] };
  documentos: { borrador?: { sections: { title: string; lines: Line[] }[] } | null };
}
interface Figure {
  declaracion?: string;
  casilla: string | null;
  importe: number | null;
  origen: string;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const money = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

const drafts = readdirSync(PEOPLE)
  .filter((slug) => existsSync(join(PEOPLE, slug, 'persona.json')))
  .sort()
  .map((slug) => ({
    persona: read<Persona>(join(PEOPLE, slug, 'persona.json')),
    figures: read<{ cifras: Figure[] }>(join(PEOPLE, slug, 'esperado.json')).cifras,
  }))
  .filter((c) => c.persona.documentos.borrador);

describe.each(drafts)('$persona.slug', ({ persona, figures }) => {
  const sections = (persona.documentos.borrador as NonNullable<Persona['documentos']['borrador']>)
    .sections;
  const lines = sections.flatMap((s) => [
    s.title,
    ...s.lines.map(
      (l) => `${l.label}   ${l.amount !== undefined ? money(l.amount) : l.text}   ${l.box}`
    ),
  ]);
  const reading = readDraft(lines.join(' '), { year: 2025, communities: CCAA_OPTIONS, lines });
  const expected = (box: string) =>
    figures.find((f) => f.casilla === box && (f.declaracion ?? 'individual') === 'individual')
      ?.importe;
  const form = (persona.renta as NonNullable<Persona['renta']>).declaraciones[0].form;

  it('lee la comunidad, la edad y los hijos', () => {
    expect(reading.exercise).toBe(2025);
    expect(reading.ccaaId).toBe(persona.comunidad);
    expect(reading.age).toBe(Number(form.age));
    expect(reading.childAges).toHaveLength(form.children.length);
  });

  it('toma del borrador los importes del cálculo a mano', () => {
    expect(reading.gross).toBe(expected('0012'));
    expect(reading.socialSecurity).toBe(expected('0013'));
    expect(reading.withheld).toBe(expected('0609'));
    if (expected('0460')) expect(reading.savings).toBe(expected('0460'));
    for (const box of ['0003', '0019', '0022', '0023', '0025', '0435', '0500', '0545', '0670'])
      expect(reading.boxes[box]).toBe(expected(box));
  });
});

it('hay borradores sintéticos para las personas con Renta', () => {
  expect(drafts.length).toBeGreaterThanOrEqual(20);
});
