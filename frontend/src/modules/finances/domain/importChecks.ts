import { hardToJustifyRate, type ActivityTerritory } from './activityTerritory';
import { needsCheck, supplierKey, type ImportedInvoice } from './invoiceLedger';
import type { ManualData, ManualExpense } from './types';
import { isEuVatId } from './vatBook';

/**
 * What to look at before preparing the draft: things in the imported invoices that are often a
 * mistake (a repeated invoice, a wrong kind of expense, a missing quarter…). Nothing here stops the
 * draft; each warning points to the invoices or the quarter it is about.
 */

export type CheckCode =
  | 'duplicate'
  | 'period'
  | 'emptyIncome'
  | 'emptyExpenses'
  | 'otherShare'
  | 'model130Income'
  | 'model130Expenses'
  | 'vat0'
  | 'negative'
  | 'years'
  | 'pdfReview'
  | 'intraNoVatId'
  | 'notSelfAssessed'
  | 'exemptNoCause'
  | 'investmentSmall'
  | 'rateGuessed'
  | 'cashBook';

export interface ImportCheck {
  code: CheckCode;
  /** "warn": probably wrong; "info": worth a look. */
  level: 'warn' | 'info';
  /** Plain values of the message. */
  values: Record<string, string | number>;
  /** Amounts of the message, in euros (shown as money). */
  amounts: Record<string, number>;
  /** The invoices it is about, to open them in the review. */
  invoices: string[];
  /** The quarter it is about, when it is about a quarter. */
  quarter: number | null;
}

export interface CheckInput {
  invoices: ImportedInvoice[];
  /** The figures the draft will be prepared with (typed or worked out from the invoices). */
  manual: ManualData;
  year: number;
  /** Today, `YYYY-MM-DD`: only the quarters that have begun can be missing. */
  today: string;
  /** Quarters on screen, from 1: the earlier ones are covered by a filed modelo 130. */
  from: number;
  upTo: number;
  /** The figures of an imported modelo 130 (boxes 01 and 02). */
  model130: { year: number; quarter: number; income: number; expenses: number } | null;
  hardToJustify: boolean;
  /** Where the activity is carried out: the hard-to-justify rate depends on it (and on the year). */
  territory?: ActivityTerritory;
}

/** Share of all expenses that «Other» may reach before it is worth a look. */
export const OTHER_SHARE = 0.3;
/** Euros of difference allowed against a filed modelo 130 (roundings). */
export const MODEL130_TOLERANCE = 1;

// The rules of the server (backend autonomo-expenses.ts sharesOf), only the income tax part: the
// check needs the deductible expenses that a filed modelo 130 shows in its box 02.
const MEALS_DAILY_LIMIT = 26.67;
const HEALTH_PER_PERSON = 500;
const HEALTH_DISABILITY = 1500;
const SUPPLIES_RATE = 0.3;
const HARD_TO_JUSTIFY_MAX = 2000;
/** Kinds that never carry VAT: a 0 % rate on them is expected. */
const NO_VAT: ManualExpense['kind'][] = ['quota', 'staff', 'health', 'fines'];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The income of a quarter as the 130 takes it: with VAT by rate and the sales without it. */
export const incomeOf = (q: ManualData['quarters'][number]): number =>
  q.income.r21 +
  q.income.r10 +
  q.income.r4 +
  q.income.r0 +
  // The sales of the server data are always numbers (vatForm.ts gives them all).
  Object.values(q.vat?.sales ?? {}).reduce((s: number, v) => s + (v as number), 0);

type Shares = (e: ManualExpense, profile: ManualData['profile']) => [irpf: number, vat: number];

/** The shares of income tax and VAT of the kinds that are not fully deducted. */
const SHARES: Partial<Record<ManualExpense['kind'], Shares>> = {
  supplies: (_, p) => {
    const share = p.homeArea > 0 ? Math.min(1, p.workArea / p.homeArea) * SUPPLIES_RATE : 0;
    return [share, share];
  },
  vehicle: (e, p) => (e.amount <= 0 || p.vehicleExclusive ? [1, 1] : [0, 0.5]),
  meals: (e) => {
    const share = e.amount > 0 ? Math.min(1, ((e.days ?? 0) * MEALS_DAILY_LIMIT) / e.amount) : 0;
    return [share, share];
  },
  clients: () => [1, 0],
  health: (e, p) => {
    const limit = p.healthPeople * (p.healthDisability ? HEALTH_DISABILITY : HEALTH_PER_PERSON);
    return [e.amount > 0 ? Math.min(1, limit / e.amount) : 0, 0];
  },
  fines: () => [0, 0],
};

/** Investment goods are worth at least 500,000 pesetas (art. 108.Dos.5.º Ley 37/1992 del IVA). */
export const INVESTMENT_MIN = 3005.06;

