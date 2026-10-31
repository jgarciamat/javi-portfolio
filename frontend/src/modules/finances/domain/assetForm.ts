import type { Asset, AssetKind, DebtPaymentInput, DebtType } from './types';
import { isPositiveAmount, parseDecimal } from '@shared/utils/numbers';

/** What the person is writing down: something they own, an investment or something they owe. */
export type AssetGroup = 'good' | 'investment' | 'debt';
export const ASSET_GROUPS: AssetGroup[] = ['good', 'investment', 'debt'];
/** The kinds of goods (an investment and a debt are one kind each). */
export const GOOD_KINDS: AssetKind[] = ['property', 'vehicle', 'other'];
export const DEBT_TYPES: DebtType[] = ['mortgage', 'personal', 'car', 'card', 'other'];
/** Most instalments the app accepts (50 years). */
export const MAX_INSTALMENTS = 600;

export const groupOf = (kind: AssetKind): AssetGroup =>
  kind === 'debt' ? 'debt' : kind === 'investment' ? 'investment' : 'good';

/** «How you pay it»: a fixed amount every month, from one account. */
export interface PaymentForm {
  amount: string;
  /** Day of the month, 1..31. */
  day: string;
  /** '' is the default account. */
  accountId: string;
  /** Month of the first payment as YYYY-MM; '' is «the next one». */
  start: string;
  /** Instalments left (optional). */
  instalments: string;
}

export interface AssetForm {
  group: AssetGroup;
  goodKind: AssetKind;
  debtType: DebtType;
  name: string;
  /** For a debt, what is owed today. */
  value: string;
  initial: string;
  rate: string;
  /** The debt is paid every month by itself. */
  pays: boolean;
  payment: PaymentForm;
}

export const emptyPayment = (accountId = ''): PaymentForm => ({
  amount: '',
  day: '',
  accountId,
  start: '',
  instalments: '',
});

export const emptyAssetForm = (accountId = ''): AssetForm => ({
  group: 'investment',
  goodKind: 'property',
  debtType: 'mortgage',
  name: '',
  value: '',
  initial: '',
  rate: '',
  pays: false,
  payment: emptyPayment(accountId),
});

export const kindOf = (form: AssetForm): AssetKind =>
  form.group === 'good' ? form.goodKind : form.group;

/** An empty field is «not given»; otherwise the number written (NaN if it is not one). */
const optionalNumber = (text: string): number | null =>
  text.trim() === '' ? null : parseDecimal(text);

const wholeNumber = (text: string): number => (/^\d+$/.test(text.trim()) ? Number(text) : NaN);

type PaymentResult = { error: string } | { payment: DebtPaymentInput };

const validDay = (day: number): boolean => day >= 1 && day <= 31;
const validInstalments = (n: number | null): boolean =>
  n === null || (n >= 1 && n <= MAX_INSTALMENTS);

/** The first month chosen, if any. */
function startOf(start: string): { startYear?: number; startMonth?: number } {
  if (!start) return {};
  const [startYear, startMonth] = start.split('-').map(Number);
  return { startYear, startMonth };
}

/**
 * The payment to send, or the i18n key of its first problem. Editing a payment, an empty
 * «instalments left» keeps the ones it had (`keepInstalments`).
 */
export function paymentResult(form: PaymentForm, keepInstalments = false): PaymentResult {
  const amount = parseDecimal(form.amount);
  if (!isPositiveAmount(amount)) return { error: 'app.assets.error.payment' };
  const day = wholeNumber(form.day);
  if (!validDay(day)) return { error: 'app.assets.error.day' };
  const empty = form.instalments.trim() === '';
  const instalments = empty ? null : wholeNumber(form.instalments);
  if (!validInstalments(instalments)) return { error: 'app.assets.error.instalments' };
  return {
    payment: {
      amount,
      day,
      accountId: form.accountId || null,
      ...startOf(form.start),
      ...(empty && keepInstalments ? {} : { instalments }),
    },
  };
}

export type CreateAssetInput = {
  name: string;
  kind: AssetKind;
  value: number;
  debtType?: DebtType;
  initialValue?: number;
  interestRate?: number;
  payment?: DebtPaymentInput;
};

type FormResult = { error: string } | { input: CreateAssetInput };

const nonNegative = (n: number | null): boolean => n === null || n >= 0;
const validRate = (n: number | null): boolean => n === null || (n >= 0 && n <= 100);

/** The extra data of a debt and its monthly payment, or the first problem. */
function debtInput(form: AssetForm, base: CreateAssetInput): FormResult {
  const initial = optionalNumber(form.initial);
  if (!nonNegative(initial)) return { error: 'app.assets.error.initial' };
  const rate = optionalNumber(form.rate);
  if (!validRate(rate)) return { error: 'app.assets.error.rate' };
  const paid = form.pays ? paymentResult(form.payment) : null;
  if (paid && 'error' in paid) return paid;
  return {
    input: {
      ...base,
      debtType: form.debtType,
      ...(initial !== null ? { initialValue: initial } : {}),
      ...(rate !== null ? { interestRate: rate } : {}),
      ...(paid ? { payment: paid.payment } : {}),
    },
  };
}

/** What to send to add the element, or the i18n key of the first problem. */
export function assetFormResult(form: AssetForm): FormResult {
  const name = form.name.trim();
  if (!name) return { error: 'app.assets.error.name' };
  const value = optionalNumber(form.value);
  if (value === null || !(value >= 0)) return { error: 'app.assets.error.value' };
  const base = { name, kind: kindOf(form), value };
  return base.kind === 'debt' ? debtInput(form, base) : { input: base };
}

/** i18n keys of what to tell before saving a monthly payment (it is never refused for them). */
export function paymentWarnings(owed: number, rate: number | null, amount: number): string[] {
  if (!(owed > 0 && amount > 0)) return [];
  const warnings: string[] = [];
  if (amount > owed) warnings.push('app.assets.warn.payoffAtOnce');
  if (rate && amount <= (owed * rate) / 1200) warnings.push('app.assets.warn.interest');
  return warnings;
}

/** Share of what was borrowed that is already paid (0..1), when the amount borrowed is known. */
export function debtProgress(asset: Asset): number | null {
  const initial = asset.initialValue ?? 0;
  if (!(initial > 0)) return null;
  return Math.min(1, Math.max(0, (initial - asset.value) / initial));
}

/** The next twelve months (YYYY-MM), for the month of the first payment. */
export function nextMonths(
  today: Date,
  count = 12
): { value: string; year: number; month: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return { value: `${year}-${String(month).padStart(2, '0')}`, year, month };
  });
}
