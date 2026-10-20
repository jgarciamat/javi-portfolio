/**
 * The file of each form for the «Importar» (or «Presentación con fichero») option of the sede of the
 * AEAT, with the checks to make before downloading it. Nothing is filed or signed here: the person
 * imports the file in the sede, identifies themselves there, reviews it and files it.
 *
 * Sources (checked 19-10-2026): the record designs listed in designs.ts and DR_Anexo_349.pdf, and the
 * technical help of each form in the sede, which says it can import a file that follows the design:
 * 111 (`…/ayuda-tecnica/modelo-111.html`), 115 (`modelo-115.html`), 130 (`modelo-130.html`),
 * 303 of 2026 (`modelo-303.html`), 349 (`declaraciones-informativas-ayuda-tecnica/modelos-349-720.html`)
 * and 390 («Presentación mediante fichero», `modelo-390/modelo-390-presentacion-mediante-fichero.html`).
 * The kind of declaration (posición 13) follows note 1 of each design; that of the 130 also its
 * instructions (casilla 19 negative in the 1T-3T: «A deducir», B; zero, or negative in the 4T: N).
 */
import type { AutonomoDraft, Draft349, Draft390, TaxBox } from '@modules/finances/domain/types';
import type { Result111, Result115 } from '@modules/finances/domain/withholdings';
import { FieldError, latin1 } from './fixedWidth';
import { nifKind, normalIban, normalNif, validIban, vatIdShapeOk } from './ids';
import type { Summary347, YearSummary } from '@modules/finances/domain/annualSummaries';
import { planInformative } from './annualFiles';
import type { Premises } from './informative';
import { blank, type Check, contactChecks, error, warn } from './checks';
import { declarationId, write349 } from './m349';
import { type BoxValue, type PageFill, type Put, writeSelfAssessment } from './selfAssessment';
import type { Result131 } from '@modules/finances/domain/module131';
import type { VatSimplifiedResult } from '@modules/finances/domain/vatSimplified';
import {
  dpa131,
  fills303s,
  page131,
  page303s,
  type Modules131,
  type Simplified303,
} from './modules';

export type SedeModel =
  '111' | '115' | '130' | '131' | '303' | '349' | '390' | '190' | '180' | '347';

/** What the files need about the person. Typed on the device; never sent to the server. */
export interface Declarant {
  nif: string;
  /** «Apellidos» of a person (first and second surname), or the name of an entity. */
  surname: string;
  /** First name of a person (empty for an entity). */
  name: string;
  /** Only to pay by direct debit or to receive a refund. */
  iban: string;
  /** 349, 190, 180 and 347: the person the AEAT can call about it. */
  phone: string;
  contact: string;
  /** 190: the e-mail of that person. */
  email: string;
  /** 390: main activity, its key in the instructions of the 390 (e.g. «A03») and IAE heading. */
  activity: string;
  activityCode: string;
  iae: string;
  /** 390 with prorrata: CNAE code of the activity (3 characters in the 2025 design). */
  cnae: string;
  /** 390: there are operations to declare in the 347. */
  thirdParties: boolean;
  /** 190, 180 and 347: what each record needs and the app does not keep, by `recordId`. */
  records: Record<string, RecordExtra>;
}

/** The province of the domicile of a payee or person and, in the 180, the premises rented. */
export interface RecordExtra {
  province: string;
  premises?: Partial<Premises>;
}

export const EMPTY_DECLARANT: Declarant = {
  nif: '',
  surname: '',
  name: '',
  iban: '',
  phone: '',
  contact: '',
  activity: '',
  activityCode: '',
  iae: '',
  cnae: '',
  thirdParties: false,
  email: '',
  records: {},
};

