/**
 * The informative returns 190, 180 and 347 in the «formato BOE» of their record designs: records
 * of 500 characters, one of type 1 (declarant and summary) and one of type 2 per payee or person.
 * Sources (checked 19-10-2026):
 * - [DR190] DISENOS_LOGICOS_190_2025.pdf (Orden EHA/3127/2009 as amended up to Orden HAC/1431/2025);
 * - [DR180] DR_Mod_180_2023.pdf;
 * - [DR347] 347.pdf («Ejercicio 2025 y siguientes»).
 * Common rules of the three: ISO-8859-1, capitals without accents, numbers right aligned with
 * zeros, texts left aligned with blanks, every amount positive with its sign apart («N»).
 * The designs do not say how records are separated: one per line, ended by CR LF (NO CONFIRMADO).
 */
import type { PayeeRecord, Record347 } from '@modules/finances/domain/annualSummaries';
import { Line, readNumber, readText, toCents } from './fixedWidth';
import { normalNif } from './ids';
import { RECORD_END, RECORD_LENGTH } from './m349';

export interface InformativeHead {
  model: '190' | '180' | '347';
  year: number;
  nif: string;
  /** «APELLIDO1 APELLIDO2 NOMBRE» or the name of the entity. */
  name: string;
  phone: string;
  contact: string;
  /** 190: e-mail of the contact person (positions 176-225). */
  email: string;
}

/** Address of the premises of a 180 record [DR180, positions 114-327]. */
export interface Premises {
  /** 1 common territory, 2 Basque Country, 3 Navarre (with cadastral reference), 4 without one. */
  situation: '1' | '2' | '3' | '4';
  cadastre: string;
  /** INE code of the kind of street («CL», «AV»…). */
  streetType: string;
  street: string;
  number: string;
  floor: string;
  door: string;
  town: string;
  /** Name and INE code (5 digits) of the municipality. */
  municipality: string;
  municipalityCode: string;
  province: string;
  postcode: string;
}

/** The number of the declaration: the model, the year and 000001 [sede: «número de justificante»]. */
export const informativeId = (model: string, year: number): string => `${model}${year}000001`;

/** A signed amount: «N» or blank, then the cents in `len - 1` digits. */
function signed(line: Line, pos: number, len: number, euros: number): Line {
  const cents = toCents(euros);
  return line.put(pos, cents < 0 ? 'N' : ' ').number(pos + 1, len - 1, Math.abs(cents));
}

const nif9 = (nif: string): string => normalNif(nif).padStart(9, '0');

/** Positions 1-135 of the type 1 record, the same in the three designs. */
function head(h: InformativeHead): Line {
  return (
    new Line(RECORD_LENGTH)
      .put(1, `1${h.model}`)
      .number(5, 4, h.year)
      .put(9, nif9(h.nif))
      .text(18, 40, h.name)
      // 58: «T», transmisión telemática.
      .put(58, 'T')
      .number(59, 9, Number(h.phone.replace(/\D/g, '')))
      .text(68, 40, h.contact)
      .put(108, informativeId(h.model, h.year))
      .number(123, 13, 0)
  );
}

const detail = (h: InformativeHead, nif: string): Line =>
  new Line(RECORD_LENGTH)
    .put(1, `2${h.model}`)
    .number(5, 4, h.year)
    .put(9, nif9(h.nif))
    .put(18, nif9(nif));

const join = (records: Line[]): string => records.map((r) => r.toString() + RECORD_END).join('');
const total = (list: number[]) => list.reduce((s, n) => s + toCents(n), 0) / 100;

export interface Payee190 extends PayeeRecord {
  nif: string;
  key: 'G';
  subkey: '01' | '03';
  province: string;
}

/** The 190 with its professionals (key G): type 1, then one type 2 per payee [DR190]. */
export function write190(h: InformativeHead, payees: Payee190[]): string {
  const one = head(h)
    .number(136, 9, payees.length)
    .put(145, ' ')
    .number(146, 15, toCents(total(payees.map((p) => p.paid))))
    .number(161, 15, toCents(total(payees.map((p) => p.withheld))))
    // The e-mail goes as typed: «@» and «.» are not letters, but an address needs them.
    .put(
      176,
      h.email
        .replace(/[^\x21-\x7e]/g, '')
        .slice(0, 50)
        .padEnd(50, ' ')
    );
  const twos = payees.map((p) => {
    const line = detail(h, p.nif)
      .text(36, 40, p.name)
      .put(76, p.province)
      .put(78, p.key)
      .put(79, p.subkey)
      .number(82, 13, toCents(p.paid))
      .number(95, 13, toCents(p.withheld));
    // Every other number of the record is zero: in kind (109-147), year (148-151), Ceuta/Melilla
    // (152), the additional data (153-254, but the NIF of the spouse), incapacity (256-321), 322,
    // the territories (323-387) and 388-394.
    for (const [pos, len] of ZEROS_190) line.number(pos, len, 0);
    return line;
  });
  return join([one, ...twos]);
}

