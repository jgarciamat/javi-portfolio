/**
 * Identifiers the files carry: the Spanish NIF (DNI, NIE, K/L/M and the NIF of entities) with its
 * control character, the IBAN and the VAT number of other EU States. Sources (checked 19-10-2026):
 * - DNI and NIE: Real Decreto 1553/2005, art. 11 (letter = number mod 23 in «TRWAGMYFPDXBNJZSQVHLCKE»;
 *   the X, Y and Z of the NIE count as 0, 1 and 2). K, L and M: Orden EHA/451/2008 and RD 1065/2007,
 *   art. 20 (same letter on the seven digits).
 * - NIF of entities: Orden EHA/451/2008, art. 2 and annex (control digit or letter «JABCDEFGHI»).
 * - IBAN: ISO 13616 (mod 97 = 1); a Spanish one has 24 characters [DR303e26v101.xlsx, page DID, nota 6].
 * - VAT numbers: lengths of each State in DR_Anexo_349.pdf, «Composición del NIF comunitario».
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const ENTITY_LETTERS = 'JABCDEFGHI';

/** A NIF as typed («12.345.678-z») to the 9 characters of the files, zeros on the left of a DNI. */
export function normalNif(value: string): string {
  const v = value.toUpperCase().replace(/[\s.\-/]/g, '');
  // A DNI typed without its leading zeros («1234567L»).
  if (/^\d{1,7}[A-Z]$/.test(v)) return v.padStart(9, '0');
  return v;
}

export type NifKind = 'person' | 'entity';

const letterOk = (digits: string, letter: string): boolean =>
  DNI_LETTERS[Number(digits) % 23] === letter;

/** The NIF of an entity: letter, seven digits and the control digit or letter. */
function entityOk(v: string): boolean {
  const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(v);
  if (!m) return false;
  const sum = m[2]
    .split('')
    .map(Number)
    // Positions 1, 3, 5 and 7 are doubled and their digits added.
    .reduce((s, d, i) => s + (i % 2 === 0 ? Math.floor((d * 2) / 10) + ((d * 2) % 10) : d), 0);
  const c = (10 - (sum % 10)) % 10;
  const [, first, , control] = m;
  // Entities without a capital (P, Q, R, S, N, W) carry a letter; A, B, E and H a digit.
  if ('PQRSNW'.includes(first)) return control === ENTITY_LETTERS[c];
  if ('ABEH'.includes(first)) return control === String(c);
  return control === String(c) || control === ENTITY_LETTERS[c];
}

/** The kind of a valid NIF, or null when it is not valid (wrong shape or control character). */
export function nifKind(value: string): NifKind | null {
  const v = normalNif(value);
  const dni = /^(\d{8})([A-Z])$/.exec(v) ?? /^[KLM](\d{7})([A-Z])$/.exec(v);
  if (dni) return letterOk(dni[1], dni[2]) ? 'person' : null;
  const nie = /^([XYZ])(\d{7})([A-Z])$/.exec(v);
  if (nie) return letterOk('XYZ'.indexOf(nie[1]) + nie[2], nie[3]) ? 'person' : null;
  return entityOk(v) ? 'entity' : null;
}

/** An IBAN without blanks, in capitals. */
export const normalIban = (value: string): string => value.toUpperCase().replace(/\s/g, '');

/** ISO 13616 check (mod 97 = 1), with the length of a Spanish IBAN. */
export function validIban(value: string): boolean {
  const v = normalIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v)) return false;
  if (v.startsWith('ES') && v.length !== 24) return false;
  const moved = v.slice(4) + v.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of n) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

/** Characters of the VAT number of each State after its prefix [DR_Anexo_349.pdf]. */
const VAT_SHAPES: Record<string, RegExp> = {
  DE: /^\d{9}$/,
  AT: /^[A-Z0-9]{9}$/,
  BE: /^\d{10}$/,
  BG: /^\d{9,10}$/,
  CY: /^[A-Z0-9]{9}$/,
  HR: /^\d{11}$/,
  DK: /^\d{8}$/,
  SI: /^\d{8}$/,
  EE: /^\d{9}$/,
  FI: /^\d{8}$/,
  FR: /^[A-Z0-9]{11}$/,
  EL: /^\d{9}$/,
  NL: /^[A-Z0-9]{12}$/,
  HU: /^\d{8}$/,
  IT: /^\d{11}$/,
  IE: /^[A-Z0-9]{8,9}$/,
  LV: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  MT: /^\d{8}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  CZ: /^\d{8,10}$/,
  SK: /^\d{10}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  // GB is in the table of the design but left the EU in 2020: the backend does not take it either.
};

/** Splits «FR12345678901» into its State and number; null when the State is unknown. */
export function splitVatId(value: string): { country: string; number: string } | null {
  const v = value.toUpperCase().replace(/[\s.\-/]/g, '');
  const country = v.slice(0, 2);
  if (!(country in VAT_SHAPES)) return null;
  return { country, number: v.slice(2) };
}

/** The number fits the shape of its State (no checksum: each State has its own). */
export function vatIdShapeOk(value: string): boolean {
  const split = splitVatId(value);
  return split !== null && VAT_SHAPES[split.country].test(split.number);
}
