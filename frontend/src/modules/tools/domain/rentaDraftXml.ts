/**
 * The tax return (modelo 100) as the Agency's file: Renta WEB downloads the draft or the return, of
 * this year or an earlier one, as a «.txt» that is an XML of the schema `Renta<year>.xsd`, root
 * `<Declaracion modelo="100" ejercicio="2025" periodo="0A">` (ISO-8859-1). Each element is a box of
 * the return: the map from its path to the box comes from the Agency's public data dictionary
 * (`diccionarioXSD_<year>.properties`, data/renta/xml, checked 19-10-2026).
 *
 * The result is the same reading as the PDF's (rentaDraft.ts), so the comparison and the planner do
 * not change. The personal data (NIF, names, dates of birth, the bank account) is read only to work
 * out the community, the ages, the marital status and who is who, and is never returned.
 */
import type { Disability } from './rentaCalc';
import { stateApplied, type DraftReading } from './rentaDraft';
import { round2 } from './round';

/** Path of an element (from below the root) → [box, data type, description]. */
export type XmlBoxes = Record<string, [string, string, string]>;

/** The map of one exercise. */
export interface XmlMap {
  exercise: number;
  boxes: XmlBoxes;
}

/** The other person of a joint return, as the file gives them. */
export interface XmlPartner {
  gross: number | null;
  socialSecurity: number | null;
  withheld: number | null;
  pension: number | null;
  age: number | null;
  disability: Disability | null;
}

/** What the file adds to the PDF's reading. */
export interface XmlExtras {
  format: 'xml';
  /** Joint return (TIPOTRIBUTACION 2). */
  joint: boolean;
  /** Married on 31 December (ECIVIL 2). */
  married: boolean;
  partner: XmlPartner | null;
  /** The exercise of the map the boxes were read with (the nearest one published). */
  mapExercise: number;
}

export type XmlDraftReading = DraftReading & XmlExtras;

/**
 * The communities by their code in the schema (tipo_CCAA of Renta2025.xsd): 14 and 15 are the foral
 * ones, which do not use this model, and 20 is a non-resident.
 */
export const CCAA_CODES: Record<string, string> = {
  '01': 'andalucia',
  '02': 'aragon',
  '03': 'asturias',
  '04': 'baleares',
  '05': 'canarias',
  '06': 'cantabria',
  '07': 'castilla-la-mancha',
  '08': 'castilla-y-leon',
  '09': 'cataluna',
  '10': 'extremadura',
  '11': 'galicia',
  '12': 'madrid',
  '13': 'murcia',
  '16': 'la-rioja',
  '17': 'comunitat-valenciana',
  '18': 'ceuta',
  '19': 'melilla',
};

/** tipo_Titular: 2 the declarant, 3 the spouse, 4 to 7 the children. */
const DECLARANT = '2';
const SPOUSE = '3';

