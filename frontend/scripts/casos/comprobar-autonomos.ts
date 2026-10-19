/**
 * Runs the backend engine of the self-employed drafts (backend/src/domain/services/autonomo.ts, the one
 * behind Autónomos) on each persona of the case bank and compares its modelos 130 and 303 with the
 * hand-calculated boxes of esperado.json. Writes docs/casos-practicos/resultados-autonomos.json.
 * The frontend Jest suite cannot load the backend (other aliases and tsconfig), hence this script.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { prepareDraft, type DraftInputs } from '../../../backend/src/domain/services/autonomo';
import type { BusinessMovement } from '../../../backend/src/domain/services/tax';

const ROOT = (() => {
  let dir = __dirname;
  while (!existsSync(join(dir, 'docs', 'casos-practicos'))) dir = dirname(dir);
  return dir;
})();
const PEOPLE = join(ROOT, 'docs', 'casos-practicos', 'personas');

interface Figure {
  modelo: string;
  periodo?: string;
  casilla: string | null;
  concepto: string;
  importe: number | null;
  origen: string;
}

interface Row {
  caso: string;
  modelo: string;
  periodo: string;
  casilla: string;
  concepto: string;
  esperado: number;
  obtenido: number | null;
  estado: 'coincide' | 'discrepancia' | 'no-soportado';
}

const rows: Row[] = [];
for (const slug of readdirSync(PEOPLE).sort()) {
  const file = join(PEOPLE, slug, 'persona.json');
  if (!existsSync(file)) continue;
  const persona = JSON.parse(readFileSync(file, 'utf8'));
  if (!persona.autonomo) continue;
  const figures = (
    JSON.parse(readFileSync(join(PEOPLE, slug, 'esperado.json'), 'utf8')) as { cifras: Figure[] }
  ).cifras;
  const movements = persona.autonomo.movimientos as BusinessMovement[];
  const inputs = persona.autonomo.inputs as DraftInputs;
  for (const q of [1, 2, 3, 4] as const) {
    const draft = prepareDraft(2026, q, movements, inputs);
    const boxes: Record<string, Record<string, number>> = {
      '303': Object.fromEntries(
        [...draft.vat.accrued, ...draft.vat.deductible, ...draft.vat.settlement].map((b) => [
          b.box,
          b.amount,
        ])
      ),
      '130': Object.fromEntries(draft.irpf.boxes.map((b) => [b.box, b.amount])),
    };
    for (const f of figures) {
      if (!(f.modelo in boxes) || f.periodo !== `${q}T` || f.origen === 'pendiente') continue;
      const got = boxes[f.modelo][f.casilla as string];
      const expected = f.importe as number;
      rows.push({
        caso: slug,
        modelo: f.modelo,
        periodo: f.periodo,
        casilla: f.casilla as string,
        concepto: f.concepto,
        esperado: expected,
        obtenido: got ?? null,
        estado:
          got === undefined
            ? 'no-soportado'
            : Math.abs(got - expected) < 0.005
            ? 'coincide'
            : 'discrepancia',
      });
    }
    // Boxes the engine fills that the hand calculation leaves empty (e.g. 150 for 0 % sales).
    for (const [box, amount] of Object.entries(boxes['303'])) {
      const listed = figures.some(
        (f) => f.modelo === '303' && f.periodo === `${q}T` && f.casilla === box
      );
      if (!listed && amount !== 0 && !['02', '05', '08'].includes(box)) {
        rows.push({
          caso: slug,
          modelo: '303',
          periodo: `${q}T`,
          casilla: box,
          concepto: 'Casilla que el motor rellena y el cálculo a mano deja vacía',
          esperado: 0,
          obtenido: amount,
          estado: 'discrepancia',
        });
      }
    }
  }
}

const count = (s: Row['estado']) => rows.filter((r) => r.estado === s).length;
writeFileSync(
  join(ROOT, 'docs', 'casos-practicos', 'resultados-autonomos.json'),
  `${JSON.stringify(
    {
      motor: 'backend/src/domain/services/autonomo.ts (prepareDraft)',
      resumen: {
        coincide: count('coincide'),
        discrepancia: count('discrepancia'),
        noSoportado: count('no-soportado'),
      },
      filas: rows,
    },
    null,
    2
  )}\n`
);
console.log(
  `Autónomos (130 y 303 contra el motor del backend): ${count('coincide')} coinciden, ${count(
    'discrepancia'
  )} discrepancias, ${count('no-soportado')} casillas que el motor no calcula`
);
for (const r of rows.filter((x) => x.estado === 'discrepancia'))
  console.log(
    `  ${r.caso} ${r.modelo} ${r.periodo} casilla ${r.casilla}: esperado ${r.esperado}, motor ${r.obtenido}`
  );
