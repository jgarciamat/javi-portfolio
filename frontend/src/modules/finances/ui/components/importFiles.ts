import {
  parseWorkbook,
  type BookCell,
  type BookKind,
  type BookSkipped,
} from '../../domain/invoiceBook';
import {
  addInvoices,
  missingOf,
  mergeInvoices,
  toInvoices,
  toPdfInvoices,
  type KindPreferences,
} from '../../domain/invoiceLedger';
import { entriesOf, kindOfInvoice, type InvoicePdf } from '../../domain/invoicePdf';
import { carryFrom390, type TaxModelParse, type TaxModelPdf } from '../../domain/taxModelPdf';
import { applyInvoices, applyModel130, applyModel303, applyModel349 } from './importForm';
import type { ManualForm } from './AutonomoManual';
import { importWithholdingModel } from './withholdingForm';

export type Sheets = { name: string; rows: BookCell[][] }[];

/** A line of the result of a file: a translation key with its values, said as done, note or error. */
export interface Line {
  tone: 'done' | 'note' | 'error';
  key: string;
  values?: Record<string, string | number>;
  /** Values shown as money and as dates (an empty date is «no date»). */
  money?: Record<string, number>;
  dates?: Record<string, string>;
  /** Review codes of an invoice read from a PDF, said one after the other. */
  reasons?: string[];
}

/** What a file does: the form it leaves (none when it could not be used), what to say, and where to go. */
export interface Applied {
  form?: ManualForm;
  lines: Line[];
  period?: { year: number; quarter: 1 | 2 | 3 | 4 };
  /** The invoices of the file in the review (a PDF invoice): to show them. */
  ids?: string[];
  /** What the 390 of last year hands to this one: VAT to offset and provisional prorrata. */
  carry?: { toOffset: string; provisional: string | null };
}

const SKIPPED: (keyof BookSkipped)[] = ['year', 'rate', 'amount'];

/** The invoices of a book into the form: its quarters are replaced, a correction made before is kept. */
export function importBook(
  form: ManualForm,
  kind: BookKind,
  sheets: Sheets,
  year: number,
  preferences: KindPreferences
): Applied {
  const parsed = parseWorkbook(sheets, kind, year);
  if (!parsed.ok)
    return { lines: [{ tone: 'error', key: `app.autonomo.import.error.${parsed.reason}` }] };
  const { entries, skipped } = parsed.result;
  const skippedLines = SKIPPED.filter((k) => skipped[k] > 0).map(
    (k): Line => ({
      tone: 'note',
      key: `app.autonomo.import.skipped.${k}`,
      values: { n: skipped[k], year },
    })
  );
  if (entries.length === 0) {
    return {
      lines: [
        { tone: 'error', key: 'app.autonomo.import.error.empty', values: { year } },
        ...skippedLines,
      ],
    };
  }
  const merged = mergeInvoices(
    form.invoices,
    kind,
    toInvoices(kind, entries, preferences, form.invoices)
  );
  return {
    form: applyInvoices({ ...form, invoices: merged.list }, kind, merged.quarters),
    lines: [
      {
        tone: 'done',
        key: `app.autonomo.import.done.${kind}`,
        values: {
          count: entries.length,
          year,
          quarters: merged.quarters.map((q) => `T${q}`).join(', '),
        },
      },
      ...(kind === 'received'
        ? [{ tone: 'note' as const, key: 'app.autonomo.import.review' }]
        : []),
      ...skippedLines,
    ],
  };
}

const note = (key: string, values?: Line['values']): Line => ({
  tone: 'note',
  key: `app.autonomo.model.note.${key}`,
  values,
});

/** Why a read PDF cannot be used, or null when it can. */
function modelProblem(parsed: TaxModelParse | null, year: number, years: readonly number[]) {
  if (!parsed) return 'unreadable';
  if (!parsed.ok) return parsed.reason;
  const { data } = parsed;
  // The 390 is of a year, not of a quarter.
  if (data.model === '390') return null;
  if (data.quarter === null) return 'noPeriod';
  if (!years.includes(data.year ?? year)) return 'year';
  return data.model === '130' && data.quarter === 4 ? 'lastQuarter' : null;
}

/** What the modelo 303 brought that the draft takes differently, or not at all. */
function notes303(
  { expenses, ignored }: ReturnType<typeof applyModel303>['found'],
  dropped: number,
  quarter: number
) {
  return [
    ...(expenses.length > 0 ? [note('expense')] : []),
    ...(expenses.some((l) => !l.exact) ? [note('rate')] : []),
    ...(ignored.length > 0 ? [note('ignored', { boxes: ignored.join(', ') })] : []),
    ...(dropped > 0 ? [note('invoices', { n: dropped, quarter })] : []),
  ];
}

/**
 * A filed modelo into the form: the 130 hands its totals to the next quarter, the 303 fills its own.
 * `parsed` is null when the PDF could not be read at all.
 */
