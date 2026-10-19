/**
 * Case bank: every JSON is valid, every figure says where it comes from, and nothing looks like real
 * personal data (the repository is public). Tax ids must be the made-up ones (00000xxx + letter,
 * companies A/B0000…), and an IBAN can only be the all-zero placeholder.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
const PEOPLE = join(BANK, 'personas');
const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

const slugs = readdirSync(PEOPLE)
  .filter((s) => statSync(join(PEOPLE, s)).isDirectory())
  .sort();

/** All the text files of the bank (the PDFs and workbooks are built from these). */
function textFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return textFiles(path);
    return /\.(json|md|txt)$/.test(name) ? [path] : [];
  });
}

interface Figure {
  origen: string;
  importe: number | null;
  valor?: string;
  ref?: string;
  motivo?: string;
  modelo: string;
}

describe('banco de casos prácticos', () => {
  it('tiene al menos 24 personas, cada una con sus tres archivos', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(24);
    for (const slug of slugs)
      for (const file of ['persona.json', 'esperado.json', 'calculo.md'])
        expect(existsSync(join(PEOPLE, slug, file))).toBe(true);
  });

  it('todos los JSON son válidos', () => {
    for (const file of textFiles(BANK).filter((f) => f.endsWith('.json')))
      expect(() => JSON.parse(readFileSync(file, 'utf8'))).not.toThrow();
  });

  it('cada cifra tiene su origen: oficial, cálculo a mano o pendiente con motivo', () => {
    const official = new Set(
      (
        JSON.parse(readFileSync(join(BANK, 'oficiales.json'), 'utf8')) as {
          casos: { id: string }[];
        }
      ).casos.map((c) => c.id)
    );
    for (const slug of slugs) {
      const figures = (
        JSON.parse(readFileSync(join(PEOPLE, slug, 'esperado.json'), 'utf8')) as {
          cifras: Figure[];
        }
      ).cifras;
      expect(figures.length).toBeGreaterThan(0);
      for (const f of figures) {
        expect(['oficial', 'calculo-a-mano', 'pendiente']).toContain(f.origen);
        if (f.origen === 'pendiente') expect(f.motivo).toEqual(expect.any(String));
        else {
          expect(typeof f.importe === 'number' || typeof f.valor === 'string').toBe(true);
          expect(f.ref).toEqual(expect.any(String));
        }
        if (f.origen === 'oficial') expect(official.has(f.ref as string)).toBe(true);
        if (f.origen === 'calculo-a-mano') expect(f.ref).toMatch(/^calculo\.md#/);
      }
    }
  });

  it('las personas son ficticias: nombre, NIF y dirección inventados', () => {
    for (const slug of slugs) {
      const p = JSON.parse(readFileSync(join(PEOPLE, slug, 'persona.json'), 'utf8'));
      expect(p.datosFicticios).toBe(true);
      expect(p.nombre).toMatch(/^Persona Ficticia \d{2}$/);
      expect(p.domicilio).toMatch(/^Calle Ficticia \d+, .*\(dirección inventada\)$/);
      const n = Number(p.nif.slice(0, 8));
      expect(p.nif).toMatch(/^000\d{5}[A-Z]$/);
      expect(p.nif[8]).toBe(LETTERS[n % 23]);
    }
  });

  it('ningún documento contiene NIF, CIF o IBAN que puedan ser reales', () => {
    for (const file of textFiles(BANK)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\b\d{8}[A-Z]\b/g)) expect(m[0]).toMatch(/^000/);
      for (const m of text.matchAll(/\b[ABCDEFGHJNPQRSUVW]\d{8}\b/g))
        expect(m[0]).toMatch(/^[A-Z]0000/);
      for (const m of text.matchAll(/\bES\d{2}(?:\s?\d{4}){5}\b/g))
        expect(m[0].replace(/\s/g, '')).toBe(`ES${'0'.repeat(22)}`);
      // A cadastral reference (20 characters) only comes from real documents.
      expect(text).not.toMatch(/\b\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2}\b/);
    }
  });

  it('el catálogo oficial cubre la Renta y todos los modelos de autónomos', () => {
    const { casos } = JSON.parse(readFileSync(join(BANK, 'oficiales.json'), 'utf8')) as {
      casos: { modelo: string; fuente: { url: string; oficial: boolean } }[];
    };
    expect(casos.length).toBeGreaterThanOrEqual(40);
    const models = new Set(casos.map((c) => c.modelo));
    for (const m of ['100', '130', '303', '111', '115', '190', '390', '347', '349', '720', 'RETA'])
      expect(models.has(m)).toBe(true);
    for (const c of casos) {
      expect(c.fuente.url).toMatch(/^https:\/\//);
      expect(typeof c.fuente.oficial).toBe('boolean');
    }
  });
});
