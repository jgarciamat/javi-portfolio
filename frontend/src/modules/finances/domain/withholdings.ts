import { supplierKey, type ImportedInvoice } from './invoiceLedger';
import { FIGURE_YEARS, figuresFor, type FiscalFigures } from './fiscalFigures';
import type { TaxBox } from './types';
import { businessDay } from './workingDays';

/**
 * The withholdings the person made as a payer, quarter by quarter: the modelo 111 (employees and
 * professionals) and the modelo 115 (the rent of premises). Worked out on the device, from the
 * received invoices with a withholding and the totals typed by hand, so it needs no draft of the plan.
 *
 * Sources (checked on 19 October 2026):
 * - Modelo 111, boxes 01-30 and who counts as a payee: AEAT instructions,
 *   https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/pagos-cuenta/modelo-111-reten_____moniales-imputaciones-renta-autoliquidacion_/instrucciones.html
 *   and its record layout (v1.8), .../static_files/Sede/Disenyo_registro/DR_100_199/archivos/dr111e16v18.xls
 * - Modelo 115, boxes 01-05: record layout .../Disenyo_registro/DR_100_199/archivos/DR115e15v13.xls
 *   and the order that approved it, https://www.boe.es/boe/dias/2000/11/28/pdfs/A41078-41132.pdf
 * - Rates and exemptions: RIRPF (Real Decreto 439/2007) arts. 75.3.g, 95.1, 100 and 101,
 *   https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820, and LIRPF art. 101.
 * - The complementaria (checked 22 October 2026): instructions of the 111, boxes 29 and 30 and
 *   «Complementaria» (box 29 = result of the form filed before for the same period; box 30 always
 *   positive; the 13-digit number of that form), the record designs (111: 538 «X», 539 number;
 *   115: 192 and 193, boxes 04 and 05 = 03 − 04) and LGT art. 122.2 (only when more is to be paid;
 *   otherwise a rectification, arts. 120.3 and 221.4),
 *   https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186
 * - Deadlines and the «negativa»: RIRPF art. 108.1 and the 2026 calendar of the AEAT,
 *   https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html
 *
 * Not modelled: prizes (13-18), forestry gains (19-24), image rights (25-27), activities paid in kind
 * (10-12) and the monthly filing of large companies.
 */

/** Which form the withholding of a received invoice goes to. */
export type WithholdingRole = 'none' | 'professional' | 'rent';

export interface StaffFigures {
  /** Employees paid in the quarter (each one once). */
  people: number;
  paid: number;
  withheld: number;
  /** Pay in kind: employees, value and the payments on account made for it. */
  kindPeople: number;
  kindPaid: number;
  kindWithheld: number;
}

/** Professionals or landlords typed by hand (not in the imported invoices). */
export interface PayeeFigures {
  people: number;
  /** The base of the withholding: what was paid, without VAT. */
  paid: number;
  withheld: number;
}

/** The form filed before for the same quarter, when this one is a complementaria. */
export interface PreviousFiling {
  /** Its result: box 30 of the 111, box 05 of the 115. */
  result: number;
  /** The 13-digit number printed next to its barcode (the receipt of the sede). */
  receipt: string;
}

export interface WithholdingQuarter {
  staff: StaffFigures;
  pros: PayeeFigures;
  rent: PayeeFigures;
  /** A filed modelo 111 / 115 was imported: its figures stand and the invoices do not add to them. */
  filed111: boolean;
  filed115: boolean;
  /** A complementaria of a form already filed for the quarter (older data: none). */
  previous111?: PreviousFiling | null;
  previous115?: PreviousFiling | null;
}

