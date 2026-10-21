/**
 * Case bank: the solved examples of the self-employed forms in docs/casos-practicos/oficiales.json
 * that the app's engine works out on the device (303 of the simplified regime, 347, 720, RETA and,
 * as support only, the 111, 115 and 190 of non-official sources), run with the figures of the source.
 * The cases of the 303 (general regime), 349 and 390 are checked in the backend
 * (backend/src/tests/domain/autonomo-vat-official.test.ts); the 130-02 (rendimiento neto of the
 * chapter 7 of the Manual de Renta 2025) in src/__tests__/finances/annualActivity.test.ts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ImportedInvoice } from '@modules/finances/domain/invoiceLedger';
import { summary190, summary347 } from '@modules/finances/domain/annualSummaries';
import {
  vatActivityFor,
  vatSimplified,
  type VatSimplifiedInput,
} from '@modules/finances/domain/vatSimplified';
import { wealthWarnings } from '@modules/finances/domain/wealthWarnings';
import { withholdingsFor, type WithholdingQuarter } from '@modules/finances/domain/withholdings';
import { retaQuote } from '@modules/tools/domain/retaCalc';

const BANK = join(__dirname, '..', '..', '..', '..', 'docs', 'casos-practicos');
interface Case {
  id: string;
  modelo: string;
  apartado: string;
  fuente: { oficial: boolean };
  resultados: { casilla: string | null; concepto: string; importe: number }[];
}
const cases = (JSON.parse(readFileSync(join(BANK, 'oficiales.json'), 'utf8')) as { casos: Case[] })
  .casos;

/** The figure of a case whose concept is `concept`, or starts with it (the source's own wording). */
const figure = (id: string, concept: string): number => {
  const c = cases.find((x) => x.id === id) as Case;
  const found =
    c.resultados.find((r) => r.concepto === concept) ??
    c.resultados.find((r) => r.concepto.startsWith(concept));
  return (found as Case['resultados'][0]).importe;
};
/** The figure of a box (casilla) of a case. */
const boxFigure = (id: string, casilla: string): number =>
  (cases.find((x) => x.id === id) as Case).resultados.find((r) => r.casilla === casilla)!.importe;

let n = 0;
/** An invented invoice: only the amounts and dates come from the case. */
const invoice = (over: Partial<ImportedInvoice>): ImportedInvoice => {
  const base = over.base ?? 1000;
  const vat = over.vat ?? Math.round(base * 21) / 100;
  return {
    id: `c${++n}`,
    book: 'received',
    kind: 'other',
    excluded: false,
    date: '2026-02-10',
    quarter: 1,
    base,
    vatRate: 21,
    vat,
    total: base + vat,
    withheld: 0,
    concept: 'Empresa Ficticia SL',
    ...over,
  };
};
const noTyped: WithholdingQuarter = {
  staff: { people: 0, paid: 0, withheld: 0, kindPeople: 0, kindPaid: 0, kindWithheld: 0 },
  pros: { people: 0, paid: 0, withheld: 0 },
  rent: { people: 0, paid: 0, withheld: 0 },
  filed111: false,
  filed115: false,
};

/**
 * The cafeteria (672.1) of the chapter 7 of the Manual práctico de IVA 2025, with the modules of the
 * Orden HAC/1347/2024 (annex II): 3 people, 20 kW, 5 tables and 2 type B machines at 1 January.
 */
const cafe = vatActivityFor('m44', 2025)!;
const cafeInput: VatSimplifiedInput = {
  year: 2025,
  quarter: 1,
  activity: cafe,
  unitsStart: [3, 20, 5, 0, 2, 0],
  unitsYear: [4.1, 20, 5, 0, 2, 0],
  reduction: 0,
  seasonDays: 0,
  shares: [1, 1, 1, 1],
  supported: 9330,
  compensationsPaid: 0,
  refundsAbroad: 0,
  intraAcquisitions: 0,
  fixedAssetSales: 0,
  reverseCharge: 0,
  fixedAssets: 0,
  investmentAdjust: 0,
  toOffset: 0,
  refund: false,
};
const boxOf = (r: ReturnType<typeof vatSimplified>, id: string) =>
  r.boxes.find((b) => b.box === id)!.amount;