/** What an expense counts for the income tax, in euros. */
export function irpfDeductible(e: ManualExpense, profile: ManualData['profile']): number {
  // An investment good is depreciated, not deducted at once (the backend leaves it out of the 130).
  if (e.investment) return 0;
  const cents = Math.round(e.amount * 100);
  // Without Spanish VAT on the invoice the amount is the base and the VAT is self-assessed.
  const domestic = (e.op ?? 'domestic') === 'domestic';
  const baseCents = domestic ? Math.round(cents / (1 + e.vatRate / 100)) : cents;
  const vatCents = domestic ? cents - baseCents : Math.round((cents * e.vatRate) / 100);
  const [irpf, vat] = SHARES[e.kind]?.(e, profile) ?? [1, 1];
  return Math.round(baseCents * irpf + vatCents * Math.max(0, irpf - vat)) / 100;
}

/**
 * The VAT of a domestic expense that can be deducted (its share by kind, as the 303 counts it); an
 * expense without Spanish VAT on the invoice (intra-EU, reverse charge) has none here.
 */
export function vatDeductible(e: ManualExpense, profile: ManualData['profile']): number {
  if ((e.op ?? 'domestic') !== 'domestic') return 0;
  const cents = Math.round(e.amount * 100);
  const vatCents = cents - Math.round(cents / (1 + e.vatRate / 100));
  const [, vat] = SHARES[e.kind]?.(e, profile) ?? [1, 1];
  return Math.round(vatCents * vat) / 100;
}

const check = (
  code: CheckCode,
  level: ImportCheck['level'],
  more: Partial<Omit<ImportCheck, 'code' | 'level'>>
): ImportCheck => ({ code, level, values: {}, amounts: {}, invoices: [], quarter: null, ...more });

