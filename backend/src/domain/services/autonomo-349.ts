/**
 * Modelo 349 (recapitulative statement of intra-EU operations) of a quarter: one record per operator
 * and key, the corrections of earlier periods apart, and its coherence with the 303. Sources: [DR349]
 * and [I349] in autonomo-vat-data.ts; checked with the worked case of the Manual práctico de IVA 2025,
 * chapter 9 (cases 349-01 and 349-02 of docs/casos-practicos/oficiales.json).
 */
import {
  EU_PREFIXES,
  type IntraOp,
  type Key349,
  KEYS_10,
  KEYS_59,
  M349_QUARTERLY_LIMIT,
  SUPPLY_KEYS,
} from './autonomo-vat-data';
import type { Box } from './autonomo-vat';

export interface Operator349 {
  key: Key349;
  vatId: string;
  name: string;
  base: number;
}

export interface Rectification349 extends Operator349 {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  previous: number;
}

export type Warning349 =
  | { code: 'noVatId'; name: string }
  | { code: 'badPrefix'; vatId: string }
  | { code: 'vs59'; expected: number; got: number }
  | { code: 'vs10'; expected: number; got: number }
  | { code: 'monthly'; amount: number };

export interface Draft349 {
  /** There is something to declare this quarter. */
  required: boolean;
  /** Over 50,000 € of supplies in the quarter: it is filed every month instead [I349]. */
  monthly: boolean;
  operators: Operator349[];
  rectifications: Rectification349[];
  /** The summary of record type 1: operators and amounts, corrections apart. */
  boxes: Box[];
  warnings: Warning349[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
/** A VAT number as the 349 takes it: capitals, no spaces, dots or dashes. */
export const normalVatId = (id: string): string => id.replace(/[\s.\-/]/g, '').toUpperCase();

/**
 * The 349 of a quarter from its intra-EU operations. `box59` and `box10` are those of the 303 of the
 * same quarter: the supplies (E, M, H, S) must add up to box 59 and the acquisitions (A, I) to box 10.
 */
export function draft349(ops: IntraOp[], box59: number, box10: number): Draft349 {
  const operators = new Map<string, Operator349>();
  const rectifications = new Map<string, Rectification349>();
  const warnings: Warning349[] = [];
  const noId = new Set<string>();
  const badPrefix = new Set<string>();
  for (const op of ops) {
    const vatId = normalVatId(op.vatId ?? '');
    if (vatId === '') noId.add(op.name.trim() || '—');
    else if (!EU_PREFIXES.includes(vatId.slice(0, 2))) badPrefix.add(vatId);
    if (op.rectifies) {
      const r = op.rectifies;
      const id = [vatId, op.key, r.year, r.quarter].join('|');
      const prev = rectifications.get(id);
      // Several corrections of the same period add up to one record with the new total [DR349].
      rectifications.set(id, {
        key: op.key,
        vatId,
        name: prev?.name || op.name.trim(),
        base: round2((prev?.base ?? 0) + op.base),
        year: r.year,
        quarter: r.quarter,
        previous: round2((prev?.previous ?? 0) + r.previous),
      });
      continue;
    }
    const id = `${vatId}|${op.key}`;
    const prev = operators.get(id);
    // Operations with the same operator and key are added up in one record per period [DR349].
    operators.set(id, {
      key: op.key,
      vatId,
      name: prev?.name || op.name.trim(),
      base: round2((prev?.base ?? 0) + op.base),
    });
  }
  const list = [...operators.values()];
  const rects = [...rectifications.values()];
  const totalOf = (keys: Key349[]): number =>
    round2(list.filter((o) => keys.includes(o.key)).reduce((s, o) => s + o.base, 0));
  const supplies = totalOf(SUPPLY_KEYS);
  const monthly = supplies > M349_QUARTERLY_LIMIT;
  for (const name of noId) warnings.push({ code: 'noVatId', name });
  for (const vatId of badPrefix) warnings.push({ code: 'badPrefix', vatId });
  const s59 = totalOf(KEYS_59);
  if (Math.abs(s59 - box59) >= 0.01) warnings.push({ code: 'vs59', expected: box59, got: s59 });
  const s10 = totalOf(KEYS_10);
  if (Math.abs(s10 - box10) >= 0.01) warnings.push({ code: 'vs10', expected: box10, got: s10 });
  if (monthly) warnings.push({ code: 'monthly', amount: supplies });
  const amount = round2(list.reduce((s, o) => s + o.base, 0));
  const rectAmount = round2(rects.reduce((s, o) => s + o.base, 0));
  return {
    required: list.length + rects.length > 0,
    monthly,
    operators: list,
    rectifications: rects,
    boxes: [
      {
        box: 'operadores',
        label: 'Número total de operadores intracomunitarios',
        amount: list.length,
      },
      { box: 'importe', label: 'Importe de las operaciones intracomunitarias', amount },
      {
        box: 'operadoresRect',
        label: 'Número total de operadores intracomunitarios con rectificaciones',
        amount: rects.length,
      },
      { box: 'importeRect', label: 'Importe de las rectificaciones', amount: rectAmount },
    ],
    warnings,
  };
}
