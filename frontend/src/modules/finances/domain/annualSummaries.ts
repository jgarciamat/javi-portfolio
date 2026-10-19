import { supplierKey, type ImportedInvoice } from './invoiceLedger';
import { figuresFor } from './fiscalFigures';
import type { TaxBox } from './types';
import { payeeKeys, retentionOf, roleOf, type WithholdingQuarter } from './withholdings';

/**
 * The yearly summaries of a self-employed person, worked out on the device from the invoices of the
 * year and what was typed in the quarters: the modelo 190 (the withholdings of the 111), the 180
 * (those of the 115) and the 347 (operations with one person or company above 3,005.06 euros).
 *
 * Sources (checked on 19 October 2026):
 * - [I190] Instructions of the 190 for 2025, «Resumen de la declaración», boxes 01-03:
 *   https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI10/Instrucciones/instr_mod190_es_es.pdf
 *   Key G (professional activities), subkey 01 with the general rate of RIRPF art. 95.1 and 03 for
 *   those starting their activity; one record for each payee, key and subkey.
 * - [DR180] Record design of the 180 (2023): one record per landlord with the base without VAT, the
 *   last rate, the withholdings and the situation and land registry reference of the premises; the
 *   summary adds the bases and the withholdings.
 *   https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_23/DR_Mod_180_2023.pdf
 * - [RGAT] Real Decreto 1065/2007, arts. 31-35, https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984 :
 *   the 347 by person and year, purchases (key A) and sales (key B) apart, broken down by quarter
 *   (33.1), VAT included (34.2.a; «IVA incluido» in the AEAT folleto, 8.2), net of credit notes
 *   (34.2); without imports and exports (33.2.g) nor what another declaration with the same content
 *   gives (33.2.i: the intra-EU operations of the 349); the rent of business premises apart (34.1.d).
 *
 * NO CONFIRMADO: whether invoices with an IRPF withholding (already in the 190 or the 180) leave the
 * 347. Neither the RGAT nor the AEAT instructions say it: they stay in and are flagged.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (list: number[]) => round2(list.reduce((s, n) => s + n, 0));
const box = (id: string, label: string, amount: number): TaxBox => ({ box: id, label, amount });

/** A payee of the 190 or the 180: from the invoices (with tax id when the book has it) or typed by hand. */
export interface PayeeRecord {
  nif: string | null;
  name: string;
  /** 190: A employees, G professionals. 180: none. */
  key: 'A' | 'G' | null;
  /** 190, key G: 01 general rate (15 %), 03 starting activity (7 %); null when the rates are mixed. */
  subkey: '01' | '03' | null;
  paid: number;
  /** Pay in kind (190, key A). */
  inKind: number;
  withheld: number;
  /** The last rate used (180). */
  rate: number | null;
  /** Totals typed by hand in the quarters: they have no person behind them. */
  typed: boolean;
}

export type SummaryWarning =
  /** A payee of the invoices without tax id: the form needs it. */
  | { code: 'nif'; who: string }
  /** Totals typed by hand: the form needs them person by person. */
  | { code: 'typed'; part: 'staff' | 'pros' | 'rent' }
  /** 180: the land registry reference of the premises is not kept by the app. */
  | { code: 'cadastre' }
  /** 190: a professional with rates that are neither all 15 % nor all 7 %. */
  | { code: 'subkey'; who: string };

export interface YearSummary {
  model: '190' | '180';
  records: PayeeRecord[];
  boxes: TaxBox[];
  warnings: SummaryWarning[];
}

/** The quarters the invoices count in: a filed 111 or 115 stands for its quarter (as in withholdingsFor). */
function received(invoices: ImportedInvoice[], skip: (q: number) => boolean) {
  return invoices.filter((i) => i.book === 'received' && !i.excluded && !skip(i.quarter));
}

/** One record per payee of the invoices: their base, their withholding and the rates used. */
function invoicePayees(list: ImportedInvoice[], all: ImportedInvoice[]) {
  const keyOf = payeeKeys(all.filter((i) => i.book === 'received'));
  const payees = new Map<string, { nif: string | null; name: string; items: ImportedInvoice[] }>();
  for (const i of [...list].sort((a, b) => a.date.localeCompare(b.date))) {
    const k = keyOf(i);
    const p = payees.get(k) ?? { nif: null, name: i.concept, items: [] };
    p.nif = p.nif ?? i.nif ?? null;
    p.items.push(i);
    payees.set(k, p);
  }
  return [...payees.values()].map((p) => ({
    ...p,
    paid: sum(p.items.map((i) => i.base)),
    withheld: sum(p.items.map(retentionOf)),
    rates: p.items.map((i) => (i.base === 0 ? 0 : round2((retentionOf(i) / i.base) * 100))),
  }));
}

