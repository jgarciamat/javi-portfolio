import { parseDecimal } from '@shared/utils/numbers';
import type { Account, AccountSplitInput, Transaction } from './types';

/**
 * An amount split between several accounts (e.g. 800 € = 500 € from the current account + 300 €
 * in cash), as the forms keep it while the person types: each row is an account and its amount.
 * The server checks it again (2+ different accounts adding up exactly to the amount).
 */
export interface SplitRow {
  accountId: string;
  amount: string;
}

export interface SplitForm {
  on: boolean;
  rows: SplitRow[];
  /** The last row takes what is left until the person types in it. */
  autoLast: boolean;
}

/** Most accounts an amount can be split between (the server's limit too). */
export const MAX_SPLITS = 10;

export const noSplit = (): SplitForm => ({ on: false, rows: [], autoLast: true });

/** Whole cents of what was typed; NaN when it is not a number. */
const cents = (amount: string): number => Math.round(parseDecimal(amount) * 100);
const typed = (c: number): string => (c > 0 ? String(c / 100) : '');
const totalOf = (total: string): number => {
  const c = cents(total);
  return Number.isFinite(c) && c > 0 ? c : 0;
};

/** Cents still to split (negative: the rows add up to more than the total). */
export function splitRemaining(total: string, rows: SplitRow[]): number {
  const given = rows.reduce((sum, r) => {
    const c = cents(r.amount);
    return sum + (Number.isFinite(c) ? c : 0);
  }, 0);
  return totalOf(total) - given;
}

/** The last row with what the others leave (when it is still the automatic one). */
function fillLast(form: SplitForm, total: string): SplitForm {
  if (!form.autoLast || form.rows.length === 0) return form;
  const rows = form.rows.slice();
  const last = rows.length - 1;
  rows[last] = { ...rows[last], amount: typed(splitRemaining(total, rows.slice(0, last))) };
  return { ...form, rows };
}

/** The account a new row starts with: the first one not used yet. */
const unused = (rows: SplitRow[], accounts: Account[]): string =>
  accounts.find((a) => !rows.some((r) => r.accountId === a.id))?.id ?? '';

/**
 * Turned on: the movement's account first, with nothing yet, and another account with the
 * whole amount (the person types the first part and the second one follows). Off: one account.
 */
export function toggleSplit(
  form: SplitForm,
  on: boolean,
  total: string,
  accounts: Account[],
  accountId: string | null
): SplitForm {
  if (!on) return { ...form, on: false };
  if (form.rows.length >= 2) return { ...form, on: true };
  const first = accounts.some((a) => a.id === accountId)
    ? (accountId as string)
    : unused([], accounts);
  const rows = [{ accountId: first, amount: '' }];
  rows.push({ accountId: unused(rows, accounts), amount: '' });
  return fillLast({ on: true, rows, autoLast: true }, total);
}

export function setSplitAccount(form: SplitForm, index: number, accountId: string): SplitForm {
  return { ...form, rows: form.rows.map((r, i) => (i === index ? { ...r, accountId } : r)) };
}

/** Typing in the last row makes it the person's; typing in another one updates the last. */
export function setSplitAmount(
  form: SplitForm,
  index: number,
  amount: string,
  total: string
): SplitForm {
  const rows = form.rows.map((r, i) => (i === index ? { ...r, amount } : r));
  const autoLast = form.autoLast && index !== rows.length - 1;
  return fillLast({ ...form, rows, autoLast }, total);
}

export function addSplitRow(form: SplitForm, total: string, accounts: Account[]): SplitForm {
  const rows = [...form.rows, { accountId: unused(form.rows, accounts), amount: '' }];
  return fillLast({ ...form, rows, autoLast: true }, total);
}

export function removeSplitRow(form: SplitForm, index: number, total: string): SplitForm {
  return fillLast({ ...form, rows: form.rows.filter((_, i) => i !== index) }, total);
}

/** The total changed: the automatic last row follows it. */
export const splitWithTotal = (form: SplitForm, total: string): SplitForm =>
  form.on ? fillLast(form, total) : form;

/** The same to every account; the cents that do not divide go one by one to the first ones. */
export function splitEqually(form: SplitForm, total: string): SplitForm {
  const whole = totalOf(total);
  const n = form.rows.length;
  const base = Math.floor(whole / n);
  const extra = whole - base * n;
  const rows = form.rows.map((r, i) => ({ ...r, amount: typed(base + (i < extra ? 1 : 0)) }));
  return { ...form, rows, autoLast: true };
}

/** i18n key of the first problem of the split, or null when it adds up. */
export function splitError(form: SplitForm, total: string): string | null {
  const { rows } = form;
  if (rows.length < 2) return 'app.accountSplit.error.few';
  if (rows.some((r) => !r.accountId)) return 'app.accountSplit.error.account';
  if (new Set(rows.map((r) => r.accountId)).size !== rows.length) {
    return 'app.accountSplit.error.duplicate';
  }
  if (rows.some((r) => !(cents(r.amount) > 0))) return 'app.accountSplit.error.amount';
  if (splitRemaining(total, rows) !== 0) return 'app.accountSplit.error.sum';
  return null;
}

/** What the API takes (amounts in euros with cents). */
export const splitParts = (form: SplitForm): AccountSplitInput[] =>
  form.rows.map((r) => ({ accountId: r.accountId, amount: cents(r.amount) / 100 }));

/** i18n key of what is wrong with the split, when it is on. */
export const splitProblem = (form: SplitForm, total: string): string | null =>
  form.on ? splitError(form, total) : null;

/**
 * Where the amount goes, as the API takes it: split, under the first part's account with the
 * parts; otherwise the account alone (and no parts, which also undoes an earlier split).
 */
export function splitTarget(
  form: SplitForm,
  accountId: string | null
): { accountId: string | null; splits: AccountSplitInput[] | null } {
  return form.on
    ? { accountId: form.rows[0].accountId, splits: splitParts(form) }
    : { accountId, splits: null };
}

/** A movement or operation already split, back into the form. */
export function splitFromParts(parts: AccountSplitInput[] | undefined): SplitForm {
  if (!parts || parts.length < 2) return noSplit();
  return {
    on: true,
    rows: parts.map((p) => ({ accountId: p.accountId, amount: String(p.amount) })),
    autoLast: false,
  };
}

/** «500 € Cuenta corriente + 300 € Efectivo». */
export function splitLabel(
  parts: (AccountSplitInput & { accountName?: string })[],
  money: (amount: number) => string,
  nameOf: (accountId: string) => string = () => ''
): string {
  return parts
    .map((p) => `${money(p.amount)} ${p.accountName ?? nameOf(p.accountId)}`.trim())
    .join(' + ');
}

/** The account shown for a movement: its parts when split, its account otherwise. */
export function accountLabel(tx: Transaction, money: (amount: number) => string): string {
  return tx.splits?.length ? splitLabel(tx.splits, money) : (tx.accountName ?? '');
}

/** Whether the movement is (wholly or in part) in the account. */
export const inAccount = (tx: Transaction, accountId: string): boolean =>
  tx.accountId === accountId || !!tx.splits?.some((s) => s.accountId === accountId);