export type WithholdingWarning =
  /** The withholding of an invoice is not the rate the form expects (15 or 7 %, 19 %). */
  | { code: 'rate'; invoice: string; who: string; rate: number; expected: number[] }
  /** Rent of premises without withholding, above what the landlord can be paid without one. */
  | { code: 'rentNoRetention'; invoice: string; who: string; year: number }
  /** An invoice marked as a professional's with no withholding. */
  | { code: 'proNoRetention'; invoice: string; who: string }
  /** Amounts without the number of people they were paid to. */
  | { code: 'people'; part: 'staff' | 'pros' | 'rent' }
  /** More withheld than paid. */
  | { code: 'over'; part: 'staff' | 'pros' | 'rent' }
  /** Withholdings in a quarter without income: they are paid all the same. */
  | { code: 'noIncome' }
  /** A complementaria that does not pay more than the form filed before (LGT art. 122.2). */
  | { code: 'notHigher'; model: '111' | '115' };

export interface ModelResult {
  boxes: TaxBox[];
  /** The result of the form: what is paid to the Tax Agency. */
  due: number;
  /**
   * `none`: nothing paid that carries withholding, the form is not filed (RIRPF art. 108.1);
   * `zero`: paid but nothing withheld, a «negativa» is filed; `pay`: there is something to pay.
   */
  result: 'none' | 'zero' | 'pay';
  /** The form filed before, when this one is its complementaria. */
  previous?: PreviousFiling | null;
}

export interface Result111 extends ModelResult {
  staff: { people: number; withheld: number };
  pros: { people: number; withheld: number; base: number };
}

export interface Result115 extends ModelResult {
  people: number;
  base: number;
}

export interface WithholdingResult {
  quarter: 1 | 2 | 3 | 4;
  m111: Result111;
  m115: Result115;
  warnings: WithholdingWarning[];
}

/**
 * The rates and the rent exemption of a year (fiscalFigures.ts): RIRPF art. 95.1 (15 % for
 * professional activities; 7 % in the year they start and the two after, and for a few listed
 * activities), art. 100 and LIRPF art. 101.8 (19 % of the rent, VAT aside) and art. 75.3.g) 2.º (no
 * withholding when the year's rent to one landlord is 900 € or less). A year without figures takes
 * those of the latest one.
 */