const nifWarnings = (records: PayeeRecord[]): SummaryWarning[] =>
  records.filter((r) => !r.typed && r.nif === null).map((r) => ({ code: 'nif', who: r.name }));

/**
 * The modelo 190 of the year: the professionals of the received invoices with a withholding (key G),
 * then the totals typed by hand for employees (key A) and professionals; boxes 01-03 [I190].
 */
export function summary190(
  year: number,
  invoices: ImportedInvoice[],
  quarters: WithholdingQuarter[]
): YearSummary {
  const rates = figuresFor(year)?.withholding;
  const list = received(invoices, (q) => quarters[q - 1]?.filed111).filter(
    (i) => roleOf(i) === 'professional' && retentionOf(i) !== 0
  );
  const records: PayeeRecord[] = invoicePayees(list, invoices).map((p) => {
    const all = (rate: number | undefined) =>
      p.rates.every((r) => Math.abs(r - (rate ?? -1)) < 0.05);
    const subkey = all(rates?.professional) ? '01' : all(rates?.starting) ? '03' : null;
    return { nif: p.nif, name: p.name, key: 'G', subkey, paid: p.paid, inKind: 0, ...withheld(p) };
  });
  const staff = quarters.map((q) => q.staff);
  const typed: PayeeRecord[] = [];
  if (staff.some((s) => s.paid + s.kindPaid + s.withheld + s.kindWithheld > 0)) {
    typed.push({
      ...TYPED,
      key: 'A',
      paid: sum(staff.map((s) => s.paid)),
      inKind: sum(staff.map((s) => s.kindPaid)),
      withheld: sum(staff.flatMap((s) => [s.withheld, s.kindWithheld])),
    });
  }
  const pros = quarters.map((q) => q.pros);
  if (pros.some((p) => p.paid + p.withheld > 0)) {
    typed.push({
      ...TYPED,
      key: 'G',
      subkey: null,
      paid: sum(pros.map((p) => p.paid)),
      withheld: sum(pros.map((p) => p.withheld)),
    });
  }
  const all = [...records, ...typed];
  return {
    model: '190',
    records: all,
    boxes: [
      box('01', 'Número total de percepciones', all.length),
      box('02', 'Importe total de las percepciones', sum(all.flatMap((r) => [r.paid, r.inKind]))),
      box('03', 'Total retenciones e ingresos a cuenta', sum(all.map((r) => r.withheld))),
    ],
    warnings: [
      ...nifWarnings(all),
      ...records
        .filter((r) => r.subkey === null)
        .map((r) => ({ code: 'subkey' as const, who: r.name })),
      ...typed.map(
        (r) => ({ code: 'typed' as const, part: r.key === 'A' ? 'staff' : 'pros' } as const)
      ),
    ],
  };
}

const TYPED: PayeeRecord = {
  nif: null,
  name: '',
  key: null,
  subkey: null,
  paid: 0,
  inKind: 0,
  withheld: 0,
  rate: null,
  typed: true,
};

const withheld = (p: { withheld: number }) => ({ withheld: p.withheld, rate: null, typed: false });

/** The modelo 180 of the year: one record per landlord, then what was typed by hand [DR180]. */
export function summary180(
  year: number,
  invoices: ImportedInvoice[],
  quarters: WithholdingQuarter[]
): YearSummary {
  const list = received(invoices, (q) => quarters[q - 1]?.filed115).filter(
    (i) => roleOf(i) === 'rent' && retentionOf(i) !== 0
  );
  const records: PayeeRecord[] = invoicePayees(list, invoices).map((p) => ({
    ...TYPED,
    nif: p.nif,
    name: p.name,
    paid: p.paid,
    withheld: p.withheld,
    // The record takes the last rate used in the year.
    rate: p.rates[p.rates.length - 1],
    typed: false,
  }));
  const rent = quarters.map((q) => q.rent);
  const typed: PayeeRecord[] = rent.some((r) => r.paid + r.withheld > 0)
    ? [
        {
          ...TYPED,
          paid: sum(rent.map((r) => r.paid)),
          withheld: sum(rent.map((r) => r.withheld)),
          rate: figuresFor(year)?.withholding.rent ?? null,
        },
      ]
    : [];
  const all = [...records, ...typed];
  return {
    model: '180',
    records: all,
    // The 180 has no numbered boxes in the summary of its record design: they are named.
    boxes: [
      box('', 'Número total de perceptores', all.length),
      box('', 'Base retenciones e ingresos a cuenta', sum(all.map((r) => r.paid))),
      box('', 'Retenciones e ingresos a cuenta', sum(all.map((r) => r.withheld))),
    ],
    warnings: [
      ...nifWarnings(all),
      ...(typed.length > 0 ? [{ code: 'typed' as const, part: 'rent' as const }] : []),
      ...(all.length > 0 ? [{ code: 'cadastre' as const }] : []),
    ],
  };
}

