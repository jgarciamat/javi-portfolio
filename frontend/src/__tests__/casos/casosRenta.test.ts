/**
 * Case bank (docs/casos-practicos): the Renta of each made-up persona, run through the app's current
 * engine and compared box by box with the hand calculation of esperado.json. A figure the engine does
 * not give is listed as a todo; a known discrepancy (docs/casos-practicos/discrepancias.json) passes
 * while the engine still gives the recorded value or the right one; any other difference fails.
 * CASOS_INFORME=1 writes docs/casos-practicos/resultados-renta.json for the report.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { computeRenta, type RentaInput, type RentaResult } from '@modules/tools/domain/rentaCalc';
import { COMPARED_BOXES, ourBoxes, type ComparedBox } from '@modules/tools/domain/rentaCompare';
import {
  emptyForm,
  emptyPartner,
  partnerOf,
  toInput,
  type RentaForm,
} from '@modules/tools/domain/rentaForm';
import { compareJoint, jointInputOf, type JointKind } from '@modules/tools/domain/rentaJoint';
import { workReductionOf } from '@modules/tools/domain/rentaWork';
import { loadCcaa } from '@modules/tools/data/renta';
import { rentaJoint } from '@modules/tools/data/renta/conjunta';
import { rentaWorkExtras } from '@modules/tools/data/renta/estado-extra';
import { rentaProperty } from '@modules/tools/data/renta/inmuebles';
import { rentaState } from '@modules/tools/data/renta/state';

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
const PEOPLE = join(BANK, 'personas');

interface Figure {
  modelo: string;
  declaracion?: string;
  casilla: string | null;
  concepto: string;
  importe: number | null;
  origen: 'oficial' | 'calculo-a-mano' | 'pendiente';
  motivo?: string;
  campo: string | null;
}
interface Persona {
  slug: string;
  renta?: {
    declaraciones: { id: string; form: Partial<RentaForm> }[];
    conjunta: { kind: JointKind; livesWithOtherParent: boolean } | null;
  };
}
interface Known {
  caso: string;
  declaracion: string;
  campo: string;
  esperado: number;
  obtenido: number;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;
const known = read<{ renta: Known[] }>(join(BANK, 'discrepancias.json')).renta;
const cases = readdirSync(PEOPLE)
  .filter((slug) => existsSync(join(PEOPLE, slug, 'persona.json')))
  .sort()
  .map((slug) => ({
    persona: read<Persona>(join(PEOPLE, slug, 'persona.json')),
    figures: read<{ cifras: Figure[] }>(join(PEOPLE, slug, 'esperado.json')).cifras.filter(
      (f) => f.modelo === '100'
    ),
  }))
  .filter((c) => c.persona.renta);

const formOf = (partial: Partial<RentaForm>): RentaForm => ({
  ...emptyForm(''),
  ...partial,
  partner: { ...emptyPartner(), ...(partial.partner ?? {}) },
});

interface Computed {
  result: RentaResult;
  input: RentaInput;
  /** The spouse's pay in a joint return: the planner's boxes 0003 and 0013 are the person's only. */
  partner: { gross: number; socialSecurity: number };
}
const computed = new Map<string, Computed>();

beforeAll(async () => {
  for (const { persona } of cases) {
    const renta = persona.renta as NonNullable<Persona['renta']>;
    for (const decl of renta.declaraciones) {
      const form = formOf(decl.form);
      const data = {
        state: rentaState,
        ccaa: await loadCcaa(form.ccaaId),
        extras: rentaWorkExtras,
        property: rentaProperty,
        workReduction: workReductionOf(rentaState),
      };
      const input = toInput(form, data);
      computed.set(`${persona.slug}|${decl.id}`, {
        result: computeRenta(input),
        input,
        partner: { gross: 0, socialSecurity: 0 },
      });
      if (decl.id === 'individual' && renta.conjunta) {
        const spouse = renta.conjunta.kind === 'couple' ? partnerOf(form) : null;
        const joint = compareJoint(input, renta.conjunta.kind, spouse, {
          livesWithOtherParent: renta.conjunta.livesWithOtherParent,
          rules: rentaJoint,
        });
        const result = (joint as NonNullable<typeof joint>).joint;
        computed.set(`${persona.slug}|conjunta`, {
          result,
          // The boxes of the joint return are of the unit (the spouse's minimum, the whole children).
          input: jointInputOf(input, spouse, result.jointReduction),
          partner: {
            gross: spouse?.gross ?? 0,
            socialSecurity: spouse?.socialSecurity ?? 0,
          },
        });
      }
    }
  }
});