export type SedeSource =
  | { model: '111'; year: number; quarter: 1 | 2 | 3 | 4; result: Result111 }
  | { model: '115'; year: number; quarter: 1 | 2 | 3 | 4; result: Result115 }
  | { model: '130'; draft: AutonomoDraft }
  | { model: '303'; draft: AutonomoDraft }
  | { model: '131'; year: number; quarter: 1 | 2 | 3 | 4; result: Result131; modules: Modules131 }
  | {
      /** The 303 of the simplified regime (módulos): page 2 and its result. */
      model: '303';
      year: number;
      quarter: 1 | 2 | 3 | 4;
      simplified: VatSimplifiedResult;
      activity: Simplified303;
    }
  | { model: '349'; draft: AutonomoDraft; m349: Draft349 }
  | { model: '390'; draft: AutonomoDraft; m390: Draft390 }
  | { model: '190'; year: number; summary: YearSummary }
  | { model: '180'; year: number; summary: YearSummary }
  | { model: '347'; year: number; summary: Summary347 };

export type { Check };

export interface SedeFile {
  model: SedeModel;
  year: number;
  period: string;
  /** NIF + year + period + «.model», as the forms name the file they export. */
  fileName: string;
  text: string;
  bytes: Uint8Array;
}

export interface Built {
  /** Null when an error stops the file. */
  file: SedeFile | null;
  checks: Check[];
  /** The kind of declaration written (I, U, N, B, C, D…), null for the 349 and the 390. */
  kind: string | null;
}

/** The fields the form asks for, by model (NIF and names are always asked). */
export function needs(source: SedeSource): {
  iban: boolean;
  contact: boolean;
  email: boolean;
  activity: boolean;
  cnae: boolean;
} {
  const result = resultOf(source);
  return {
    iban: result === 'pay' || result === 'refund',
    contact: ['349', '190', '180', '347'].includes(source.model),
    email: source.model === '190',
    activity: source.model === '390',
    cnae: source.model === '390' && boxesOf(source.m390.sections).has('118'),
  };
}

type Result = 'pay' | 'refund' | 'offset' | 'deduct' | 'zero' | 'noActivity' | null;

function resultOf(source: SedeSource): Result {
  switch (source.model) {
    case '111':
    case '115':
      return source.result.result === 'pay' ? 'pay' : 'zero';
    case '130':
      return result130(source.draft);
    case '131':
      return source.result.result;
    case '303':
      return 'simplified' in source ? source.simplified.result : source.draft.vat.result;
    default:
      return null;
  }
}

/** The 130: to pay, to deduct in the next quarters (1T-3T) or nothing. */
function result130(draft: AutonomoDraft): Result {
  const r = draft.irpf.result;
  if (r === 'pay') return 'pay';
  return r === 'negative' && draft.quarter < 4 ? 'deduct' : 'zero';
}

const yearOf = (source: SedeSource): number =>
  'draft' in source ? source.draft.year : source.year;

function boxesOf(list: TaxBox[] | { boxes: TaxBox[] }[]): Map<string, number> {
  const all = (list as (TaxBox | { boxes: TaxBox[] })[]).flatMap((x) =>
    'boxes' in x ? x.boxes : [x]
  );
  const map = new Map<string, number>();
  for (const b of all) if (!map.has(b.box)) map.set(b.box, b.amount);
  return map;
}

const get = (map: Map<string, number>, box: string): number => map.get(box) ?? 0;

const record = (map: Map<string, number>): Record<string, BoxValue> => Object.fromEntries(map);

/** NIF, surname and, for a person, first name. */
function identityChecks(d: Declarant): Check[] {
  const checks: Check[] = [];
  const kind = nifKind(d.nif);
  if (blank(d.nif)) checks.push(error('nifMissing'));
  else if (kind === null) checks.push(error('nifInvalid'));
  if (blank(d.surname)) checks.push(error('surnameMissing'));
  if (kind === 'person' && blank(d.name)) checks.push(error('nameMissing'));
  return checks;
}

/** The account: valid, Spanish, and only where it is used (a direct debit or a refund). */
function ibanChecks(d: Declarant, result: Result): Check[] {
  const iban = normalIban(d.iban);
  const used = result === 'pay' || result === 'refund';
  if (iban === '') return result === 'refund' ? [error('ibanRequired')] : [];
  const checks: Check[] = [];
  if (!validIban(iban)) checks.push(error('ibanInvalid'));
  // A direct debit needs a collaborating bank; refunds to foreign accounts need more data.
  else if (!iban.startsWith('ES')) checks.push(error('ibanNotEs'));
  if (!used) checks.push(warn('ibanUnused'));
  return checks;
}

