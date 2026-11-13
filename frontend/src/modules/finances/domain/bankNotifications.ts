/** Apps whose notifications are read to detect payments (banks, wallets, payment apps). */
export const CAPTURE_PACKAGES = [
  'com.bbva.bbvacontigo',
  'es.bancosantander.apps',
  'es.lacaixa.mobile.android.newwapicon',
  'www.ingdirect.nativeframework',
  'de.number26.android',
  'com.revolut.revolut',
  'com.google.android.apps.walletnfcrel',
  'com.paypal.android.p2pmobile',
];

/**
 * Wallets that also notify a card payment the bank notifies: paying with Google Pay and a BBVA
 * card brings one notification from each app. The bank's one wins (it names the shop).
 */
const WALLET_PACKAGES = new Set(['com.google.android.apps.walletnfcrel']);

/** Two notifications of the same amount from different apps closer than this are one payment. */
export const SAME_PAYMENT_MS = 10 * 60 * 1000;

export interface DetectedPayment {
  /** Stable id of the notification, to avoid adding it twice. */
  id: string;
  description: string;
  /** Always positive. */
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  /** YYYY-MM-DD. */
  date: string;
  /** When the notification arrived (ms) and the app that posted it (older saved ones lack them). */
  postedAt?: number;
  app?: string;
}

const AMOUNT =
  '(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2}|\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+)';
const WITH_CURRENCY = new RegExp(
  `${AMOUNT}\\s?(?:€|eur\\b|euros?\\b)|(?:€|eur\\b)\\s?${AMOUNT}`,
  'i'
);

const NOT_A_PAYMENT =
  /\b(saldo|codigo|clave|verificacion|contrasena|pin|otp|oferta|promocion|limite)\b/;
/** Payments that did not happen (refused, cancelled) or not yet (a hold on the card). */
const NOT_DONE =
  /\b(denegad[ao]s?|rechazad[ao]s?|anulad[ao]s?|cancelad[ao]s?|no autorizad[ao]s?|no se ha podido|no se pudo|pre-?autorizacion(es)?|pre-?autorizad[ao]s?|retencion(es)?|retenid[ao]s?|declined|rejected|cancell?ed|pre-?authori[sz]ation|on hold)\b/;
const INCOME_WORDS =
  /\b(has recibido|recibido|ingreso|abono|abonado|nomina|devolucion|reembolso|received|deposit)\b/;
const EXPENSE_WORDS =
  /\b(pago|pagado|pagaste|compra|cargo|adeudo|recibo|retirada|has enviado|enviado|bizum enviado|payment|purchase|paid|spent)\b/;

const strip = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function toNumber(raw: string): number | null {
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  const decimalAt = Math.max(comma, dot);
  const hasDecimals = decimalAt !== -1 && raw.length - decimalAt - 1 === 2;
  const clean = hasDecimals
    ? `${raw.slice(0, decimalAt).replace(/[.,]/g, '')}.${raw.slice(decimalAt + 1)}`
    : raw.replace(/[.,]/g, '');
  const value = Number(clean);
  return Number.isFinite(value) && value > 0 && value < 1_000_000 ? value : null;
}

/** What the payment was to or from: the text after the amount ("… en MERCADONA", "… de Ana"). */
function counterparty(text: string, amountEnd: number): string | null {
  const after = text.slice(amountEnd);
  const match = /\b(?:en|a|de|para|from|at|to)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][^.,;:()\n]{1,40})/.exec(
    after
  );
  return match ? match[1].replace(/\s+con\s+tu\s+.*$/i, '').trim() : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A short stable id for a notification. */
export function notificationId(postedAt: number, text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `${postedAt}-${(hash >>> 0).toString(36)}`;
}

/** Income or expense from the words of the text, or null when it says neither. */
function paymentType(plain: string): DetectedPayment['type'] | null {
  const income = INCOME_WORDS.test(plain);
  const expense = EXPENSE_WORDS.test(plain);
  // A "Bizum recibido" has both "recibido" and "bizum": income wins; paying has no income words.
  if (!income && !expense) return null;
  return income ? 'INCOME' : 'EXPENSE';
}

/** The counterparty, else the title (when it is not just the amount), else a generic name. */
function describe(
  full: string,
  title: string,
  found: RegExpExecArray,
  type: DetectedPayment['type']
): string {
  return (
    counterparty(full, found.index + found[0].length) ??
    (title.trim().length > 1 && !WITH_CURRENCY.test(title) ? title.trim() : null) ??
    (type === 'INCOME' ? 'Ingreso' : 'Pago con tarjeta')
  );
}

/**
 * Reads a payment out of a bank notification ("Pago con tarjeta de 23,40 € en MERCADONA").
 * Anything that is not clearly a payment or an income (balances, codes, offers) returns null,
 * so that nothing wrong is ever suggested.
 */
export function parseBankNotification(
  title: string,
  text: string,
  postedAt: number,
  app?: string
): DetectedPayment | null {
  const full = `${title}. ${text}`;
  const plain = strip(full);
  if (NOT_A_PAYMENT.test(plain) || NOT_DONE.test(plain)) return null;
  const found = WITH_CURRENCY.exec(full);
  if (!found) return null;
  const amount = toNumber(found[1] ?? found[2]);
  if (amount === null) return null;

  const type = paymentType(plain);
  if (type === null) return null;

  const description = describe(full, title, found, type);
  const when = new Date(postedAt);
  return {
    id: notificationId(postedAt, full),
    description: description.slice(0, 60),
    amount,
    type,
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    postedAt,
    ...(app && { app }),
  };
}

/**
 * The same payment told by two apps (Google Wallet and the bank): same amount and type, from
 * different apps, less than 10 minutes apart. Two equal payments in the same app are two payments.
 */
export function samePayment(a: DetectedPayment, b: DetectedPayment): boolean {
  if (!a.app || !b.app || a.app === b.app || a.postedAt === undefined) return false;
  if (b.postedAt === undefined || a.type !== b.type || a.amount !== b.amount) return false;
  return Math.abs(a.postedAt - b.postedAt) < SAME_PAYMENT_MS;
}

/** Of two notifications of the same payment, the one to keep: the bank's (it names the shop). */
export const betterOf = (kept: DetectedPayment, other: DetectedPayment): DetectedPayment =>
  WALLET_PACKAGES.has(kept.app as string) && !WALLET_PACKAGES.has(other.app as string)
    ? other
    : kept;