export function importModel(
  form: ManualForm,
  parsed: TaxModelParse | null,
  year: number,
  years: readonly number[]
): Applied {
  const problem = modelProblem(parsed, year, years);
  if (problem) {
    return {
      lines: [
        {
          tone: 'error',
          key: `app.autonomo.model.error.${problem}`,
          values: { years: years.join(', ') },
        },
      ],
    };
  }
  const { data } = parsed as Extract<TaxModelParse, { ok: true }>;
  if (data.model === '390') return import390(data, year);
  const quarter = data.quarter as 1 | 2 | 3 | 4;
  const at = data.year ?? year;
  if (data.model === '349') {
    return {
      form: applyModel349(form, data, quarter),
      period: { year: at, quarter },
      lines: [
        {
          tone: 'done',
          key: 'app.autonomo.model.done.349',
          values: { year: at, quarter, n: (data.operators ?? []).length },
        },
      ],
    };
  }
  if (data.model === '111' || data.model === '115')
    return importWithholdingModel(form, data, at, quarter);
  if (data.model === '130') {
    return {
      form: applyModel130(form, data, at, quarter as 1 | 2 | 3),
      period: { year: at, quarter: (quarter + 1) as 2 | 3 | 4 },
      lines: [
        {
          tone: 'done',
          key: 'app.autonomo.model.done.130',
          values: { year: at, quarter, next: quarter + 1 },
        },
      ],
    };
  }
  const { form: next, found, dropped } = applyModel303(form, data, quarter);
  return {
    form: next,
    period: { year: at, quarter },
    lines: [
      { tone: 'done', key: 'app.autonomo.model.done.303', values: { year: at, quarter } },
      ...notes303(found, dropped, quarter),
    ],
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The 390 of last year hands its definitive prorrata and the VAT left to offset to this year; the
 * one of this year is only a reference to compare with the draft of the fourth quarter.
 */
function import390(data: TaxModelPdf, year: number): Applied {
  const at = data.year ?? year;
  if (at !== year - 1) {
    return {
      lines: [
        {
          tone: at === year ? 'note' : 'error',
          key: `app.autonomo.model.m390.${at === year ? 'same' : 'year'}`,
          values: { year: at, draft: year },
        },
      ],
    };
  }
  const carry = carryFrom390(data.boxes);
  return {
    carry: {
      toOffset: carry.toOffset === 0 ? '' : String(carry.toOffset),
      provisional: carry.prorrata !== null && carry.prorrata < 100 ? String(carry.prorrata) : null,
    },
    lines: [
      {
        tone: 'done',
        key: 'app.autonomo.model.done.390',
        values: { year: at, next: year },
        money: { toOffset: carry.toOffset },
      },
      ...(carry.prorrata !== null && carry.prorrata < 100
        ? [note('prorrata', { pct: carry.prorrata })]
        : []),
    ],
  };
}

/**
 * An invoice read from a PDF into the form, in the given book: it is added to the invoices of its
 * quarter (the others stay). Importing it again finds it by its id and changes nothing.
 */
export function importInvoicePdf(
  form: ManualForm,
  invoice: InvoicePdf,
  book: BookKind,
  preferences: KindPreferences
): Applied {
  const incoming = toPdfInvoices(
    book,
    entriesOf(invoice, book),
    invoice.review,
    kindOfInvoice(invoice),
    preferences
  );
  const merged = addInvoices(form.invoices, incoming);
  const ids = incoming.map((i) => i.id);
  const first = incoming[0];
  const values = {
    who: first.concept,
    quarters: Array.from(new Set(incoming.map((i) => `T${i.quarter}`))).join(', '),
  };
  const money = {
    total: invoice.total ?? round2(incoming.reduce((s, i) => s + i.total - i.withheld, 0)),
  };
  const dates = { date: first.date };
  if (merged.fresh.length === 0) {
    return { ids, lines: [{ tone: 'note', key: 'app.autonomo.pdf.again', values, money, dates }] };
  }
  const missing = incoming.some((i) => missingOf(i).length > 0);
  return {
    ids,
    form: applyInvoices({ ...form, invoices: merged.list }, book, merged.quarters),
    lines: [
      { tone: 'done', key: `app.autonomo.pdf.done.${book}`, values, money, dates },
      ...(invoice.review.length > 0
        ? [{ tone: 'note' as const, key: 'app.autonomo.pdf.check', reasons: invoice.review }]
        : []),
      ...(invoice.mismatch
        ? [
            {
              tone: 'note' as const,
              key: 'app.autonomo.pdf.mismatch',
              money: { expected: invoice.mismatch.expected, printed: invoice.mismatch.total },
            },
          ]
        : []),
      ...(missing ? [{ tone: 'note' as const, key: 'app.autonomo.pdf.missing' }] : []),
    ],
  };
}