/** The root of the file: `<Declaracion modelo="100" ejercicio="2025" ...>`. */
const ROOT = /<Declaracion\b[^>]*\bmodelo\s*=\s*["']100["'][^>]*>/;

/** The file is a modelo 100 of the Agency. */
export const isDraftXml = (text: string): boolean => ROOT.test(text.slice(0, 4000));

/** The exercise the file declares, or null. */
export function xmlExercise(text: string): number | null {
  const root = ROOT.exec(text.slice(0, 4000));
  const year = root && /\bejercicio\s*=\s*["'](\d{4})["']/.exec(root[0]);
  return year ? Number(year[1]) : null;
}

/** The encoding the XML declaration names (`encoding="ISO-8859-1"`); UTF-8 without one. */
export function declaredEncoding(head: string): string {
  const found = /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([\w.:-]+)["']/i.exec(head);
  return found ? found[1].toLowerCase() : 'utf-8';
}

/** Amounts are `P` (positive) or `N` (may be negative) with their digits: `P102`, `N102`, `P030`. */
const isAmount = (kind: string) => /^[PN]\d{3}$/.test(kind);

/** `dd/mm/yyyy` → the age on 31 December of `year`. */
const ageOn = (date: string, year: number): number | null => {
  const found = /(\d{4})\s*$/.exec(date);
  return found ? year - Number(found[1]) : null;
};

/** tipo_GradoDiscapacidad: 1-2 from 33 % (2 with help of others), 3 from 65 %, 4 by a court. */
const disabilityOf = (code: string | null): Disability | null => {
  if (code === null) return null;
  if (code === '1' || code === '2') return 33;
  if (code === '3' || code === '4') return 65;
  return 0;
};

/** The boxes of a sum («suma de las casillas [0801] + [1083] a [1090] + ...»), ranges included. */
export function sumBoxes(description: string): string[] {
  const boxes: string[] = [];
  const part = /\[(\d{4})\](?:\s*a\s*\[(\d{4})\])?/g;
  for (const m of description.matchAll(part)) {
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    for (let n = from; n <= to; n++) boxes.push(String(n).padStart(4, '0'));
  }
  return boxes;
}

/** A description without what is only a pointer («(importe de la casilla [2122] del anexo B.14)»). */
const labelOf = (description: string) =>
  description
    .replace(/\s*\((?:importe|suma|cumplimente|desglose)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

interface Value {
  path: string;
  box: string;
  amount: number;
}

/** The child elements (not `children`, which some XML parsers lack). */
const elementsIn = (el: Element): Element[] =>
  Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1);

/** Every amount of an element and its children, with its path from below the root. */
function amountsOf(el: Element, path: string, map: XmlBoxes, out: Value[]): Value[] {
  for (const attr of Array.from(el.attributes)) {
    const entry = map[`${path}/@${attr.name}`];
    if (entry && entry[0] && isAmount(entry[1]) && attr.value.trim() !== '')
      out.push({ path: `${path}/@${attr.name}`, box: entry[0], amount: Number(attr.value) });
  }
  const children = elementsIn(el);
  if (children.length === 0) {
    const entry = map[path];
    const text = String(el.textContent).trim();
    if (entry && isAmount(entry[1]) && text !== '' && Number.isFinite(Number(text)))
      out.push({ path, box: entry[0], amount: Number(text) });
    return out;
  }
  for (const child of children) amountsOf(child, `${path}/${child.tagName}`, map, out);
  return out;
}

/** Each box with all its amounts, in the order of the file. */
function byBox(values: Value[]): Record<string, number[]> {
  const boxes: Record<string, number[]> = {};
  for (const v of values) if (v.box) (boxes[v.box] ??= []).push(v.amount);
  return boxes;
}

const first = (boxes: Record<string, number[]>, ...ids: string[]): number | null => {
  for (const id of ids) if (boxes[id]?.length) return boxes[id][0];
  return null;
};

const sum = (list: number[] | undefined): number | null =>
  list?.length ? round2(list.reduce((a, b) => a + b, 0)) : null;

/** The text of the first element with this tag below `el` (only read here, never returned). */
const textIn = (el: Element | null | undefined, tag: string): string | null => {
  const found = el?.getElementsByTagName(tag)[0];
  const text = found?.textContent?.trim();
  return text ? text : null;
};

/**
 * The deductions of the community the draft applies: the boxes its sum adds up (the element whose
 * box is 0564, «Suma de deducciones autonómicas», lists them), each one with its description.
 */
function regionalApplied(
  values: Value[],
  map: XmlBoxes
): (DraftReading['applied'][number] & { tag: string })[] {
  const regional = values.filter((v) => v.path.includes('/DeduccionAutonomicaRes/'));
  const total = regional.find((v) => v.box === '0564');
  const listed = total ? sumBoxes(map[total.path][2]) : [];
  return regional
    .filter((v) => v !== total && v.amount > 0 && (listed.length === 0 || listed.includes(v.box)))
    .map((v) => ({
      label: labelOf(map[v.path][2]),
      amount: v.amount,
      box: v.box,
      tag: v.path.split('/').pop() as string,
    }));
}

/**
 * What was spent on each regional deduction, from its detail window: the result element (`VA40` in
 * `CValencianaRes`) and its detail (`CValenciana/VA40/IMP3VA40`) share the tag. Only the fields the
 * catalogue tells apart are kept, by the id of the deduction they are the base of.
 */
function regionalBases(values: Value[], tag: string): Record<string, number> | undefined {
  const bases: Record<string, number> = {};
  for (const v of values) {
    const parts = v.path.split('/');
    const at = parts.indexOf('DeduccionAutonomica');
    const id = BASE_IDS[parts[parts.length - 1]];
    if (at < 0 || parts[at + 2] !== tag || !id) continue;
    bases[id] = round2((bases[id] ?? 0) + v.amount);
  }
  return Object.keys(bases).length ? bases : undefined;
}

/**
 * The detail fields of a regional deduction that is one box for several kinds of expense, with the
 * deduction of the catalogue each one is the base of (diccionarioDlgXSD_2025: the Valencian health
 * deduction, VA40, has one field per kind; VA41 is the sport one).
 */
const BASE_IDS: Record<string, string> = {
  IMP1VA40: 'comunitat-valenciana-salud-cronicas-raras',
  IMP2VA40: 'comunitat-valenciana-salud-dano-cerebral-alzheimer',
  IMP3VA40: 'comunitat-valenciana-salud-bucodental',
  IMP4VA40: 'comunitat-valenciana-salud-mental',
  IMP5VA40: 'comunitat-valenciana-salud-optica',
  IMPPSVA41: 'comunitat-valenciana-practica-deporte',
};

/** Properties at the owner's disposal: value (0083), imputed income (0089) and days (0085). */
function unrentedOf(properties: Element[], map: XmlBoxes, base: string): DraftReading['unrented'] {
  return properties.flatMap((p) => {
    const boxes = byBox(amountsOf(p, base, map, []));
    const value = first(boxes, '0083');
    const imputed = first(boxes, '0089');
    if (value === null || imputed === null || value <= 0) return [];
    // Imputed income of 1.1 % of the value means a revised value; 2 %, one that was not.
    return [{ value, revised: imputed / value < 0.015, days: first(boxes, '0085') }];
  });
}

interface Person {
  boxes: Record<string, number[]>;
  values: Value[];
  el: Element;
}

/** What the file says of one person (declarant or spouse): their boxes and amounts. */
function personOf(el: Element, map: XmlBoxes): Person {
  const values = amountsOf(el, 'DatosEconomicos/TomaDatosAmpliada', map, []);
  return { boxes: byBox(values), values, el };
}

/** The work withholdings of a person: what each payer withheld (IDRE, a detail without a box). */
const workWithheld = (p: Person) =>
  sum(
    Array.from(p.el.getElementsByTagName('IDRE'))
      .map((el) => Number(el.textContent))
      .filter((n) => Number.isFinite(n))
  );

/** The partner of a joint return, from their own data. */
function partnerOf(p: Person, ids: Element | null, year: number): XmlPartner {
  const born = textIn(ids, 'DPFNAC_C');
  return {
    gross: first(p.boxes, '0012', '0003'),
    socialSecurity: first(p.boxes, '0013'),
    withheld: workWithheld(p),
    pension: first(p.boxes, '0465'),
    age: born ? ageOn(born, year) : null,
    disability: disabilityOf(textIn(ids, 'DPGMIN_C')),
  };
}

/** The personal data of the file, kept only inside this function. */
function familyOf(doc: Document, year: number) {
  const ids = doc.getElementsByTagName('DatosIdentificativos')[0] ?? null;
  const declarant = ids?.getElementsByTagName('Declarante')[0] ?? null;
  const children = ids ? Array.from(ids.getElementsByTagName('Hijo')) : [];
  const ascendants = ids ? Array.from(ids.getElementsByTagName('Ascendiente')) : [];
  const born = textIn(declarant, 'DPFNAC_D');
  const ages = (list: Element[], tag: string) =>
    list
      .map((el) => textIn(el, tag))
      .filter((d): d is string => d !== null)
      .map((d) => ageOn(d, year))
      .filter((a): a is number => a !== null);
  return {
    ids: ids?.getElementsByTagName('Conyuge')[0] ?? null,
    age: born ? ageOn(born, year) : null,
    disability: disabilityOf(textIn(declarant, 'DPGMIN_D')),
    married: textIn(declarant, 'ECIVIL') === '2',
    childAges: ages(children, 'FNACDLG'),
    ascendantAges: ages(ascendants, 'ANOASDLG'),
  };
}

/** Thrown when the text is not an XML of the modelo 100 (or cannot be parsed). */
export class NotADraftXml extends Error {
  constructor() {
    super('not a modelo 100 XML');
  }
}

/** The parts of the economic data: who is who, their amounts and the results of the return. */
function sectionsOf(root: Element, map: XmlBoxes) {
  const economic = root.getElementsByTagName('DatosEconomicos')[0] ?? root;
  const people = Array.from(economic.getElementsByTagName('TomaDatosAmpliada')).sort((a, b) =>
    String(a.getAttribute('titular')).localeCompare(String(b.getAttribute('titular')))
  );
  const own = people.find((p) => p.getAttribute('titular') === DECLARANT) ?? people[0] ?? null;
  const spouse = people.find((p) => p.getAttribute('titular') === SPOUSE) ?? null;
  const results = economic.getElementsByTagName('Resultados')[0];
  return {
    joint: economic.getAttribute('TIPOTRIBUTACION') === '2',
    code: economic.getAttribute('codigoCADeclaracion') ?? own?.getAttribute('codigoCA') ?? '',
    own: own ? personOf(own, map) : null,
    partner: spouse ? personOf(spouse, map) : null,
    results: results ? amountsOf(results, 'DatosEconomicos/Resultados', map, []) : [],
  };
}

/** The draft's boxes as the PDF gives them: the results of the return, then each person's own. */
function boxesOf(sources: Record<string, number[]>[]): Record<string, number> {
  const boxes: Record<string, number> = {};
  for (const source of sources)
    for (const [box, list] of Object.entries(source)) boxes[box] ??= list[0];
  return boxes;
}

/**
 * Reads the file. `year`: the exercise the ages are worked out for (the one being prepared, which
 * may be later than the file's); `map`: the boxes of the file's exercise (or the nearest one).
 */
export function readDraftXml(
  text: string,
  options: { year: number; map: XmlMap }
): XmlDraftReading {
  if (!isDraftXml(text)) throw new NotADraftXml();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.documentElement.tagName !== 'Declaracion') throw new NotADraftXml();
  const { boxes: map } = options.map;
  const { joint, code, own, partner, results } = sectionsOf(doc.documentElement, map);
  const totals = byBox(results);
  const mine = own?.boxes ?? {};
  const family = familyOf(doc, options.year);
  const properties = own ? Array.from(own.el.getElementsByTagName('Inmueble')) : [];
  const values = [...(own?.values ?? []), ...(partner?.values ?? []), ...results];
  const withheld = first(totals, '0609', '0596');
  const boxes = boxesOf([totals, mine, partner?.boxes ?? {}]);
  const applied = regionalApplied(results, map).map(({ tag, ...a }) => {
    const bases = regionalBases(values, tag);
    return bases ? { ...a, bases } : a;
  });
  // In a joint return the spouse's withholdings are theirs.
  const theirs = joint && partner ? (workWithheld(partner) ?? 0) : 0;
  return {
    format: 'xml',
    ccaaId: CCAA_CODES[code] ?? null,
    gross: first(mine, '0012', '0003'),
    socialSecurity: first(mine, '0013'),
    withheld: withheld === null ? null : round2(withheld - theirs),
    pension: first(mine, '0465'),
    rentalIncome: sum(mine['0102']),
    savings: first(totals, '0460'),
    childAges: family.childAges,
    ascendantAges: family.ascendantAges,
    age: family.age,
    ownsHome: properties.some((p) => textIn(p, 'USOHAB') === '1'),
    applied: [...stateApplied(boxes), ...applied],
    exercise: xmlExercise(text),
    disability: family.disability,
    unrented: unrentedOf(properties, map, 'DatosEconomicos/TomaDatosAmpliada/Inmuebles/Inmueble'),
    boxes,
    joint,
    married: family.married,
    partner: partner ? partnerOf(partner, family.ids, options.year) : null,
    mapExercise: options.map.exercise,
  };
}
