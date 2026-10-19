import { expensesByQuarter, incomeByQuarter, type BookKind } from '../../domain/invoiceBook';
import type { Quarter } from '../../domain/invoiceLedger';
import { priorFrom130, quarterFrom303, type TaxModelPdf } from '../../domain/taxModelPdf';
import { vatByQuarter, type QuarterVatOfBook } from '../../domain/vatBook';
import type { Key349 } from '../../domain/types';
import type { ManualForm } from './AutonomoManual';
import { SALES_FIELDS, emptyIntra, vatOfForm, type IntraRow, type VatForm } from './vatForm';

/** Supplier → kind of expense the person chose: the next imports start from it. */
export const KIND_PREFERENCES_KEY = 'mm_autonomo_kinds';
/** The person's own tax id and name, learnt from an invoice they said they issued (device only). */
export const ME_KEY = 'mm_autonomo_me';

/** Money as the form's text fields take it: no zeros left over, a dot for the decimals. */
const text = (n: number): string => (n === 0 ? '' : String(n));

/** Keys of the 349 that the received book brings (acquisitions); the others come with the issued one. */
const RECEIVED_KEYS: Key349[] = ['A', 'I'];

const rowOf = (o: QuarterVatOfBook['intra'][number]): IntraRow => ({
  ...emptyIntra(o.key),
  vatId: o.vatId,
  name: o.name,
  base: text(o.base),
});

/**
 * The VAT of a quarter with what a book gives replaced: the issued one brings the sales without
 * Spanish VAT, to retailers in the surcharge and under cash accounting, and its operations of the
 * 349; the received one its acquisitions of the 349 and its purchases under cash accounting. What
 * the person typed apart (corrections, the rare boxes) stays.
 */
function vatWithBook(vat: VatForm | undefined, book: BookKind, found?: QuarterVatOfBook): VatForm {
  const v = vatOfForm(vat);
  const ownKeys = (r: IntraRow) => RECEIVED_KEYS.includes(r.key) === (book === 'received');
  const intra = [...v.intra.filter((r) => !ownKeys(r)), ...(found?.intra ?? []).map(rowOf)];
  const cash = {
    r21: text(found?.cash.r21 ?? 0),
    r10: text(found?.cash.r10 ?? 0),
    r4: text(found?.cash.r4 ?? 0),
  };
  if (book === 'received') {
    return { ...v, intra, cash: { ...v.cash, purchasesInvoiced: cash } };
  }
  return {
    ...v,
    sales: Object.fromEntries(
      SALES_FIELDS.map((f) => [f, text(found?.sales[f] ?? 0)])
    ) as VatForm['sales'],
    re: {
      ...v.re,
      r21: text(found?.re.r21 ?? 0),
      r10: text(found?.re.r10 ?? 0),
      r4: text(found?.re.r4 ?? 0),
    },
    intra,
    cash: { ...v.cash, invoiced: cash },
  };
}

/**
 * The quarters of a book worked out again from its invoices (the ones not left out). Only the given
 * quarters change: the others may have been typed by hand. A quarter whose invoices are all left out
 * is emptied, as the person asked.
 */
export function applyInvoices(form: ManualForm, book: BookKind, quarters: Quarter[]): ManualForm {
  const used = form.invoices.filter((i) => i.book === book && !i.excluded);
  const income = incomeByQuarter(used);
  const expenses = expensesByQuarter(used, (i) => i.kind);
  const vat = vatByQuarter(used);
  return {
    ...form,
    quarters: form.quarters.map((quarter, index) => {
      const q = (index + 1) as Quarter;
      if (!quarters.includes(q)) return quarter;
      if (book === 'issued') {
        const sums = income[q] ?? { r21: 0, r10: 0, r4: 0, r0: 0, withheld: 0 };
        return {
          ...quarter,
          income: {
            r21: text(sums.r21),
            r10: text(sums.r10),
            r4: text(sums.r4),
            r0: text(sums.r0),
          },
          withheld: text(sums.withheld),
          vat: vatWithBook(quarter.vat, book, vat[q]),
        };
      }
      return {
        ...quarter,
        expenses: (expenses[q] ?? []).map((l) => ({
          kind: l.kind,
          amount: text(l.amount),
          vatRate: l.vatRate,
          days: l.days === null ? '' : String(l.days),
          ...(l.op ? { op: l.op } : {}),
          ...(l.investment ? { investment: true } : {}),
        })),
        vat: vatWithBook(quarter.vat, book, vat[q]),
      };
    }),
  };
}