/** The checks on the person's data, the same for every form. */
const declarantChecks = (d: Declarant, result: Result): Check[] => [
  ...identityChecks(d),
  ...ibanChecks(d, result),
];

/** A box that must be the sum of others (signs in `terms`): a warning when it is not, cent by cent. */
function sumCheck(
  values: Map<string, number>,
  box: string,
  terms: Record<string, 1 | -1>
): Check | null {
  const at = (b: string) => get(values, b);
  const expected = Object.entries(terms).reduce((s, [b, sign]) => s + sign * at(b), 0);
  if (Math.abs(expected - at(box)) < 0.005) return null;
  return {
    level: 'warn',
    code: 'sum',
    values: { box, expected: Math.round(expected * 100) / 100, got: at(box) },
  };
}

/** The kind of declaration of the 111, 115 and 130 (note 1 of their designs). */
function kindOf(result: Result, debit: boolean): string {
  if (result === 'pay') return debit ? 'U' : 'I';
  if (result === 'deduct') return 'B';
  if (result === 'offset') return 'C';
  if (result === 'refund') return 'D';
  return 'N';
}

const ident = (d: Declarant, year: number, quarter: number, kind: string): Put[] => [
  [13, 1, kind],
  [14, 9, normalNif(d.nif)],
  [23, 60, d.surname],
  [83, 20, d.name],
  [103, 4, year],
  [107, 2, `${quarter}T`],
];

interface Plan {
  tags: string[];
  values: Record<string, BoxValue>;
  fills: PageFill[];
  checks: Check[];
  kind: string | null;
}

function plan111(source: Extract<SedeSource, { model: '111' }>, d: Declarant): Plan {
  const v = boxesOf(source.result.boxes);
  const debit = resultOf(source) === 'pay' && d.iban.trim() !== '';
  const kind = kindOf(resultOf(source), debit);
  const checks = [
    sumCheck(
      v,
      '28',
      Object.fromEntries(
        ['03', '06', '09', '12', '15', '18', '21', '24', '27'].map((b) => [b, 1 as const])
      )
    ),
    sumCheck(v, '30', { '28': 1, '29': -1 }),
  ].filter((c): c is Check => c !== null);
  // Professionals: 15 % in general, 7 % in their first years (LIRPF art. 101.5; RIRPF art. 95).
  const base = get(v, '08');
  const rate = base > 0 ? (get(v, '09') * 100) / base : null;
  if (rate !== null && (rate < 6.5 || rate > 15.5))
    checks.push(warn('rate111', { rate: Math.round(rate * 100) / 100 }));
  const puts = ident(d, source.year, source.quarter, kind);
  if (debit) puts.push([553, 34, normalIban(d.iban)]);
  return { tags: ['01000'], values: record(v), fills: [{ tag: '01000', puts }], checks, kind };
}

function plan115(source: Extract<SedeSource, { model: '115' }>, d: Declarant): Plan {
  const v = boxesOf(source.result.boxes);
  const debit = resultOf(source) === 'pay' && d.iban.trim() !== '';
  const kind = kindOf(resultOf(source), debit);
  const checks = [sumCheck(v, '05', { '03': 1, '04': -1 })].filter((c): c is Check => c !== null);
  // 19 % of the rent (LIRPF art. 101.8; RIRPF art. 100); 60 % less in Ceuta and Melilla.
  const base = get(v, '02');
  const rate = base > 0 ? (get(v, '03') * 100) / base : null;
  if (rate !== null && Math.abs(rate - 19) > 0.5)
    checks.push(warn('rate115', { rate: Math.round(rate * 100) / 100 }));
  const puts = ident(d, source.year, source.quarter, kind);
  if (debit) puts.push([206, 34, normalIban(d.iban)]);
  return { tags: ['01000'], values: record(v), fills: [{ tag: '01000', puts }], checks, kind };
}

