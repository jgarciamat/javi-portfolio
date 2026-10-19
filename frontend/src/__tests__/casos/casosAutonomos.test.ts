/**
 * Case bank, self-employed personas (2026): the RETA bracket and fee (frontend calculator), the
 * modelos 111 and 115 (frontend withholdings) and the income of the 303 read from the invoice book in
 * Excel (importer), against the hand calculation of esperado.json. The modelos 130 and 303 are worked
 * out by the backend engine: `npm run casos` compares them and writes resultados-autonomos.json, whose
 * discrepancies must all be known (discrepancias.json).
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  incomeByQuarter,
  parseInvoiceBook,
  type BookCell,
} from '@modules/finances/domain/invoiceBook';
import { withholdingsFor } from '@modules/finances/domain/withholdings';
import { retaQuote, type RetaInput } from '@modules/tools/domain/retaCalc';

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
const PEOPLE = join(BANK, 'personas');

interface Figure {
  modelo: string;
  periodo?: string;
  casilla: string | null;
  concepto: string;
  importe: number | null;
  valor?: string;
  origen: 'oficial' | 'calculo-a-mano' | 'pendiente';
  motivo?: string;
  campo: string | null;
  retaInput?: RetaInput;
}
interface Payee {
  people: number;
  paid: number;
  withheld: number;
}
interface Issued {
  date: string;
  number: string;
  client: string;
  nif: string;
  base: number;
  rate: number;
  withheldRate: number;
}
interface Persona {
  slug: string;
  autonomo?: {
    retenciones: { staff: Payee; pros: Payee; rent: Payee; income: number }[];
  };
  documentos: { emitidas?: Issued[] };
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const cases = readdirSync(PEOPLE)
  .filter((slug) => existsSync(join(PEOPLE, slug, 'persona.json')))
  .sort()
  .map((slug) => ({
    persona: read<Persona>(join(PEOPLE, slug, 'persona.json')),
    figures: read<{ cifras: Figure[] }>(join(PEOPLE, slug, 'esperado.json')).cifras,
  }))
  .filter((c) => c.persona.autonomo);

const quarterOf = (f: Figure) => Number((f.periodo as string).slice(0, 1)) as 1 | 2 | 3 | 4;

/** The issued book as the person would keep it in Excel (the headings of Finanverso's template). */
function issuedRows(list: Issued[]): BookCell[][] {
  return [
    [
      'Fecha expedición',
      'Nº factura',
      'Cliente',
      'NIF cliente',
      'Base imponible',
      'Tipo de IVA (%)',
      'Cuota IVA repercutida',
      'Tipo retención IRPF (%)',
      'Importe retenido IRPF',
    ],
    ...list.map((i) => [
      `${i.date.slice(8, 10)}/${i.date.slice(5, 7)}/${i.date.slice(0, 4)}`,
      i.number,
      i.client,
      i.nif,
      i.base,
      i.rate,
      Math.round(i.base * i.rate) / 100,
      i.withheldRate,
      Math.round(i.base * i.withheldRate) / 100,
    ]),
  ];
}

function engineValue(f: Figure, persona: Persona): number | string | null {
  const [model, key] = (f.campo as string).split('.');
  if (model === 'reta') {
    const quote = retaQuote(f.retaInput as RetaInput);
    return key === 'bracket' ? quote.bracket.id : key === 'flatFee' ? quote.flatFee : quote.feeMin;
  }
  const q = quarterOf(f);
  if (model === 'm111' || model === 'm115') {
    const w = (persona.autonomo as NonNullable<Persona['autonomo']>).retenciones[q - 1];
    const staff = { ...w.staff, kindPeople: 0, kindPaid: 0, kindWithheld: 0 };
    const result = withholdingsFor({
      year: 2026,
      quarter: q,
      invoices: [],
      data: { staff, pros: w.pros, rent: w.rent, filed111: false, filed115: false },
      income: w.income,
    });
    const boxes = model === 'm111' ? result.m111.boxes : result.m115.boxes;
    return boxes.find((b) => b.box === key)?.amount ?? null;
  }
  // The 303 base at 21 %: what the importer reads from the issued book.
  const parsed = parseInvoiceBook(issuedRows(persona.documentos.emitidas ?? []), 'issued', 2026);
  if (!parsed.ok) return null;
  return incomeByQuarter(parsed.result.entries)[q]?.r21 ?? null;
}

/** What the frontend can check by itself; the rest of the 130 and 303 is the backend's. */
const FRONTEND = /^(reta\.|m111\.|m115\.|m303\.07$)/;

describe.each(cases)('$persona.slug', ({ persona, figures }) => {
  for (const f of figures) {
    const name = `${f.modelo} ${f.periodo ?? ''} · ${f.casilla ?? '—'} ${f.concepto}`;
    if (f.origen === 'pendiente' || f.campo === null || !FRONTEND.test(f.campo)) {
      const why =
        f.motivo ??
        (f.campo?.startsWith('m130') || f.campo?.startsWith('m303')
          ? 'Lo calcula el motor del backend: lo compara `npm run casos` (resultados-autonomos.json).'
          : 'Resumen anual que Finanverso todavía no prepara.');
      it.todo(`${name} — PENDIENTE: ${why}`);
      continue;
    }
    it(name, () => {
      const got = engineValue(f, persona);
      if (f.importe === null) expect(got).toBe(f.valor);
      else expect(got as number).toBeCloseTo(f.importe, 2);
    });
  }
});

describe('motor del backend (resultados de npm run casos)', () => {
  const results = read<{
    filas: { caso: string; modelo: string; periodo: string; casilla: string; estado: string }[];
  }>(join(BANK, 'resultados-autonomos.json')).filas;
  const known = read<{
    autonomos: { caso: string; modelo: string; periodo: string; casilla: string }[];
  }>(join(BANK, 'discrepancias.json')).autonomos;

  it('compara las casillas de los 130 y 303 de todas las personas autónomas', () => {
    expect(new Set(results.map((r) => r.caso)).size).toBe(cases.length);
    expect(results.filter((r) => r.estado === 'coincide').length).toBeGreaterThan(200);
  });

  it('solo tiene discrepancias conocidas y documentadas', () => {
    const unknown = results.filter(
      (r) =>
        r.estado === 'discrepancia' &&
        !known.some(
          (k) =>
            k.caso === r.caso &&
            k.modelo === r.modelo &&
            k.periodo === r.periodo &&
            k.casilla === r.casilla
        )
    );
    expect(unknown).toEqual([]);
  });
});