// ─── Modelo 347 ──────────────────────────────────────────────────────────────

/** Operations that another form reports or that the 347 leaves out [RGAT 33.2.g and i]. */
const OUT_347 = new Set(['intraEU', 'export', 'intraGoods', 'intraServices', 'import']);

export interface Record347 {
  /** A purchases, B sales. */
  key: 'A' | 'B';
  nif: string | null;
  name: string;
  /** VAT included, net of credit notes. */
  total: number;
  quarters: [number, number, number, number];
  /** The rent of business premises: reported apart [RGAT 34.1.d]. */
  premises: boolean;
  /** Some of its invoices carry an IRPF withholding (NO CONFIRMADO whether they belong here). */
  withheld: boolean;
  /** Domestic reverse charge (LIVA 84.Uno.2.º), reported apart [RGAT 34.1.k]. */
  reverse: boolean;
}

export type Warning347 =
  | { code: 'nif'; who: string }
  | { code: 'withheld'; who: string }
  /** Services to a client abroad not subject to Spanish VAT: whether they go in is NO CONFIRMADO. */
  | { code: 'notSubject'; who: string };

export interface Summary347 {
  /** The figures of the year are confirmed; false when the app has none for it. */
  known: boolean;
  threshold: number;
  records: Record347[];
  boxes: TaxBox[];
  warnings: Warning347[];
  /** Invoices left out because another form reports them (intra-EU, imports, exports). */
  left: number;
}

const amountOf347 = (i: ImportedInvoice) => round2(i.base + i.vat);

/**
 * The modelo 347 of the year: by person or company (tax id, or the name when the book has none) and
 * by key, the ones above the threshold, with the four quarters. A person who files the VAT books
 * through the SII does not file it (AEAT folleto 8.2): the app does not know it, the screen says so.
 */
export function summary347(year: number, invoices: ImportedInvoice[]): Summary347 {
  const figures = figuresFor(year);
  const threshold = figures?.m347.threshold ?? 3005.06;
  const inYear = invoices.filter((i) => !i.excluded && i.date.startsWith(String(year)));
  const counted = inYear.filter((i) => !OUT_347.has(i.op ?? 'domestic'));
  const keyOf = (i: ImportedInvoice) =>
    `${i.book}|${i.nif ? `nif:${i.nif}` : `name:${supplierKey(i.concept)}`}`;
  const groups = new Map<string, ImportedInvoice[]>();
  for (const i of counted) groups.set(keyOf(i), [...(groups.get(keyOf(i)) ?? []), i]);

  const records: Record347[] = [];
  const notSubject: string[] = [];
  for (const items of groups.values()) {
    const total = sum(items.map(amountOf347));
    if (total <= threshold) continue;
    const first = items[0];
    const quarters = [1, 2, 3, 4].map((q) =>
      sum(items.filter((i) => i.quarter === q).map(amountOf347))
    ) as Record347['quarters'];
    if (items.some((i) => i.op === 'notSubject')) notSubject.push(first.concept);
    records.push({
      key: first.book === 'received' ? 'A' : 'B',
      nif: items.find((i) => i.nif)?.nif ?? null,
      name: first.concept,
      total,
      quarters,
      premises: first.book === 'received' && items.some((i) => i.kind === 'rent'),
      withheld: items.some((i) => (i.book === 'issued' ? i.withheld : retentionOf(i)) !== 0),
      reverse: items.some((i) => i.op === 'reverse'),
    });
  }
  return {
    known: figures !== null,
    threshold,
    records,
    boxes: [
      box('', 'Número total de personas y entidades', records.length),
      box('', 'Importe total anual de las operaciones', sum(records.map((r) => r.total))),
    ],
    warnings: [
      ...records.filter((r) => r.nif === null).map((r) => ({ code: 'nif' as const, who: r.name })),
      ...records.filter((r) => r.withheld).map((r) => ({ code: 'withheld' as const, who: r.name })),
      ...notSubject.map((who) => ({ code: 'notSubject' as const, who })),
    ],
    left: inYear.length - counted.length,
  };
}
