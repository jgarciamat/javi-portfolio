/**
 * Modelo 349 in the «formato BOE» of its design (DR_Anexo_349.pdf, Orden EHA/769/2010 as amended,
 * checked 19-10-2026): records of 500 characters, one of type 1 (declarant and summary) and one of
 * type 2 per operator and key, then one per correction. Every amount is positive; numbers are filled
 * with zeros and texts with blanks.
 * The design does not say how records are separated: they go one per line, ended by CR LF, as the
 * informative returns usually are (NO CONFIRMADO: to be checked by importing one in the sede).
 */
import type { Draft349, Key349 } from '@modules/finances/domain/types';
import { Line, readNumber, readText, toCents } from './fixedWidth';
import { normalNif, splitVatId } from './ids';

export const RECORD_LENGTH = 500;
export const RECORD_END = '\r\n';

export interface Head349 {
  year: number;
  /** «1T»…«4T». */
  period: string;
  nif: string;
  /** «APELLIDO1 APELLIDO2 NOMBRE» or the name of the entity. */
  name: string;
  phone: string;
  contact: string;
  /** 13 digits starting with 349 [DR349, positions 108-120]. */
  id: string;
}

/** The number of the declaration: 349 + year + period («3T» → 03) + 0001, 13 digits. */
export const declarationId = (year: number, quarter: number): string =>
  `349${year}${String(quarter).padStart(2, '0')}0001`;

function type1(head: Head349, draft: Draft349): string {
  const amount = draft.operators.reduce((s, o) => s + toCents(o.base), 0);
  const rect = draft.rectifications.reduce((s, o) => s + toCents(o.base), 0);
  return (
    new Line(RECORD_LENGTH)
      .put(1, '1349')
      .number(5, 4, head.year)
      .put(9, normalNif(head.nif).padStart(9, '0'))
      .text(18, 40, head.name)
      .number(59, 9, Number(head.phone.replace(/\D/g, '') || 0))
      .text(68, 40, head.contact)
      .put(108, head.id)
      // 121-122: neither complementary nor substitute; 123-135: no earlier declaration.
      .number(123, 13, 0)
      .put(136, head.period)
      .number(138, 9, draft.operators.length)
      .number(147, 15, amount)
      .number(162, 9, draft.rectifications.length)
      .number(171, 15, rect)
      // 186: «X» only for a monthly return of the first two months of a quarter.
      .toString()
  );
}

const common = (head: Head349): Line =>
  new Line(RECORD_LENGTH)
    .put(1, '2349')
    .number(5, 4, head.year)
    .put(9, normalNif(head.nif).padStart(9, '0'));

function vatParts(vatId: string): { country: string; number: string } {
  const split = splitVatId(vatId);
  return split ?? { country: vatId.slice(0, 2).toUpperCase(), number: vatId.slice(2) };
}

function operator(head: Head349, o: Draft349['operators'][number]): string {
  const id = vatParts(o.vatId);
  return common(head)
    .text(76, 2, id.country)
    .text(78, 15, id.number)
    .text(93, 40, o.name)
    .put(133, o.key)
    .number(134, 13, toCents(o.base))
    .toString();
}

function correction(head: Head349, r: Draft349['rectifications'][number]): string {
  const id = vatParts(r.vatId);
  return common(head)
    .text(76, 2, id.country)
    .text(78, 15, id.number)
    .text(93, 40, r.name)
    .put(133, r.key)
    .number(147, 4, r.year)
    .put(151, `${r.quarter}T`)
    .number(153, 13, toCents(r.base))
    .number(166, 13, toCents(r.previous))
    .toString();
}

/** The file of a 349: its records, each ended by CR LF. Throws a FieldError when a value does not fit. */
export function write349(head: Head349, draft: Draft349): string {
  const records = [
    type1(head, draft),
    ...draft.operators.map((o) => operator(head, o)),
    ...draft.rectifications.map((r) => correction(head, r)),
  ];
  return records.map((r) => r + RECORD_END).join('');
}

export interface Read349 {
  year: number;
  period: string;
  nif: string;
  name: string;
  operatorCount: number;
  amount: number;
  correctionCount: number;
  correctionAmount: number;
  operators: { key: Key349; vatId: string; name: string; base: number }[];
  rectifications: {
    key: Key349;
    vatId: string;
    name: string;
    base: number;
    year: number;
    quarter: number;
    previous: number;
  }[];
}

function int(line: string, pos: number, len: number): number {
  const n = readNumber(line, pos, len);
  if (n === null) throw new Error(`number at ${pos}`);
  return n;
}
const euros = (line: string, pos: number, len: number): number => int(line, pos, len) / 100;

/** Reads a 349 written with its design: one record per line, the type in the first position. */
export function read349(text: string): Read349 {
  const records = text.split(RECORD_END).filter((r) => r !== '');
  if (records.some((r) => r.length !== RECORD_LENGTH)) throw new Error('length');
  const [head, ...rest] = records;
  if (!head.startsWith('1349')) throw new Error('type 1');
  const out: Read349 = {
    year: int(head, 5, 4),
    period: readText(head, 136, 2),
    nif: readText(head, 9, 9),
    name: readText(head, 18, 40),
    operatorCount: int(head, 138, 9),
    amount: euros(head, 147, 15),
    correctionCount: int(head, 162, 9),
    correctionAmount: euros(head, 171, 15),
    operators: [],
    rectifications: [],
  };
  for (const r of rest) {
    if (!r.startsWith('2349')) throw new Error('type 2');
    const base = {
      key: r[132] as Key349,
      vatId: readText(r, 76, 2) + readText(r, 78, 15),
      name: readText(r, 93, 40),
    };
    // A correction has its period in 147-152 and nothing in 134-146.
    if (readText(r, 147, 4) !== '')
      out.rectifications.push({
        ...base,
        year: int(r, 147, 4),
        quarter: Number(readText(r, 151, 1)),
        base: euros(r, 153, 13),
        previous: euros(r, 166, 13),
      });
    else out.operators.push({ ...base, base: euros(r, 134, 13) });
  }
  return out;
}