function plan130(source: Extract<SedeSource, { model: '130' }>, d: Declarant): Plan {
  const { draft } = source;
  const v = boxesOf(draft.irpf.boxes);
  const result = resultOf(source);
  const debit = result === 'pay' && d.iban.trim() !== '';
  const kind = kindOf(result, debit);
  const checks = [
    sumCheck(v, '03', { '01': 1, '02': -1 }),
    sumCheck(v, '07', { '04': 1, '05': -1, '06': -1 }),
    sumCheck(v, '14', { '12': 1, '13': -1 }),
    sumCheck(v, '17', { '14': 1, '15': -1, '16': -1 }),
    sumCheck(v, '19', { '17': 1, '18': -1 }),
  ].filter((c): c is Check => c !== null);
  if (!draft.irpf.required) checks.push(error('not130'));
  const puts = ident(d, draft.year, draft.quarter, kind);
  if (debit) puts.push([446, 34, normalIban(d.iban)]);
  return { tags: ['01000'], values: record(v), fills: [{ tag: '01000', puts }], checks, kind };
}

/**
 * The 131 (DR131_2026.xlsx): the boxes, the activity on page 1 and its data on page DPA; the kind
 * follows note 1 of page 1 (I, U by direct debit, B to deduct in 1T-3T, N otherwise).
 */
function plan131(source: Extract<SedeSource, { model: '131' }>, d: Declarant): Plan {
  const v = boxesOf(source.result.boxes);
  const result = resultOf(source);
  const debit = result === 'pay' && d.iban.trim() !== '';
  const kind = kindOf(result, debit);
  const checks = [
    sumCheck(v, '07', { '02': 1, '04': 1, '06': 1 }),
    sumCheck(v, '10', { '07': 1, '08': -1, '09': -1 }),
    sumCheck(v, '13', { '10': 1, '11': -1, '12': -1 }),
    sumCheck(v, '15', { '13': 1, '14': -1 }),
  ].filter((c): c is Check => c !== null);
  const puts = [
    ...ident(d, source.year, source.quarter, kind),
    ...page131(source.modules, source.result),
  ];
  const tags = ['01000', 'DPA00'];
  const fills: PageFill[] = [
    { tag: '01000', puts },
    { tag: 'DPA00', puts: dpa131(source.modules) },
  ];
  if (debit) {
    tags.push('DID00');
    fills.push({ tag: 'DID00', puts: [[12, 34, normalIban(d.iban)]] });
  }
  return { tags, values: record(v), fills, checks, kind };
}

/** The 303 of the simplified regime only: pages 1, 2 and 3 (and DID for a debit or a refund). */
function plan303s(
  source: Extract<SedeSource, { model: '303'; simplified: VatSimplifiedResult }>,
  d: Declarant
): Plan {
  const v = boxesOf(source.simplified.boxes);
  const result = resultOf(source);
  const iban = d.iban.trim() !== '';
  const kind = kindOf(result, result === 'pay' && iban);
  const last = source.quarter === 4;
  const checks: Check[] = [
    sumCheck(v, '58', { '54': 1, '57': -1 }),
    sumCheck(v, '69', { '66': 1, '78': -1 }),
  ].filter((c): c is Check => c !== null);
  const page1: Put[] = [
    [13, 1, kind],
    [14, 9, normalNif(d.nif)],
    [23, 80, `${d.surname} ${d.name}`],
    [103, 4, source.year],
    [107, 2, `${source.quarter}T`],
    [109, 1, '2'],
    [110, 1, '2'],
    // Only the simplified regime (note 5 of page 1).
    [111, 1, '1'],
    [112, 1, '2'],
    [113, 1, '2'],
    [114, 1, '2'],
    [115, 1, '2'],
    [116, 1, '2'],
    [117, 1, '2'],
    [127, 1, '2'],
    // Exonerated from the 390 (only the simplified regime, quarterly): said in the last period.
    [128, 1, last ? '1' : '0'],
    [129, 1, '0'],
    [130, 1, '0'],
  ];
  const fills = fills303s(page1, page303s(source.activity, source.simplified, last));
  const tags = ['01000', '02000', '03000'];
  if (iban && (result === 'pay' || result === 'refund')) {
    tags.push('DID00');
    fills.push({
      tag: 'DID00',
      puts: [
        [23, 34, normalIban(d.iban)],
        [194, 1, '1'],
      ],
    });
  }
  return { tags, values: record(v), fills, checks, kind };
}

