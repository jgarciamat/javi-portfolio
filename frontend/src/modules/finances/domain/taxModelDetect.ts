import type { PdfToken } from './taxModelPdf';

/**
 * Which form a PDF is, before its boxes are read: the State's forms the app reads, the forms of the
 * foral Treasuries (same numbers, other boxes), and documents that only print a form (the BOE, the
 * manuals). Sources and the failures this guards against: docs/fiscalidad/documentos-oficiales.md,
 * § 1 «Haciendas forales» and § 2 (checked on 19 October 2026).
 */

export type TaxModel =
  | '100'
  | '111'
  | '115'
  | '130'
  | '131'
  | '303'
  | '349'
  | '390'
  // Read (their boxes, as the previews of the app print them) but not taken into the draft.
  | InformativeModel;

/** Forms the reader knows that the self-employed draft does not import. */
export const INFORMATIVE = ['123', '180', '190', '309', '347'] as const;
export type InformativeModel = (typeof INFORMATIVE)[number];

/** The four foral Treasuries; «basque» when the PDF does not say which of the three Basque ones. */
export type ForalTerritory = 'bizkaia' | 'gipuzkoa' | 'alava' | 'navarra' | 'basque';

export type FormKind =
  | { kind: 'model'; model: TaxModel }
  | { kind: 'foral'; territory: ForalTerritory }
  | { kind: 'notAForm' }
  | { kind: 'unknown' };

/** All the words of the PDF in one line, lower case, every run of spaces and line breaks as one space. */
export const wordsOf = (tokens: PdfToken[]): string =>
  tokens
    .map((t) => t.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

/**
 * Words only a foral form prints: the Treasury that issues it. The State's 303 names the four
 * territories too (boxes 89-92, «Tributación exclusivamente foral»), so a bare name proves nothing.
 */
const FORAL: [RegExp, ForalTerritory][] = [
  [/diputaci[oó]n foral de (bizkaia|vizcaya)|bizkaiko foru|hacienda foral de bizkaia/, 'bizkaia'],
  [/diputaci[oó]n foral de (gipuzkoa|guip[uú]zcoa)|gipuzkoako foru/, 'gipuzkoa'],
  [/diputaci[oó]n foral de [aá]lava|arabako foru|hacienda foral de [aá]lava/, 'alava'],
  [
    /hacienda (foral|tributaria) de navarra|gobierno de navarra|nafarroako|\bf-?69\b|\bf-?90\b/,
    'navarra',
  ],
  [/foru aldundia|foru ogasuna|diputaci[oó]n foral/, 'basque'],
];

/** The BOE prints the forms of its orders blank, with rates beside the boxes (41 «1,75»). */
const PUBLICATION =
  /bolet[ií]n oficial del estado|cve: ?boe-|verificable en https?:\/\/www\.boe\.es/;

/** A manual or a book of instructions: far more pages than any filed form (the Renta aside). */
const MAX_PAGES = 40;

/** The number of the form printed big in its header («Modelo 303»), as the State's forms do. */
const BIG = 14;
const NUMBERED: Record<string, TaxModel> = {
  '100': '100',
  'd-100': '100',
  '111': '111',
  '115': '115',
  '130': '130',
  '131': '131',
  '303': '303',
  '349': '349',
  '390': '390',
  ...Object.fromEntries(INFORMATIVE.map((m) => [m, m])),
};

function printedNumber(tokens: PdfToken[]): TaxModel | null {
  const big = tokens.find(
    (t) => !t.field && (t.h ?? 0) >= BIG && t.text.trim().toLowerCase() in NUMBERED
  );
  return big ? NUMBERED[big.text.trim().toLowerCase()] : null;
}

/** Boxes only the 390 has (600-698, the deductions by rate and the prorrata by activity). */
function has390Boxes(tokens: PdfToken[]): boolean {
  const ids = tokens.filter((t) => /^\[?6\d\d\]?$/.test(t.text.trim()));
  return ids.length >= 3;
}

/** The 390 is of the whole year: its period is «0A». */
const yearly = (words: string) => /per[ií]odo 0a\b/.test(words);

const RENTA = /renta de las personas f[ií]sicas/;
const WITHHOLDING = /retenciones e ingresos a cuenta/;
const VAT = /impuesto sobre el valor a[ñn]adido/;
const INSTALMENT = /pago fraccionado/;

/**
 * The forms by the words of their titles, in this order: the first one whose words are all there
 * (and none of `unless`) is the form.
 * - The Renta says its number: it also speaks of withholdings, earned income and payments on
 *   account. The 130 calls itself a «declaración» of the personal income tax too, so without the
 *   number the Renta is the last guess.
 * - The withholding forms say «retenciones e ingresos a cuenta», as the box 06 of the 130 does: they
 *   are told apart by what only the 111 and the 115 have.
 * - The 349 and the 390 before the 303: their titles mention the VAT too.
 * - The 131 is the instalment of the modules (estimación objetiva); the 130, of direct estimation.
 */
const TITLES: { all: RegExp[]; unless?: RegExp; model: TaxModel }[] = [
  { all: [RENTA, /modelo (d-)?100\b|\bd-100\b/], model: '100' },
  { all: [WITHHOLDING, /arrendamiento o subarrendamiento de inmuebles urbanos/], model: '115' },
  { all: [WITHHOLDING, /rendimientos del trabajo/], unless: INSTALMENT, model: '111' },
  { all: [/recapitulativa de operaciones intracomunitarias/], model: '349' },
  { all: [VAT, /resumen anual/], model: '390' },
  { all: [VAT, /autoliquidaci[oó]n/], model: '303' },
  { all: [INSTALMENT, /estimaci[oó]n objetiva/], model: '131' },
  { all: [INSTALMENT, /(estimaci[oó]n directa|actividades econ[oó]micas)/], model: '130' },
  { all: [RENTA, /(borrador|declaraci[oó]n)/], model: '100' },
];

const titled = (words: string): TaxModel | null =>
  TITLES.find((t) => t.all.every((re) => re.test(words)) && !t.unless?.test(words))?.model ?? null;

/** Which form the PDF is, and whether the app can read it as a State form. */
export function formKindOf(tokens: PdfToken[], pages: number): FormKind {
  const raw = wordsOf(tokens);
  if (PUBLICATION.test(raw)) return { kind: 'notAForm' };
  const foral = FORAL.find(([words]) => words.test(raw));
  if (foral) return { kind: 'foral', territory: foral[1] };
  // The 303 asks whether one is exempt from the 390 (page 1, «exonerado», and page 4 of the 2026
  // design, «exonerados»): that mention is not its title.
  const words = raw.replace(/exonerad[oa]s? de la declaraci[oó]n-? ?resumen anual/g, '');
  const model = printedNumber(tokens) ?? titled(words);
  if (!model) return { kind: 'unknown' };
  if (model !== '100' && pages > MAX_PAGES) return { kind: 'notAForm' };
  // A 390 whose title was not read as text still prints its yearly period and its own boxes.
  if (model === '303' && (yearly(words) || has390Boxes(tokens)))
    return { kind: 'model', model: '390' };
  return { kind: 'model', model };
}