/** The same invoice more than once: same book, date, supplier, base and VAT rate. */
function duplicates(used: ImportedInvoice[]): ImportCheck[] {
  const groups = new Map<string, ImportedInvoice[]>();
  for (const i of used) {
    const key = [i.book, i.date, supplierKey(i.concept), i.base.toFixed(2), i.vatRate].join('|');
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  return Array.from(groups.values())
    .filter((g) => g.length > 1)
    .map((g) =>
      check('duplicate', 'warn', {
        values: { n: g.length, who: g[0].concept, date: g[0].date },
        amounts: { base: g[0].base },
        invoices: g.map((i) => i.id),
      })
    );
}

/** Quarters that have begun and have no invoice of a book, when that book was imported. */
function emptyQuarters(input: CheckInput, used: ImportedInvoice[]): ImportCheck[] {
  const [y, m] = input.today.split('-').map(Number);
  const begun = input.year < y ? 4 : input.year === y ? Math.floor((m - 1) / 3) + 1 : 0;
  const last = Math.min(begun, input.upTo);
  const out: ImportCheck[] = [];
  for (const book of ['issued', 'received'] as const) {
    if (!input.invoices.some((i) => i.book === book)) continue;
    for (let q = input.from; q <= last; q++) {
      const typed = input.manual.quarters[q - 1];
      const has =
        book === 'issued' ? incomeOf(typed) > 0 : typed.expenses.some((e) => e.amount > 0);
      if (!has && !used.some((i) => i.book === book && i.quarter === q)) {
        out.push(
          check(book === 'issued' ? 'emptyIncome' : 'emptyExpenses', 'info', {
            values: { q },
            quarter: q,
          })
        );
      }
    }
  }
  return out;
}

/** «Other expenses» above 30 % of all of them: the kind was probably not recognised. */
function otherShare(used: ImportedInvoice[]): ImportCheck[] {
  const received = used.filter((i) => i.book === 'received');
  const total = round2(received.reduce((s, i) => s + i.total, 0));
  const others = received.filter((i) => i.kind === 'other');
  const other = round2(others.reduce((s, i) => s + i.total, 0));
  if (total <= 0 || other / total <= OTHER_SHARE) return [];
  return [
    check('otherShare', 'warn', {
      values: { share: Math.round((other / total) * 100) },
      amounts: { other, total },
      invoices: others.map((i) => i.id),
    }),
  ];
}

/** A filed modelo 130 against what the invoices give for the same quarters. */
function model130(input: CheckInput): ImportCheck[] {
  const filed = input.model130;
  if (!filed || filed.year !== input.year) return [];
  const upTo = input.manual.quarters.slice(0, filed.quarter);
  const books = new Set(
    input.invoices.filter((i) => i.quarter <= filed.quarter).map((i) => i.book)
  );
  const income = round2(upTo.reduce((s, q) => s + incomeOf(q), 0));
  let expenses = upTo.reduce(
    (s, q) => s + q.expenses.reduce((t, e) => t + irpfDeductible(e, input.manual.profile), 0),
    0
  );
  if (input.hardToJustify) {
    expenses += Math.min(
      Math.max(0, income - expenses) *
        hardToJustifyRate(input.territory, input.year, filed.quarter),
      HARD_TO_JUSTIFY_MAX
    );
  }
  expenses = round2(expenses);
  const out: ImportCheck[] = [];
  const compare = (code: CheckCode, books: number, filedAmount: number) => {
    if (Math.abs(books - filedAmount) > MODEL130_TOLERANCE) {
      out.push(
        check(code, 'warn', {
          values: { quarter: filed.quarter },
          amounts: { filed: filedAmount, books, diff: round2(books - filedAmount) },
        })
      );
    }
  };
  if (books.has('issued')) compare('model130Income', income, filed.income);
  if (books.has('received')) compare('model130Expenses', expenses, filed.expenses);
  return out;
}

const INTRA_OPS = ['intraEU', 'intraGoods', 'intraServices'];

/** The VAT of the invoices: intra-EU without a VAT number, purchases not self-assessed, exempt sales… */
function vatChecks(used: ImportedInvoice[]): ImportCheck[] {
  const list = (code: CheckCode, level: ImportCheck['level'], found: ImportedInvoice[]) =>
    found.length > 0
      ? [check(code, level, { values: { n: found.length }, invoices: found.map((i) => i.id) })]
      : [];
  const op = (i: ImportedInvoice) => i.op ?? 'domestic';
  return [
    ...list(
      'intraNoVatId',
      'warn',
      used.filter((i) => INTRA_OPS.includes(op(i)) && !isEuVatId(i.vatId))
    ),
    // A supplier of another member state that charged no VAT: the buyer self-assesses it (art. 84).
    ...list(
      'notSelfAssessed',
      'warn',
      used.filter(
        (i) => i.book === 'received' && op(i) === 'domestic' && i.vatRate === 0 && isEuVatId(i.nif)
      )
    ),
    // An issued invoice without VAT and without saying why (exempt, export, intra-EU…).
    ...list(
      'exemptNoCause',
      'info',
      used.filter((i) => i.book === 'issued' && op(i) === 'domestic' && i.vatRate === 0)
    ),
    ...list(
      'investmentSmall',
      'info',
      used.filter((i) => i.investment && Math.abs(i.base) < INVESTMENT_MIN)
    ),
    ...list(
      'rateGuessed',
      'info',
      used.filter((i) => i.rateGuessed)
    ),
    ...list(
      'cashBook',
      'info',
      used.filter((i) => i.cash)
    ),
  ];
}

/** Everything worth a look before preparing the draft: the warnings first. */
export function checkImport(input: CheckInput): ImportCheck[] {
  const used = input.invoices.filter((i) => !i.excluded);
  const period = used.filter((i) => i.period != null && i.period !== i.quarter);
  const vat0 = used.filter(
    (i) => i.book === 'received' && i.vatRate === 0 && !NO_VAT.includes(i.kind)
  );
  const negative = used.filter((i) => i.base < 0);
  const years = Array.from(new Set(used.map((i) => Number(i.date.slice(0, 4))))).sort();
  // Read from a PDF with doubts or gaps: also the ones left out until they are completed.
  const pdf = input.invoices.filter(needsCheck);
  const all: ImportCheck[] = [
    ...(pdf.length > 0
      ? [check('pdfReview', 'warn', { values: { n: pdf.length }, invoices: pdf.map((i) => i.id) })]
      : []),
    ...duplicates(used),
    ...(period.length > 0
      ? [
          check('period', 'warn', {
            values: { n: period.length },
            invoices: period.map((i) => i.id),
          }),
        ]
      : []),
    // Invoices of another year than the draft's are mixed into its quarters.
    ...(years.some((y) => y !== input.year)
      ? [
          check('years', 'warn', {
            values: { years: years.join(', '), year: input.year },
            invoices: used.filter((i) => !i.date.startsWith(`${input.year}-`)).map((i) => i.id),
          }),
        ]
      : []),
    ...otherShare(used),
    ...vatChecks(used),
    ...model130(input),
    ...emptyQuarters(input, used),
    ...(vat0.length > 0
      ? [check('vat0', 'info', { values: { n: vat0.length }, invoices: vat0.map((i) => i.id) })]
      : []),
    ...(negative.length > 0
      ? [
          check('negative', 'info', {
            values: { n: negative.length },
            amounts: { total: round2(negative.reduce((s, i) => s + i.total, 0)) },
            invoices: negative.map((i) => i.id),
          }),
        ]
      : []),
  ];
  return [...all.filter((c) => c.level === 'warn'), ...all.filter((c) => c.level === 'info')];
}

/** A quarter that has begun with no income or no expenses although its book was imported. */
export interface MissingQuarter {
  quarter: number;
  income: boolean;
  expenses: boolean;
}

/** The empty quarters among the checks, one entry per quarter, in order. */
export function missingQuarters(checks: ImportCheck[]): MissingQuarter[] {
  const byQuarter = new Map<number, MissingQuarter>();
  for (const c of checks) {
    if (c.code !== 'emptyIncome' && c.code !== 'emptyExpenses') continue;
    const q = c.quarter as number;
    const entry = byQuarter.get(q) ?? { quarter: q, income: false, expenses: false };
    if (c.code === 'emptyIncome') entry.income = true;
    else entry.expenses = true;
    byQuarter.set(q, entry);
  }
  return Array.from(byQuarter.values()).sort((a, b) => a.quarter - b.quarter);
}