/** Boxes the app shows on its 303 that the 2026 form does not have («a compensar», «a devolver»). */
const APP_ONLY_303 = ['72', '73'];

function checks303(draft: AutonomoDraft, v: Map<string, number>): Check[] {
  const checks: Check[] = [];
  // DR303e26v101: «Este Diseño de Registro deber ser utilizado para las presentaciones a partir del
  // ejercicio 2026» (sheet DP30300, nota 4).
  if (draft.year < 2026) checks.push(error('design303'));
  const sums = [
    sumCheck(v, '46', { '27': 1, '45': -1 }),
    sumCheck(v, '69', { '66': 1, '77': 1, '78': -1, '68': 1, '108': 1 }),
    sumCheck(v, '71', { '69': 1, '70': -1, '109': 1, '112': -1 }),
  ];
  checks.push(...sums.filter((c): c is Check => c !== null));
  // 303 ↔ 349: intra-EU supplies (59) and acquisitions (10) go also to the 349 of the period.
  if (!draft.m349?.required && (get(v, '59') > 0 || get(v, '10') > 0)) checks.push(warn('no349'));
  return checks;
}

const yesNo = (yes: boolean): string => (yes ? '1' : '2');

/** Page 1, positions 109-130: «1» yes, «2» no, «3» only the general regime; notes 3, 4, 6 and 8. */
function flags303(v: Map<string, number>, last: boolean): Put[] {
  const cash = get(v, '62') !== 0 || get(v, '63') !== 0;
  const cashBuyer = get(v, '74') !== 0 || get(v, '75') !== 0;
  return [
    [109, 1, '2'],
    [110, 1, '2'],
    [111, 1, '3'],
    [112, 1, '2'],
    [113, 1, yesNo(cash)],
    [114, 1, yesNo(cashBuyer)],
    [115, 1, '2'],
    [116, 1, '2'],
    [117, 1, '2'],
    [127, 1, '2'],
    // Exonerated from the 390: «0» before the last period; the app does not file exonerated ones.
    [128, 1, last ? '2' : '0'],
    [129, 1, '0'],
    [130, 1, '0'],
  ];
}

function plan303(
  source: Extract<SedeSource, { model: '303'; draft: AutonomoDraft }>,
  d: Declarant
): Plan {
  const { draft } = source;
  const { accrued, deductible, settlement, info = [] } = draft.vat;
  const v = boxesOf([...accrued, ...deductible, ...info, ...settlement]);
  for (const b of APP_ONLY_303) v.delete(b);
  const result = resultOf(source);
  const iban = d.iban.trim() !== '';
  const kind = kindOf(result, result === 'pay' && iban);
  const checks = checks303(draft, v);
  const page1: Put[] = [
    [13, 1, kind],
    [14, 9, normalNif(d.nif)],
    [23, 80, `${d.surname} ${d.name}`],
    [103, 4, draft.year],
    [107, 2, `${draft.quarter}T`],
    ...flags303(v, draft.quarter === 4),
  ];
  const page3: Put[] = result === 'noActivity' ? [[425, 1, 'X']] : [];
  const tags = ['01000', '03000'];
  const fills: PageFill[] = [
    { tag: '01000', puts: page1 },
    { tag: '03000', puts: page3 },
  ];
  // The account goes on page DID, both to pay by direct debit and to receive a refund (mark 1: Spain).
  if (iban && (result === 'pay' || result === 'refund')) {
    tags.push('DID00');
    fills.push({
      tag: 'DID00',
      puts: [
        [23, 34, normalIban(d.iban)],
        [194, 1, '1'],
      ],
    });
  }
  return { tags, values: record(v), fills, checks, kind };
}

