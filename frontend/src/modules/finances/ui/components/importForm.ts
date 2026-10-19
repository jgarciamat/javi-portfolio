import { expensesByQuarter, incomeByQuarter, type BookKind } from '../../domain/invoiceBook';
import type { Quarter } from '../../domain/invoiceLedger';
import { priorFrom130, quarterFrom303, type TaxModelPdf } from '../../domain/taxModelPdf';
import type { ManualForm } from './AutonomoManual';

/** Supplier → kind of expense the person chose: the next imports start from it. */
export const KIND_PREFERENCES_KEY = 'mm_autonomo_kinds';

/** Money as the form's text fields take it: no zeros left over, a dot for the decimals. */
const text = (n: number): string => (n === 0 ? '' : String(n));

/**
 * The quarters of a book worked out again from its invoices (the ones not left out). Only the given
 * quarters change: the others may have been typed by hand. A quarter whose invoices are all left out
 * is emptied, as the person asked.
 */
export function applyInvoices(form: ManualForm, book: BookKind, quarters: Quarter[]): ManualForm {
  const used = form.invoices.filter((i) => i.book === book && !i.excluded);
  const income = incomeByQuarter(used);
  const expenses = expensesByQuarter(used, (i) => i.kind);
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
        };
      }
      return {
        ...quarter,
        expenses: (expenses[q] ?? []).map((l) => ({
          kind: l.kind,
          amount: text(l.amount),
          vatRate: l.vatRate,
          days: l.days === null ? '' : String(l.days),
        })),
      };
    }),
  };
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
 * The modelo 303 of a quarter gives its income by rate and its expenses of current operations. The
 * invoices imported for that quarter no longer say what the form has, so they leave the review.
 */
export function applyModel303(form: ManualForm, data: TaxModelPdf, quarter: Quarter) {
  const found = quarterFrom303(data.boxes);
  const invoices = form.invoices.filter((i) => i.quarter !== quarter);
  const quarters = form.quarters.map((q, i) =>
    i !== quarter - 1
      ? q
      : {
          ...q,
          income: {
            r21: text(found.income.r21),
            r10: text(found.income.r10),
            r4: text(found.income.r4),
            r0: text(found.income.r0),
          },
          expenses: found.expense
            ? [
                {
                  kind: 'other' as const,
                  amount: text(found.expense.amount),
                  vatRate: found.expense.vatRate,
                  days: '',
                },
              ]
            : [],
        }
  );
  return {
    form: { ...form, quarters, invoices },
    found,
    dropped: form.invoices.length - invoices.length,
  };
}