const CHECKS: Record<string, () => void> = {
  '303-05': () => {
    expect(cafe).toMatchObject({ epigrafe: '672.1, 2 y 3', quarterly: 4, minimum: 13 });
    const q1 = vatSimplified(cafeInput);
    expect(q1.parts.C).toBe(boxFigure('303-05', 'C'));
    expect(q1.parts.F).toBe(boxFigure('303-05', 'F'));
    for (const id of ['47', '54', '58', '71']) expect(boxOf(q1, id)).toBe(boxFigure('303-05', id));
    // «Igual en 2T y 3T»: the same units at 1 January give the same ingreso a cuenta.
    expect(boxOf(vatSimplified({ ...cafeInput, quarter: 3 }), '71')).toBe(
      boxFigure('303-05', '71')
    );
  },
  '303-06': () => {
    // 4T: AIB of 2,500 € at 21 % (box 51 = 525) and fixed assets of 2,450 € at 21 % (box 55 = 514.50).
    const q4 = vatSimplified({
      ...cafeInput,
      quarter: 4,
      intraAcquisitions: 525,
      fixedAssets: 514.5,
    });
    for (const part of ['C', 'G', 'I', 'L', 'M'])
      expect(q4.parts[part]).toBe(boxFigure('303-06', part));
    for (const id of ['48', '49', '50', '51', '54', '55', '58', '71'])
      expect(boxOf(q4, id)).toBe(boxFigure('303-06', id));
    expect(q4.result).toBe('pay');
  },
  '347-01': () => {
    // A sale of 4,000 € in January cancelled by a credit note in the 4T of the same year: 0, not reported.
    const s = summary347(2026, [
      invoice({ book: 'issued', base: 4000, vat: 0, date: '2026-01-15' }),
      invoice({ book: 'issued', base: -4000, vat: 0, date: '2026-11-20', quarter: 4 }),
    ]);
    expect(s.records).toEqual([]);
    expect(s.boxes[1].amount).toBe(figure('347-01', 'Importe anual'));
  },
  '347-02': () => {
    // Year 1: 20,000 € in the 4T; year 2: a refund of 4,000 € in the 1T, reported with its sign
    // because its absolute value is above 3,005.06 € (AEAT FAQ of the 347, checked 2026-10-21).
    const sale = invoice({ book: 'issued', base: 20000, vat: 0, date: '2025-12-10', quarter: 4 });
    const refund = invoice({ book: 'issued', base: -4000, vat: 0, date: '2026-02-05' });
    const y1 = summary347(2025, [sale, refund]).records;
    const y2 = summary347(2026, [sale, refund]).records;
    expect(y1.map((r) => [r.key, r.total, r.quarters[3]])).toEqual([
      ['B', figure('347-02', 'Año 1'), figure('347-02', 'Año 1')],
    ]);
    expect(y2.map((r) => [r.key, r.total, r.quarters[0]])).toEqual([
      ['B', figure('347-02', 'Año 2'), figure('347-02', 'Año 2')],
    ]);
  },
  '347-03': () => {
    // (b) The tenant of business premises: key A, marked as the rent of premises, 10,000 € a year.
    const s = summary347(2026, [
      invoice({ kind: 'rent', base: 10000, vat: 0, concept: 'Arrendador Ficticio' }),
    ]);
    expect(s.records.map((r) => [r.key, r.premises, r.total])).toEqual([
      ['A', true, figure('347-03', '(b) Arrendatario')],
    ]);
    // (a) The amounts of the cash-accounting regime (2,500 and 1,500 €) are not worked out: see todo.
  },
  '347-04': () => {
    // The supplier invoices on 20 March (1T); the client records it on 30 April (2T): each one in its quarter.
    const supplier = summary347(2026, [
      invoice({ book: 'issued', base: 10000, vat: 0, date: '2026-03-20', quarter: 1 }),
    ]).records[0];
    const client = summary347(2026, [
      invoice({ base: 10000, vat: 0, date: '2026-04-30', quarter: 2 }),
    ]).records[0];
    expect([supplier.key, supplier.quarters[0]]).toEqual(['B', figure('347-04', 'Proveedor')]);
    expect([client.key, client.quarters[1]]).toEqual(['A', figure('347-04', 'Cliente')]);
  },
  '720-01': () => {
    // 31/12: 45,650 €; average of the 4T: 46,200.45 €. The maximum of the year (67,000 €) never counts.
    const value = Math.max(45650, 46200.45);
    expect(wealthWarnings({ year: 2026, abroad: { accounts: value } })).toEqual([]);
    // Cancelled the next year without a 720 ever filed: nothing to report (the same FAQ).
    expect(wealthWarnings({ year: 2026, abroad: {}, ended: ['accounts'] })).toEqual([]);
    expect(figure('720-01', 'Obligación')).toBe(0);
  },
  '720-02': () => {
    // A fund of 55,900 € and an account with an average of 58,900 € in the 4T (45,256 € at 31/12);
    // the flat sold in August is not reported (no 720 filed before).
    const w = wealthWarnings({
      year: 2026,
      abroad: { securities: 55900, accounts: Math.max(45256, 58900) },
      ended: ['realEstate'],
    });
    expect(w).toEqual([
      { model: '720', block: 'accounts', value: figure('720-02', 'Cuenta'), reason: 'first' },
      { model: '720', block: 'securities', value: figure('720-02', 'Fondo'), reason: 'first' },
    ]);
  },
  '720-03': () => {
    // Filed for 2012 with 55,000 € (average) and 57,000 € (31/12); the engine takes the larger one.
    const lastFiled = { accounts: 57000 };
    // 2013: +15,000 / +18,000: no new 720.
    expect(wealthWarnings({ year: 2026, abroad: { accounts: 75000 }, lastFiled })).toEqual([]);
    // 2014: +17,000 / +28,000: a new 720 for all the accounts.
    const rise = 85000 - lastFiled.accounts;
    expect(rise).toBe(figure('720-03', 'Incremento'));
    expect(wealthWarnings({ year: 2026, abroad: { accounts: 85000 }, lastFiled })).toEqual([
      { model: '720', block: 'accounts', value: 85000, reason: 'rise' },
    ]);
  },
  'RETA-01': () => {
    const q = retaQuote({ monthlyNet: 900 - 185, person: 'individual', flatRate: false });
    expect(900 - 185).toBe(figure('RETA-01', 'Rendimiento neto'));
    expect(q.deduction).toBe(figure('RETA-01', 'Deducción gastos genéricos'));
    expect(q.computable).toBe(figure('RETA-01', 'Rendimiento computable'));
  },
  'RETA-02': () => {
    const net = 4150 - 900 - 600 - 400 - 270;
    expect(net).toBe(figure('RETA-02', 'Rendimiento neto'));
    const q = retaQuote({ monthlyNet: net, person: 'individual', flatRate: false });
    expect(q.deduction).toBe(figure('RETA-02', 'Deducción gastos genéricos'));
    expect(q.computable).toBe(figure('RETA-02', 'Rendimiento computable'));
  },
  '111-01': () => {
    const r = withholdingsFor({
      year: 2026,
      quarter: 1,
      invoices: [invoice({ base: 800, vat: 168, retention: 120, concept: 'Fotógrafo Ficticio' })],
      data: noTyped,
      income: 5000,
    });
    for (const id of ['07', '08', '09', '28'])
      expect(r.m111.boxes.find((b) => b.box === id)!.amount).toBe(boxFigure('111-01', id));
    expect(r.warnings).toEqual([]);
  },
  '111-02': () => {
    const r = withholdingsFor({
      year: 2026,
      quarter: 1,
      invoices: [
        invoice({ base: 800, retention: 120, concept: 'Fotógrafo Ficticio Uno' }),
        // 7 %: a professional in the year they start or the two after (RIRPF art. 95.1).
        invoice({ base: 500, retention: 35, concept: 'Fotógrafo Ficticio Dos' }),
      ],
      data: noTyped,
      income: 5000,
    });
    for (const id of ['07', '08', '09', '28'])
      expect(r.m111.boxes.find((b) => b.box === id)!.amount).toBe(boxFigure('111-02', id));
    expect(r.warnings).toEqual([]);
  },
  '115-01': () => {
    // The original return with the right rate (19 %, LIRPF art. 101.8): boxes 01-03.
    const r = withholdingsFor({
      year: 2026,
      quarter: 1,
      invoices: [invoice({ kind: 'rent', base: 1000, retention: 190, concept: 'Local Ficticio' })],
      data: noTyped,
      income: 5000,
    });
    for (const id of ['01', '02', '03'])
      expect(r.m115.boxes.find((b) => b.box === id)!.amount).toBe(boxFigure('115-01', id));
    // Boxes 04-05 of the complementaria (150 € filed before, 40 € to pay) are not worked out: see todo.
  },
  '190-01': () => {
    // 15,000 € paid to a designer through the year with 15 %: key G, subkey 01.
    const invoices = [1, 2, 3, 4].map((q) =>
      invoice({
        base: 3750,
        retention: 562.5,
        date: `2025-0${q * 3 - 1}-10`,
        quarter: q as 1 | 2 | 3 | 4,
        nif: '00000001R',
        concept: 'Diseñador Ficticio',
      })
    );
    const s = summary190(2025, invoices, [noTyped, noTyped, noTyped, noTyped]);
    expect(s.records.map((r) => [r.key, r.subkey, r.paid, r.withheld])).toEqual([
      ['G', '01', figure('190-01', 'Perceptor'), figure('190-01', 'Retención')],
    ]);
  },
};