const iaeOf = (d: Declarant): string => d.iae.replace(/\D/g, '');
const activityCodeOf = (d: Declarant): string => d.activityCode.trim().toUpperCase();

function activityChecks(d: Declarant, year: number): Check[] {
  const checks: Check[] = [];
  // The design of 2025 is the last one published (dr390e2025.xlsx); that of 2026 is NO CONFIRMADO.
  if (year !== 2025) checks.push(warn('design390', { year }));
  if (blank(d.activity)) checks.push(error('activityMissing'));
  if (!/^[A-Z]\d{2}$/.test(activityCodeOf(d))) checks.push(error('activityCode'));
  if (!/^\d{3,4}$/.test(iaeOf(d))) checks.push(error('iae'));
  return checks;
}

/** The warnings of the annual summary worked out by the app, as checks of its file. */
const warnings390 = (m390: Draft390): Check[] =>
  m390.warnings.map((w) => {
    if (w.code === 'filedDiffers')
      return warn('filed390', { quarter: w.quarter ?? 0, difference: w.difference ?? 0 });
    if (w.code === 'identity')
      return warn('identity390', { expected: w.expected ?? 0, got: w.got ?? 0 });
    return warn('exonerated390');
  });

/**
 * Page 1 [dr390e2025.xlsx, «Pág. 1»]: «0» no / «1» yes for the group and the monthly refund;
 * «1» yes / «2» no for insolvency and cash accounting; 133-134 «0»: not a substitute return.
 */
function page1of390(d: Declarant, v: Map<string, number>, year: number): Put[] {
  const cash = get(v, '654') !== 0 || get(v, '643') !== 0;
  return [
    [14, 9, normalNif(d.nif)],
    [23, 60, d.surname],
    [83, 20, d.name],
    [103, 4, year],
    [109, 1, '0'],
    [110, 1, '0'],
    [118, 1, '0'],
    [119, 1, '0'],
    [120, 1, '0'],
    [130, 1, '2'],
    [131, 1, yesNo(cash)],
    [132, 1, yesNo(get(v, '656') !== 0)],
    [148, 40, d.activity],
    [188, 3, activityCodeOf(d)],
    [191, 4, iaeOf(d)],
    [430, 1, d.thirdParties ? '1' : '0'],
  ];
}

function plan390(source: Extract<SedeSource, { model: '390' }>, d: Declarant): Plan {
  const { draft, m390 } = source;
  const v = boxesOf(m390.sections);
  const values: Record<string, BoxValue> = record(v);
  const checks: Check[] = [...activityChecks(d, draft.year), ...warnings390(m390)];
  if (v.has('118')) {
    // Prorrata: CNAE (114) and kind (117: «G» general, the one the app works out).
    if (!/^[A-Z0-9]{3}$/i.test(d.cnae.trim())) checks.push(error('cnae'));
    values['114'] = d.cnae.trim();
    values['117'] = 'G';
  }
  // Page 7 (specific operations, prorrata) only with content; page 2 bis holds the total 47.
  const tags = ['01000', '02000', '02B00', '03000', '04000', '06000'];
  const specific = ['230', '109', '231', '232', '111', '113', '523', '654', '655', '656', '657'];
  if ([...specific, '115', '116', '118'].some((b) => get(v, b) !== 0)) tags.push('07000');
  const fills = [{ tag: '01000', puts: page1of390(d, v, draft.year) }];
  return { tags, values, fills, checks, kind: null };
}

/** An operator of the 349: a VAT number of an EU State, a name and a positive amount. */
function operatorChecks(o: { vatId: string; name: string; base: number }): Check[] {
  const checks: Check[] = [];
  if (!vatIdShapeOk(o.vatId))
    checks.push(error('vatId', { name: o.name || '—', vatId: o.vatId || '—' }));
  if (blank(o.name)) checks.push(error('operatorName', { vatId: o.vatId }));
  if (o.base < 0) checks.push(error('negative349', { vatId: o.vatId }));
  return checks;
}