const ZEROS_190: readonly (readonly [number, number])[] = [
  [109, 13],
  [122, 13],
  [135, 13],
  [148, 4],
  [152, 1],
  [153, 4],
  [157, 1],
  [167, 4],
  [171, 84],
  [256, 26],
  [283, 39],
  [322, 66],
  [388, 7],
];

export interface Landlord180 extends PayeeRecord {
  nif: string;
  province: string;
  premises: Premises;
}

/** The 180: type 1, then one type 2 per landlord, with the premises [DR180]. */
export function write180(h: InformativeHead, landlords: Landlord180[]): string {
  const one = head(h)
    .number(136, 9, landlords.length)
    .put(145, ' ')
    .number(146, 15, toCents(total(landlords.map((l) => l.paid))))
    .number(161, 15, toCents(total(landlords.map((l) => l.withheld))));
  const twos = landlords.map((l) => {
    const p = l.premises;
    return (
      detail(h, l.nif)
        .text(36, 40, l.name)
        .put(76, l.province)
        // 78: «1», a rent paid in money.
        .put(78, '1')
        .put(79, ' ')
        .number(80, 13, toCents(l.paid))
        .number(93, 4, Math.round((l.rate ?? 0) * 100))
        .number(97, 13, toCents(l.withheld))
        .number(110, 4, 0)
        .put(114, p.situation)
        .text(115, 20, p.cadastre)
        .text(135, 5, p.streetType)
        .text(140, 50, p.street)
        .put(190, p.number.trim() === '' ? 'S/N' : 'NUM')
        .text(193, 5, p.number)
        .text(210, 3, p.floor)
        .text(213, 3, p.door)
        .text(256, 30, p.town)
        .text(286, 30, p.municipality)
        .text(316, 5, p.municipalityCode)
        .text(321, 2, p.province)
        .text(323, 5, p.postcode)
    );
  });
  return join([one, ...twos]);
}

export interface Declared347 extends Record347 {
  nif: string;
  province: string;
}

/**
 * The 347: type 1, then one type 2 «declarado» per person and key [DR347]; the operations under the
 * cash regime of VAT in a record of their own, marked at 281 with their cash amount at 284-299
 * (their quarters come at zero from the summary).
 */
export function write347(h: InformativeHead, people: Declared347[]): string {
  const one = head(h).number(136, 9, people.length);
  signed(one, 145, 16, total(people.map((p) => p.total)));
  // 161-185: no premises records (only a landlord fills them).
  one.number(161, 9, 0);
  signed(one, 170, 16, 0);
  const twos = people.map((p) => {
    const line = detail(h, p.nif)
      .text(36, 40, p.name)
      .put(76, 'D')
      .put(77, p.province)
      .put(82, p.key)
      .put(100, p.premises ? 'X' : ' ')
      .number(101, 15, 0)
      .number(132, 4, 0)
      .put(281, p.cash ? 'X' : ' ')
      .put(282, p.reverse ? 'X' : ' ')
      .number(300, 6, 0);
    signed(line, 83, 16, p.total);
    signed(line, 116, 16, 0);
    p.quarters.forEach((q, i) => {
      signed(line, 136 + i * 32, 16, q);
      signed(line, 152 + i * 32, 16, 0);
    });
    signed(line, 284, 16, p.cashTotal ?? 0);
    return line;
  });
  return join([one, ...twos]);
}

// ─── Reader ──────────────────────────────────────────────────────────────────

export interface ReadInformative {
  model: string;
  year: number;
  nif: string;
  name: string;
  id: string;
  count: number;
  /** The records of type 2, as they are (500 characters each). */
  details: string[];
}

function int(line: string, pos: number, len: number): number {
  const n = readNumber(line, pos, len);
  if (n === null) throw new Error(`number at ${pos}`);
  return n;
}

/** Euros of a field of `len` digits, or of a signed one («N» or blank first) when `sign` is true. */
export function euros(line: string, pos: number, len: number, sign = false): number {
  if (!sign) return int(line, pos, len) / 100;
  const n = int(line, pos + 1, len - 1) / 100;
  return line[pos - 1] === 'N' ? -n : n;
}

/** Reads the records of an informative return written with its design. */
export function readInformative(text: string): ReadInformative {
  const records = text.split(RECORD_END).filter((r) => r !== '');
  if (records.some((r) => r.length !== RECORD_LENGTH)) throw new Error('length');
  const [first, ...details] = records;
  if (first[0] !== '1') throw new Error('type 1');
  const model = first.slice(1, 4);
  if (details.some((d) => !d.startsWith(`2${model}`))) throw new Error('type 2');
  return {
    model,
    year: int(first, 5, 4),
    nif: readText(first, 9, 9),
    name: readText(first, 18, 40),
    id: readText(first, 108, 13),
    count: int(first, 136, 9),
    details,
  };
}