/** A figure of the savings in detail (rentaGains.ts): a box, the exempt gains or what is carried. */
function savingsValue(result: RentaResult, key: string): number {
  const detail = result.savingsDetail;
  if (!detail) return Number.NaN;
  const sum = (list: { amount: number }[]) => list.reduce((s, p) => s + p.amount, 0);
  if (key === 'carry.gains') return sum(detail.carryForward.gains);
  if (key === 'carry.capital') return sum(detail.carryForward.capital);
  if (key === 'exempt') return detail.properties.reduce((s, p) => s + p.exempt, 0);
  return detail.boxes[key as keyof typeof detail.boxes];
}

/** What the engine gives for a figure: a box of the planner or a field of the result. */
function engineValue(campo: string, c: Computed): number {
  const [kind, key] = campo.split('.');
  if (kind === 'result') return c.result[key as keyof RentaResult] as number;
  if (kind === 'savings') return savingsValue(c.result, campo.slice('savings.'.length));
  const boxes = ourBoxes(c.result, c.input);
  const extra = key === '0003' ? c.partner.gross : key === '0013' ? c.partner.socialSecurity : 0;
  expect(COMPARED_BOXES).toContain(key);
  return Math.round((boxes[key as ComparedBox] + extra) * 100) / 100;
}

interface Row {
  caso: string;
  declaracion: string;
  casilla: string | null;
  campo: string | null;
  concepto: string;
  esperado: number | null;
  obtenido: number | null;
  estado: 'coincide' | 'discrepancia-conocida' | 'corregida' | 'pendiente';
  motivo?: string;
}
const rows: Row[] = [];

afterAll(() => {
  if (process.env.CASOS_INFORME)
    writeFileSync(
      join(BANK, 'resultados-renta.json'),
      `${JSON.stringify({ motor: 'frontend/src/modules/tools/domain', filas: rows }, null, 2)}\n`
    );
});

const cent = (a: number, b: number) => Math.abs(a - b) < 0.005;

describe.each(cases)('$persona.slug', ({ persona, figures }) => {
  for (const f of figures) {
    const decl = f.declaracion ?? 'individual';
    const name = `${decl} · ${f.casilla ?? '—'} ${f.concepto}`;
    if (f.origen === 'pendiente' || f.campo === null || f.importe === null) {
      const motivo =
        f.motivo ?? 'El motor no devuelve esta casilla (se comprueba solo en el cálculo a mano).';
      rows.push({
        caso: persona.slug,
        declaracion: decl,
        casilla: f.casilla,
        campo: f.campo,
        concepto: f.concepto,
        esperado: f.importe,
        obtenido: null,
        estado: 'pendiente',
        motivo,
      });
      it.todo(`${name} — PENDIENTE: ${motivo}`);
      continue;
    }
    const campo = f.campo;
    const expected = f.importe;
    it(name, () => {
      const got = engineValue(campo, computed.get(`${persona.slug}|${decl}`) as Computed);
      const k = known.find(
        (d) => d.caso === persona.slug && d.declaracion === decl && d.campo === campo
      );
      const row = {
        caso: persona.slug,
        declaracion: decl,
        casilla: f.casilla,
        campo,
        concepto: f.concepto,
        esperado: expected,
        obtenido: got,
      };
      if (k && cent(k.esperado, expected) && !cent(got, expected)) {
        rows.push({ ...row, estado: 'discrepancia-conocida' });
        // A known discrepancy: the engine must still give what was recorded (or be fixed).
        expect(got).toBeCloseTo(k.obtenido, 2);
        return;
      }
      rows.push({ ...row, estado: k ? 'corregida' : 'coincide' });
      expect(got).toBeCloseTo(expected, 2);
    });
  }
});