function plan349Checks(m349: Draft349, d: Declarant): Check[] {
  const checks: Check[] = [];
  if (m349.monthly) checks.push(error('monthly349'));
  checks.push(...contactChecks(d));
  checks.push(...[...m349.operators, ...m349.rectifications].flatMap(operatorChecks));
  // 303 ↔ 349: the supplies must be box 59 and the acquisitions box 10 of the same period.
  const coherence = m349.warnings.filter((w) => w.code === 'vs59' || w.code === 'vs10');
  checks.push(
    ...coherence.map((w) => warn(w.code, { expected: w.expected ?? 0, got: w.got ?? 0 }))
  );
  return checks;
}

const fileName = (d: Declarant, model: SedeModel, year: number, period: string): string =>
  `${normalNif(d.nif)}${year}${period}.${model}`;

/** How a file is written once its checks pass: its period, its kind and the writer. */
export interface Writer {
  checks: Check[];
  kind: string | null;
  period: string;
  /** Writes the text; it may add warnings to `checks` (boxes left out). */
  write: (checks: Check[]) => string;
}

function writer349(source: Extract<SedeSource, { model: '349' }>, d: Declarant): Writer {
  const { year, quarter } = source.draft;
  const period = `${quarter}T`;
  const head = {
    year,
    period,
    nif: d.nif,
    name: `${d.surname} ${d.name}`,
    phone: d.phone,
    contact: d.contact,
    id: declarationId(year, quarter),
  };
  return {
    checks: plan349Checks(source.m349, d),
    kind: null,
    period,
    write: () => write349(head, source.m349),
  };
}

type SelfModel = '111' | '115' | '130' | '131' | '303' | '390';

function writerSelf(source: Extract<SedeSource, { model: SelfModel }>, d: Declarant): Writer {
  const plans = {
    '111': plan111,
    '115': plan115,
    '130': plan130,
    '131': plan131,
    '303': 'simplified' in source ? plan303s : plan303,
    '390': plan390,
  };
  const p = (plans[source.model] as (s: SedeSource, d: Declarant) => Plan)(source, d);
  const quarter = 'quarter' in source ? source.quarter : source.draft.quarter;
  const period = source.model === '390' ? '0A' : `${quarter}T`;
  const envelope = { model: source.model, year: yearOf(source), period };
  return {
    checks: p.checks,
    kind: p.kind,
    period: envelope.period,
    write: (checks) => {
      const out = writeSelfAssessment(envelope, p.tags, p.values, p.fills);
      for (const box of out.unplaced) checks.push(warn('unplaced', { box }));
      return out.text;
    },
  };
}

function writerOf(source: SedeSource, d: Declarant): Writer {
  if (source.model === '349') return writer349(source, d);
  if (source.model === '190' || source.model === '180' || source.model === '347')
    return planInformative(source, d);
  return writerSelf(source, d);
}

/** The file of a form and the checks; no file when a check is an error. */
export function buildSedeFile(source: SedeSource, d: Declarant): Built {
  const year = yearOf(source);
  const w = writerOf(source, d);
  const checks = [...declarantChecks(d, resultOf(source)), ...w.checks];
  if (checks.some((c) => c.level === 'error')) return { file: null, checks, kind: w.kind };
  return guarded(checks, w.kind, () => makeFile(d, source.model, year, w.period, w.write(checks)));
}

/** Writes the file; a value that does not fit its field is an error, not a broken file. */
function guarded(checks: Check[], kind: string | null, write: () => SedeFile): Built {
  try {
    return { file: write(), checks, kind };
  } catch (e) {
    if (!(e instanceof FieldError)) throw e;
    checks.push({ level: 'error', code: e.code, values: { pos: e.pos, box: e.box ?? '—' } });
    return { file: null, checks, kind };
  }
}

function makeFile(
  d: Declarant,
  model: SedeModel,
  year: number,
  period: string,
  text: string
): SedeFile {
  return {
    model,
    year,
    period,
    fileName: fileName(d, model, year, period),
    text,
    bytes: latin1(text),
  };
}