/** The quarters of each book that a change touched, worked out again. */
export function applyChanged(
  form: ManualForm,
  quarters: Partial<Record<BookKind, Quarter[]>>
): ManualForm {
  let next = form;
  for (const book of ['issued', 'received'] as const) {
    const changed = quarters[book];
    if (changed) next = applyInvoices(next, book, changed);
  }
  return next;
}

/** The modelo 130 of a quarter hands its totals to the next one: they become the «already filed» totals. */
export function applyModel130(
  form: ManualForm,
  data: TaxModelPdf,
  year: number,
  quarter: 1 | 2 | 3
): ManualForm {
  const prior = priorFrom130(data.boxes);
  return {
    ...form,
    prior: {
      on: true,
      income: text(prior.income),
      expenses: text(prior.expenses),
      payments: text(prior.payments),
      withheld: text(prior.withheld),
    },
    model130: { year, quarter, income: prior.income, expenses: prior.expenses },
  };
}

/**
 * The modelo 303 of a quarter gives its income by rate, its sales without Spanish VAT, its surcharge
 * and corrections, and its expenses by channel; its result is kept to reconcile the 390. The invoices
 * imported for that quarter no longer say what the form has, so they leave the review.
 */
export function applyModel303(form: ManualForm, data: TaxModelPdf, quarter: Quarter) {
  const found = quarterFrom303(data.boxes);
  const invoices = form.invoices.filter((i) => i.quarter !== quarter);
  const filed = [0, 1, 2, 3].map((i) => form.filed303?.[i] ?? null);
  filed[quarter - 1] = found.result;
  const quarters = form.quarters.map((q, i) => {
    if (i !== quarter - 1) return q;
    const v = vatOfForm(q.vat);
    const f = found.vat;
    return {
      ...q,
      income: {
        r21: text(found.income.r21),
        r10: text(found.income.r10),
        r4: text(found.income.r4),
        r0: text(found.income.r0),
      },
      expenses: found.expenses.map((l) => ({
        kind: 'other' as const,
        amount: text(l.amount),
        vatRate: l.vatRate,
        days: '',
        ...(l.op !== 'domestic' ? { op: l.op } : {}),
        ...(l.investment ? { investment: true } : {}),
      })),
      vat: {
        ...v,
        sales: { ...v.sales, ...mapText(f.sales) },
        re: mapText(f.re) as VatForm['re'],
        salesFix: { ...v.salesFix, base: text(f.salesFix.base), vat: text(f.salesFix.vat) },
        reFix: mapText(f.reFix) as VatForm['reFix'],
        deductionFix: mapText(f.deductionFix) as VatForm['deductionFix'],
        oneOff: mapText(f.oneOff) as VatForm['oneOff'],
      },
    };
  });
  return {
    form: { ...form, quarters, invoices, filed303: filed },
    found,
    dropped: form.invoices.length - invoices.length,
  };
}

const mapText = (values: Record<string, number>): Record<string, string> =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, text(v)]));

/** The operators of a filed 349 become the intra-EU operations of its quarter. */
export function applyModel349(form: ManualForm, data: TaxModelPdf, quarter: Quarter): ManualForm {
  const rows: IntraRow[] = (data.operators ?? []).map((o) => ({
    ...emptyIntra(o.key),
    vatId: o.vatId,
    name: o.name,
    base: text(o.base),
    ...(o.rectifies
      ? {
          rect: true,
          rectYear: String(o.rectifies.year),
          rectQuarter: String(o.rectifies.quarter),
          previous: text(o.rectifies.previous),
        }
      : {}),
  }));
  return {
    ...form,
    quarters: form.quarters.map((q, i) =>
      i === quarter - 1 ? { ...q, vat: { ...vatOfForm(q.vat), intra: rows } } : q
    ),
  };
}