function ratesOf(year: number) {
  const w = (
    figuresFor(year) ?? (figuresFor(FIGURE_YEARS[FIGURE_YEARS.length - 1]) as FiscalFigures)
  ).withholding;
  return { professional: [w.professional, w.starting], rent: w.rent, exemptUpTo: w.rentExemptUpTo };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The withholding of a received invoice, as corrected by the person or as the book says. */
export const retentionOf = (i: ImportedInvoice): number => i.retentionFix ?? i.retention ?? 0;

/** Where the withholding of a received invoice goes: what the person chose, or what its kind says. */
export function roleOf(i: ImportedInvoice): WithholdingRole {
  if (i.withholding) return i.withholding;
  if (retentionOf(i) === 0) return 'none';
  return i.kind === 'rent' ? 'rent' : 'professional';
}

/**
 * Each payee once: by tax id when the book has it (an invoice without it borrows the one of the same
 * name), otherwise by the normalised name. An invoice without either is a payee of its own.
 */
export function payeeKeys(invoices: ImportedInvoice[]): (i: ImportedInvoice) => string {
  const nifOfName = new Map<string, string>();
  for (const i of invoices) {
    const name = supplierKey(i.concept);
    if (i.nif && name && !nifOfName.has(name)) nifOfName.set(name, i.nif);
  }
  return (i) => {
    const name = supplierKey(i.concept);
    const nif = i.nif ?? nifOfName.get(name);
    if (nif) return `nif:${nif}`;
    return name ? `name:${name}` : `id:${i.id}`;
  };
}

/** True when the withholding is one of the rates on the base, give or take a cent of rounding. */
const fits = (base: number, held: number, rates: number[]) =>
  rates.some(
    (r) => Math.abs(Math.round(Math.abs(held) * 100) - Math.round(Math.abs(base) * r)) <= 1
  );

const rateOfInvoice = (base: number, held: number) =>
  Math.round((Math.abs(held) / Math.abs(base)) * 1000) / 10;

const box = (id: string, label: string, amount: number): TaxBox => ({ box: id, label, amount });

const resultOf = (payees: number, due: number): ModelResult['result'] =>
  due > 0 ? 'pay' : payees > 0 ? 'zero' : 'none';

/** The result less the form filed before (boxes 29-30 / 04-05); nothing to pay below zero. */
function complementOf(total: number, previous: PreviousFiling | null | undefined) {
  const before = previous ? previous.result : 0;
  const box = round2(total - before);
  return { before, box, due: Math.max(0, box), previous: previous ?? null };
}

/** The modelo 111 of the quarter: employees (01-06) and professionals (07-09), then the result. */
function form111(
  staff: StaffFigures,
  pros: Result111['pros'],
  previous?: PreviousFiling | null
): Result111 {
  const total = round2(staff.withheld + staff.kindWithheld + pros.withheld);
  const c = complementOf(total, previous);
  const boxes = [
    box('01', 'Rendimientos del trabajo dinerarios · N.º perceptores', staff.people),
    box('02', 'Rendimientos del trabajo dinerarios · Importe de las percepciones', staff.paid),
    box('03', 'Rendimientos del trabajo dinerarios · Importe de las retenciones', staff.withheld),
    box('04', 'Rendimientos del trabajo en especie · N.º perceptores', staff.kindPeople),
    box(
      '05',
      'Rendimientos del trabajo en especie · Valor percepciones en especie',
      staff.kindPaid
    ),
    box(
      '06',
      'Rendimientos del trabajo en especie · Importe de los ingresos a cuenta',
      staff.kindWithheld
    ),
    box('07', 'Actividades económicas dinerarios · N.º perceptores', pros.people),
    box('08', 'Actividades económicas dinerarios · Importe de las percepciones', pros.base),
    box('09', 'Actividades económicas dinerarios · Importe de las retenciones', pros.withheld),
    box('28', 'Suma retenciones e ingresos a cuenta', total),
    box('29', 'Resultado de anteriores declaraciones (complementaria)', c.before),
    box('30', 'Resultado a ingresar (28 - 29)', c.box),
  ];
  return {
    boxes,
    due: c.due,
    result: resultOf(staff.people + staff.kindPeople + pros.people, c.due),
    previous: c.previous,
    staff: {
      people: staff.people + staff.kindPeople,
      withheld: round2(staff.withheld + staff.kindWithheld),
    },
    pros,
  };
}

/** The modelo 115 of the quarter: the landlords, the base, the withholdings and the result. */
function form115(
  people: number,
  base: number,
  withheld: number,
  previous?: PreviousFiling | null
): Result115 {
  const c = complementOf(withheld, previous);
  const boxes = [
    box('01', 'Número perceptores', people),
    box('02', 'Base retenciones e ingresos a cuenta', base),
    box('03', 'Retenciones e ingresos a cuenta', withheld),
    box('04', 'Resultado de anteriores declaraciones (complementaria)', c.before),
    box('05', 'Resultado a ingresar (03 - 04)', c.box),
  ];
  return {
    boxes,
    due: c.due,
    result: resultOf(people, c.due),
    previous: c.previous,
    people,
    base,
  };
}

/** A complementaria must pay more than the form it completes (LGT art. 122.2). */
const notHigher = (model: '111' | '115', r: ModelResult): WithholdingWarning[] =>
  r.previous && r.due <= 0 ? [{ code: 'notHigher', model }] : [];

/** A rent of premises: by its kind or because the person sent its withholding to the 115. */
const isRent = (i: ImportedInvoice) =>
  roleOf(i) === 'rent' || (i.kind === 'rent' && i.withholding === undefined);

/** The checks of the invoices of the quarter. */
function invoiceWarnings(
  year: number,
  invoices: ImportedInvoice[],
  all: ImportedInvoice[],
  key: (i: ImportedInvoice) => string
): WithholdingWarning[] {
  const rates = ratesOf(year);
  // The rent of each landlord over the whole year: the exemption is per year and landlord.
  const yearly = new Map<string, number>();
  for (const i of all.filter(isRent))
    yearly.set(key(i), round2((yearly.get(key(i)) ?? 0) + i.base));
  return invoices.flatMap((i): WithholdingWarning[] => {
    const role = roleOf(i);
    const held = retentionOf(i);
    const who = i.concept;
    if (held === 0) {
      if (role === 'professional') return [{ code: 'proNoRetention', invoice: i.id, who }];
      return isRent(i) && (yearly.get(key(i)) as number) > rates.exemptUpTo
        ? [{ code: 'rentNoRetention', invoice: i.id, who, year }]
        : [];
    }
    const expected = role === 'rent' ? [rates.rent] : rates.professional;
    if (role === 'none' || i.base === 0 || fits(i.base, held, expected)) return [];
    return [{ code: 'rate', invoice: i.id, who, rate: rateOfInvoice(i.base, held), expected }];
  });
}

/** The checks of what was typed by hand. */
function typedWarnings(data: WithholdingQuarter): WithholdingWarning[] {
  const parts = [
    [
      'staff',
      data.staff.people + data.staff.kindPeople,
      data.staff.paid + data.staff.kindPaid,
      data.staff.withheld + data.staff.kindWithheld,
    ],
    ['pros', data.pros.people, data.pros.paid, data.pros.withheld],
    ['rent', data.rent.people, data.rent.paid, data.rent.withheld],
  ] as const;
  return parts.flatMap(([part, people, paid, withheld]): WithholdingWarning[] => [
    ...(people === 0 && paid + withheld > 0 ? [{ code: 'people' as const, part }] : []),
    ...(withheld > paid ? [{ code: 'over' as const, part }] : []),
  ]);
}

/**
 * The modelos 111 and 115 of a quarter. `invoices` are all the imported ones (the received ones of
 * the quarter that are not left out count); `income` is what the person billed in the quarter.
 */
export function withholdingsFor({
  year,
  quarter,
  invoices,
  data,
  income,
}: {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  invoices: ImportedInvoice[];
  data: WithholdingQuarter;
  income: number;
}): WithholdingResult {
  const received = invoices.filter((i) => i.book === 'received' && !i.excluded);
  const key = payeeKeys(received);
  const ofQuarter = received.filter((i) => i.quarter === quarter);
  const sum = (role: WithholdingRole, skip: boolean) => {
    const list = skip ? [] : ofQuarter.filter((i) => roleOf(i) === role && retentionOf(i) !== 0);
    return {
      people: new Set(list.map(key)).size,
      base: round2(list.reduce((s, i) => s + i.base, 0)),
      withheld: round2(list.reduce((s, i) => s + retentionOf(i), 0)),
    };
  };
  const pros = sum('professional', data.filed111);
  const rent = sum('rent', data.filed115);
  const m111 = form111(
    data.staff,
    {
      people: pros.people + data.pros.people,
      base: round2(pros.base + data.pros.paid),
      withheld: round2(pros.withheld + data.pros.withheld),
    },
    data.previous111
  );
  const m115 = form115(
    rent.people + data.rent.people,
    round2(rent.base + data.rent.paid),
    round2(rent.withheld + data.rent.withheld),
    data.previous115
  );
  const warnings = [
    // A filed form stands: the invoices it replaces are not checked.
    ...invoiceWarnings(
      year,
      ofQuarter.filter(
        (i) => !(data.filed111 && roleOf(i) === 'professional') && !(data.filed115 && isRent(i))
      ),
      received,
      key
    ),
    ...typedWarnings(data),
    ...(income === 0 && m111.due + m115.due > 0 ? [{ code: 'noIncome' as const }] : []),
    ...notHigher('111', m111),
    ...notHigher('115', m115),
  ];
  return { quarter, m111, m115, warnings };
}

/**
 * The last day to file the 111 and the 115 of a quarter: the 20th of the month after it (of January
 * for the fourth), moved past weekends and national holidays. The same rule as the draft's deadlines.
 */
export const withholdingDeadline = (year: number, quarter: 1 | 2 | 3 | 4): string =>
  quarter === 4 ? businessDay(year + 1, 1, 20) : businessDay(year, quarter * 3 + 1, 20);
