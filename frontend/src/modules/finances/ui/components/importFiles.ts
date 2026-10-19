import {
  parseWorkbook,
  type BookCell,
  type BookKind,
  type BookSkipped,
} from '../../domain/invoiceBook';
import { mergeInvoices, toInvoices, type KindPreferences } from '../../domain/invoiceLedger';
import type { TaxModelParse } from '../../domain/taxModelPdf';
import { applyInvoices, applyModel130, applyModel303 } from './importForm';
import type { ManualForm } from './AutonomoManual';

export type Sheets = { name: string; rows: BookCell[][] }[];

/** A line of the result of a file: a translation key with its values, said as done, note or error. */
export interface Line {
  tone: 'done' | 'note' | 'error';
  key: string;
  values?: Record<string, string | number>;
}

/** What a file does: the form it leaves (none when it could not be used), what to say, and where to go. */
export interface Applied {
  form?: ManualForm;
  lines: Line[];
  period?: { year: number; quarter: 1 | 2 | 3 | 4 };
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
  if (data.quarter === null) return 'noPeriod';
  if (!years.includes(data.year ?? year)) return 'year';
  return data.model === '130' && data.quarter === 4 ? 'lastQuarter' : null;
}

/** What the modelo 303 brought that the draft takes differently, or not at all. */
function notes303(
  { expense, ignored }: ReturnType<typeof applyModel303>['found'],
  dropped: number,
  quarter: number
) {
  return [
    ...(expense ? [note('expense')] : []),
    ...(expense && !expense.exact ? [note('rate')] : []),
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
  const quarter = data.quarter as 1 | 2 | 3 | 4;
  const at = data.year ?? year;
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