/** Why a case has no automatic check here. */
const TODO: Record<string, string> = {
  '303-01': 'régimen general: lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '303-02': 'régimen general: lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '303-03': 'régimen general: lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '303-04': 'régimen general: lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '390-01': 'lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '390-02': 'lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '349-01': 'lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '349-02': 'lo comprueba backend/src/tests/domain/autonomo-vat-official.test.ts',
  '130-01': 'fuente no oficial y con 05 incoherente (2T sin pago del 1T): solo estructura',
  '130-02':
    'rendimiento neto del cap. 7 del Manual de Renta 2025: src/__tests__/finances/annualActivity.test.ts',
};

describe('casos oficiales de autónomos (303 simplificado, 347, 720, RETA; 111, 115 y 190 de apoyo)', () => {
  const ours = cases.filter((c) => c.modelo !== '100');
  it('el catálogo tiene los 25 casos de autónomos', () => {
    expect(ours).toHaveLength(25);
    for (const id of Object.keys(CHECKS)) expect(ours.map((c) => c.id)).toContain(id);
  });
  for (const c of ours) {
    const label = `${c.id} · ${c.apartado}${c.fuente.oficial ? '' : ' (apoyo, no oficial)'}`;
    const check = CHECKS[c.id];
    if (check) it(label, check);
    else it.todo(`${label} — ${TODO[c.id]}`);
  }
  it.todo(
    '347-03 (a) — PENDIENTE: el importe por criterio de caja (art. 34.1 RGAT, 2.500 y 1.500 €) no se calcula'
  );
  it.todo(
    '115-01 complementaria — PENDIENTE: la casilla 04 (resultado de la declaración anterior) no se rellena'
  );
  it.todo(
    'RETA-01 y RETA-02, cuota de 2023 — PENDIENTE: la app solo tiene la tabla de 2026 (Orden PJC/297/2026)'
  );
});
