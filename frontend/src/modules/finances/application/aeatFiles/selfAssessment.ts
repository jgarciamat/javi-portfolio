/**
 * Files of the self-assessment forms (111, 115, 130, 303, 390) in the format of their record design:
 * an envelope «<T» + model + «0» + year + period + «0000>» with its «<AUX>» block (sheet «…00» of
 * each design), the pages one after the other (each between «<T» + model + page + «>» and
 * «</T» + model + page + «>») and the closing «</T» + model + «0» + year + period + «0000>».
 * The reader below takes the same tables, so that a written file can be read back box by box.
 */
import { DESIGNS, type DesignModel, type Field, type PageDesign } from './designs';
import { FieldError, Line, readNumber, readText, toCents } from './fixedWidth';

/** The value of a box: euros (or a rate, or a number of people) or the text of a text box. */
export type BoxValue = number | string;

/** Explicit fields of a page, outside the boxes: position (from 1), length and text or number. */
export type Put = readonly [number, number, string | number];

export interface PageFill {
  tag: string;
  puts: Put[];
}

/** How a number is written: money in cents, a rate in hundredths (3 + 2 digits) or a count. */
export function unitsOf(field: Field, value: number): number {
  const len = field[1];
  if (len === 17) return toCents(value);
  if (len === 5) return Math.round(value * 100);
  return Math.round(value);
}

const fromUnits = (field: Field, units: number): number =>
  field[1] === 17 || field[1] === 5 ? units / 100 : units;

/** Where each box is written: its first field in the pages of the file (some boxes repeat). */
export function boxPlaces(
  pages: readonly PageDesign[]
): Map<string, { page: string; field: Field }> {
  const places = new Map<string, { page: string; field: Field }>();
  for (const p of pages)
    for (const f of p.fields)
      if (f[3] !== null && !places.has(f[3])) places.set(f[3], { page: p.tag, field: f });
  return places;
}

export interface Envelope {
  model: DesignModel;
  year: number;
  /** «1T»…«4T», or «0A» for the annual summary. */
  period: string;
}

/** The opening block of the file: «<T…0000>» and the «<AUX>» block, blanks where the AEAT keeps them. */
function opening({ model, year, period }: Envelope): string {
  // Program version (93-96) and NIF of the developer (101-109) are for registered developers: blank.
  return new Line(328)
    .put(1, `<T${model}0${year}${period}0000>`)
    .put(18, '<AUX>')
    .put(323, '</AUX>')
    .toString();
}

const closing = ({ model, year, period }: Envelope): string => `</T${model}0${year}${period}0000>`;

export interface WriteResult {
  text: string;
  /** Boxes with a value that have no field in the pages written. */
  unplaced: string[];
}

/**
 * Writes a file: the pages in `tags` (in the order of the design), every numeric field at zero
 * unless the design fixes a constant, the boxes in `values` and the explicit `fills`.
 * Throws a FieldError when a value does not fit its field.
 */
/** One field of the design: its constant, the value of its box, or zero for a number. */
function writeField(line: Line, field: Field, value: BoxValue | undefined): void {
  const [pos, len, type, box, constant] = field;
  try {
    if (constant !== null) line.put(pos, constant);
    else if (typeof value === 'string') line.text(pos, len, value);
    else if (type === 'Num' || type === 'N')
      line.number(pos, len, unitsOf(field, value ?? 0), type);
  } catch (e) {
    // Only a box can carry a value that does not fit: say which one.
    (e as FieldError).box = box;
    throw e;
  }
}

function writePut(line: Line, [pos, len, value]: Put): void {
  if (typeof value === 'number') line.number(pos, len, value);
  else line.text(pos, len, value);
}

/**
 * Writes a file: the pages in `tags` (in the order of the design), every numeric field at zero
 * unless the design fixes a constant, the boxes in `values` and the explicit `fills`.
 * Throws a FieldError when a value does not fit its field.
 */
export function writeSelfAssessment(
  envelope: Envelope,
  tags: string[],
  values: Record<string, BoxValue>,
  fills: PageFill[]
): WriteResult {
  const pages = DESIGNS[envelope.model].filter((p) => tags.includes(p.tag));
  const places = boxPlaces(pages);
  const body = pages.map((page) => {
    const line = new Line(page.length)
      .put(1, `<T${envelope.model}${page.tag}>`)
      .put(page.length - 11, `</T${envelope.model}${page.tag}>`);
    for (const field of page.fields) {
      const box = field[3];
      const placed = box !== null && places.get(box)?.field === field;
      writeField(line, field, placed ? values[box] : undefined);
    }
    for (const fill of fills.filter((f) => f.tag === page.tag))
      for (const put of fill.puts) writePut(line, put);
    return line.toString();
  });
  return {
    text: opening(envelope) + body.join('') + closing(envelope),
    // A zero needs no field: the pages left out (e.g. page 7 of the 390) are all zeros.
    unplaced: Object.keys(values).filter((b) => !places.has(b) && values[b] !== 0),
  };
}

export interface ReadResult extends Envelope {
  /** The pages found, by tag, as they are in the file. */
  pages: Record<string, string>;
  /** Every box of the pages found (numbers in euros, rates or people; text boxes as text). */
  values: Record<string, BoxValue>;
}

/** Why a file cannot be read. */
export class ReadError extends Error {}

/** The pages of a file, each by its opening tag and checked by its closing tag. */
function pagesOf(model: DesignModel, text: string): Record<string, string> {
  const pages: Record<string, string> = {};
  for (const page of DESIGNS[model]) {
    const at = text.indexOf(`<T${model}${page.tag}>`);
    if (at < 0) continue;
    const line = text.slice(at, at + page.length);
    if (!line.endsWith(`</T${model}${page.tag}>`)) throw new ReadError(`page ${page.tag}`);
    pages[page.tag] = line;
  }
  return pages;
}

/**
 * Reads a file written with the design of `model`: the envelope, then each page by its opening tag,
 * checking its length by its closing tag. Every box is read from its first field, like the writer.
 */
export function readSelfAssessment(model: DesignModel, text: string): ReadResult {
  const head = new RegExp(`^<T${model}0(\\d{4})([1-4]T|0A)0000><AUX>`).exec(text);
  if (!head) throw new ReadError('envelope');
  const envelope: Envelope = { model, year: Number(head[1]), period: head[2] };
  if (text.slice(322, 328) !== '</AUX>') throw new ReadError('aux');
  if (!text.endsWith(closing(envelope))) throw new ReadError('closing');
  const pages = pagesOf(model, text);
  const found = DESIGNS[model].filter((p) => p.tag in pages);
  const values: Record<string, BoxValue> = {};
  for (const [box, { page, field }] of boxPlaces(found)) {
    const [pos, len, type] = field;
    if (type === 'Num' || type === 'N') {
      const n = readNumber(pages[page], pos, len);
      if (n === null) throw new ReadError(`box ${box}`);
      values[box] = fromUnits(field, n);
    } else values[box] = readText(pages[page], pos, len);
  }
  return { ...envelope, pages, values };
}
