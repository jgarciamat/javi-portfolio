import { z } from 'zod';
import { EXPENSE_KINDS } from '@domain/services/autonomo-expenses';
import { toCents } from '@domain/shared/money';
import { isAllowedPushEndpoint } from '@domain/shared/push-endpoint';

/** Decimal money from the client (e.g. 12.34) → integer cents. */
export const money = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .finite()
  .positive('Debe ser mayor que 0')
  .max(1_000_000_000)
  .transform(toCents);

export const signedMoney = z
  .number()
  .finite()
  .min(-1_000_000_000)
  .max(1_000_000_000)
  .transform(toCents);

const id = z.string().min(1).max(100);
const optionalId = id.nullish();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Formato YYYY-MM-DD');
const year = z.coerce.number().int().min(1970).max(9999);
const month = z.coerce.number().int().min(1).max(12);
const categoryName = z.string().trim().min(1).max(50);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color #rrggbb');
const locale = z.enum(['es', 'en']).default('es');

export const periodParams = z.object({ year, month });
export const yearParam = z.object({ year });
/** Balances of the accounts at the end of this period (both or none). */
export const accountListQuery = z
  .object({ year: year.optional(), month: month.optional() })
  .refine((q) => (q.year === undefined) === (q.month === undefined), 'Indica año y mes');
export const idParam = z.object({ id });

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerBody = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(80),
  locale,
  /** Code of the user who invited this one. */
  referralCode: z.string().trim().max(32).optional(),
});
export const loginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});
export const emailBody = z.object({ email: z.string().trim().min(1).max(254), locale });
export const refreshBody = z.object({ refreshToken: z.string().min(1).max(2000) });
export const logoutBody = z.object({ refreshToken: z.string().max(2000).optional() });
export const googleBody = z
  .object({
    token: z.string().min(1).max(5000).optional(),
    idToken: z.string().min(1).max(5000).optional(),
    locale,
    referralCode: z.string().trim().max(32).optional(),
  })
  .refine((b) => b.token || b.idToken, { message: 'token requerido' });
export const resetBody = z.object({
  token: z.string().min(1).max(500),
  newPassword: z.string().min(1).max(128),
});
export const verifyQuery = z.object({ token: z.string().min(1).max(500) });

// ─── Profile & settings ──────────────────────────────────────────────────────

export const nameBody = z.object({ name: z.string().trim().min(1).max(80) });
export const passwordBody = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(1).max(128),
});
/** Deleting the account: proof of identity, and the Google Play cancellation acknowledged. */
export const deleteAccountBody = z.object({
  password: z.string().max(128).optional(),
  googleToken: z.string().min(1).max(5000).optional(),
  confirmPlayCancelled: z.boolean().optional(),
});
/** Two-factor authentication. `code`: 6 digits of the app or a recovery code. */
const twoFactorCode = z.string().trim().min(1).max(32);
export const twoFactorSetupBody = z.object({
  password: z.string().max(128).optional(),
  googleToken: z.string().min(1).max(5000).optional(),
});
export const twoFactorCodeBody = z.object({ code: twoFactorCode });
export const twoFactorProofBody = z.object({
  password: z.string().max(128).optional(),
  code: twoFactorCode.optional(),
});
export const twoFactorVerifyBody = z.object({
  challengeToken: z.string().min(1).max(200),
  code: twoFactorCode,
});
export const avatarBody = z.object({ avatarDataUrl: z.string().max(3_000_000).nullable() });
export const settingsBody = z
  .object({
    currency: z.string().length(3).toUpperCase(),
    locale: z.enum(['es', 'en']),
    monthStartDay: z.number().int().min(1).max(28),
    defaultAccountId: id,
    notificationsEnabled: z.boolean(),
    showOffers: z.boolean(),
    showTour: z.boolean(),
    showGettingStarted: z.boolean(),
    weeklyDigest: z.boolean(),
  })
  .partial()
  .strict();

// ─── Transactions ────────────────────────────────────────────────────────────

const transactionType = z
  .string()
  .transform((v) => v.toUpperCase())
  .pipe(z.enum(['INCOME', 'EXPENSE', 'SAVING']));

export const transactionBody = z.object({
  description: z.string().min(1).max(200),
  amount: money,
  type: transactionType,
  category: categoryName.optional(),
  categoryId: optionalId,
  accountId: optionalId,
  date: date.optional(),
  notes: z.string().max(1000).nullish(),
});

export const transactionPatchBody = transactionBody.partial();

export const searchQuery = z.object({
  q: z.string().max(100).optional(),
  type: transactionType.optional(),
  categoryIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : (Array.isArray(v) ? v : v.split(',')).filter(Boolean)
    ),
  accountId: id.optional(),
  from: date.optional(),
  to: date.optional(),
  min: z.coerce
    .number()
    .nonnegative()
    .optional()
    .transform((v) => (v === undefined ? undefined : toCents(v))),
  max: z.coerce
    .number()
    .nonnegative()
    .optional()
    .transform((v) => (v === undefined ? undefined : toCents(v))),
  sort: z.enum(['date_desc', 'date_asc', 'amount_desc', 'amount_asc']).default('date_desc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const importBody = z.object({
  accountId: optionalId,
  dryRun: z.boolean().default(false),
  /** The user's opt-in to send unplaced descriptions to the AI provider. */
  useAi: z.boolean().default(false),
  /** A bank statement (limited on the free plan) or payments read from bank notifications (Premium). */
  source: z.enum(['statement', 'capture']).default('statement'),
  rows: z
    .array(
      z.object({
        date: z.string().min(1).max(40),
        description: z.string().max(500),
        amount: signedMoney,
        type: z.string().max(20).nullish(),
        category: z.string().max(50).nullish(),
        notes: z.string().max(1000).nullish(),
      })
    )
    .min(1)
    .max(5000),
});

// ─── Categories, accounts, transfers ─────────────────────────────────────────

export const categoryBody = z.object({
  name: categoryName,
  color: color.optional(),
  icon: z.string().max(16).optional(),
});
export const categoryPatchBody = categoryBody.partial();
export const deleteCategoryQuery = z.object({ reassignTo: id.optional() });

const accountType = z.enum(['checking', 'savings', 'cash', 'card', 'investment', 'other']);
export const accountBody = z.object({
  name: z.string().trim().min(1).max(50),
  type: accountType.default('checking'),
  initialBalance: signedMoney.default(0),
  color: color.optional(),
  icon: z.string().max(16).optional(),
});
export const accountPatchBody = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  type: accountType.optional(),
  initialBalance: signedMoney.optional(),
  color: color.optional(),
  icon: z.string().max(16).optional(),
  archived: z.boolean().optional(),
});
export const transferBody = z.object({
  fromAccountId: id,
  toAccountId: id,
  amount: money,
  date,
  description: z.string().max(200).nullish(),
});

// ─── Recurring rules ─────────────────────────────────────────────────────────

const frequency = z.enum(['monthly', 'bimonthly', 'quarterly', 'yearly']);
export const recurringBody = z.object({
  description: z.string().min(1).max(200),
  amount: money,
  type: transactionType,
  category: categoryName.optional(),
  categoryId: optionalId,
  accountId: optionalId,
  startYear: year,
  startMonth: month,
  endYear: year.nullish(),
  endMonth: month.nullish(),
  frequency: frequency.default('monthly'),
  active: z.boolean().optional(),
});
export const recurringPatchBody = recurringBody
  .partial()
  .extend({ frequency: frequency.optional() });
export const recurringDeleteQuery = z.object({
  scope: z.enum(['none', 'from_current', 'all']).default('none'),
});

// ─── Alerts, budgets, goals ──────────────────────────────────────────────────

const metric = z.enum([
  'expenses_pct',
  'income_pct',
  'saving_pct',
  'balance_pct',
  'balance_amount',
  'category_pct',
  'category_amount',
]);
export const customAlertBody = z.object({
  name: z.string().trim().min(1).max(80),
  metric,
  operator: z.enum(['gte', 'lte']),
  threshold: z.number().finite(),
  category: categoryName.nullish(),
  categoryId: optionalId,
  color: color.optional(),
  active: z.boolean().optional(),
});
export const customAlertPatchBody = customAlertBody.partial();

export const budgetBody = z
  .object({ categoryId: id.optional(), category: categoryName.optional(), amount: money })
  .refine((b) => b.categoryId || b.category, { message: 'categoryId o category requerido' });

export const goalBody = z.object({
  name: z.string().trim().min(1).max(80),
  target: money,
  targetDate: date.nullish(),
  category: categoryName.optional(),
  categoryId: id.optional(),
  icon: z.string().max(16).optional(),
  color: color.optional(),
});
export const goalPatchBody = goalBody.partial().extend({ archived: z.boolean().optional() });

// ─── Insights ────────────────────────────────────────────────────────────────

export const adviceBody = z.object({ year, month, locale });
export const askBody = z.object({
  question: z.string().trim().min(3).max(300),
  locale,
});
export const yearParams = z.object({ year: z.coerce.number().int().min(1970).max(9999) });
export const householdJoinBody = z.object({ code: z.string().trim().min(10).max(64) });
export const householdCodeParams = z.object({ code: z.string().trim().min(10).max(64) });
export const memberParams = z.object({ id: z.string().trim().min(1).max(64) });
const assetValue = z.number().finite().min(0).max(1_000_000_000).transform(toCents);
const assetRate = z.number().finite().min(0).max(100);
export const assetBody = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['investment', 'property', 'vehicle', 'other', 'debt']),
  value: assetValue,
  date: date.nullish(),
  interestRate: assetRate.nullish(),
  minPayment: assetValue.nullish(),
});
export const assetTermsBody = z.object({
  interestRate: assetRate.nullable(),
  minPayment: assetValue.nullable(),
});
export const assetValueBody = z.object({ value: assetValue, date: date.nullish() });
export const rateQuery = z.object({
  from: z.string().length(3).toUpperCase(),
  to: z.string().length(3).toUpperCase(),
});
export const businessCategoryBody = z.object({
  vatRate: z.union([z.literal(21), z.literal(10), z.literal(4), z.literal(0)]),
});
const euroAmount = z.number().finite().min(0).max(100_000_000);
const quarterExtras = z.object({
  withheld: euroAmount.default(0),
  socialSecurity: euroAmount.default(0),
  vatNotDeductible: euroAmount.default(0),
});
const vatRateValue = z.union([z.literal(21), z.literal(10), z.literal(4), z.literal(0)]);
const manualExpense = z.object({
  kind: z.enum(EXPENSE_KINDS),
  amount: euroAmount,
  vatRate: vatRateValue,
  days: z.number().int().min(0).max(366).optional(),
});
const manualQuarter = z.object({
  income: z.object({
    r21: euroAmount.default(0),
    r10: euroAmount.default(0),
    r4: euroAmount.default(0),
    r0: euroAmount.default(0),
  }),
  expenses: z.array(manualExpense).max(200).default([]),
});
const manualData = z.object({
  quarters: z.tuple([manualQuarter, manualQuarter, manualQuarter, manualQuarter]),
  profile: z.object({
    workArea: z.number().finite().min(0).max(100000).default(0),
    homeArea: z.number().finite().min(0).max(100000).default(0),
    vehicleExclusive: z.boolean().default(false),
    healthPeople: z.number().int().min(0).max(20).default(0),
    healthDisability: z.boolean().default(false),
  }),
});
export const autonomoDraftBody = z.object({
  year,
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  inputs: z.object({
    quarters: z.tuple([quarterExtras, quarterExtras, quarterExtras, quarterExtras]),
    hardToJustify: z.boolean().default(false),
    priorYearNet: z.number().finite().min(-100_000_000).max(100_000_000).nullable().default(null),
    exempt130: z.boolean().default(false),
    vatToOffset: euroAmount.default(0),
    /** Income and expenses typed by hand instead of the movements. */
    manual: manualData.nullish(),
    prior: z
      .object({
        income: euroAmount.default(0),
        expenses: euroAmount.default(0),
        previousPayments: euroAmount.default(0),
        withheld: euroAmount.default(0),
      })
      .nullish(),
  }),
});
// The self-employed form saved in the account: the same fields the app keeps on the device, as
// typed (text) or as imported. Strict, so nothing but the form can be stored.
const formText = z.string().max(24);
const quarterValue = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const invoiceAmount = z.number().finite().min(-100_000_000).max(100_000_000);
const PDF_REVIEW_CODES = [
  'date',
  'dateFormat',
  'amount',
  'rate',
  'mismatch',
  'noTotal',
  'surcharge',
  'split',
  'reverse',
  'currency',
  'several',
  'issuer',
] as const;
const savedExpense = z
  .object({ kind: z.enum(EXPENSE_KINDS), amount: formText, vatRate: vatRateValue, days: formText })
  .strict();
const savedQuarter = z
  .object({
    income: z.object({ r21: formText, r10: formText, r4: formText, r0: formText }).strict(),
    withheld: formText,
    expenses: z.array(savedExpense).max(500),
  })
  .strict();
const savedInvoice = z
  .object({
    id: z.string().min(1).max(40),
    book: z.enum(['issued', 'received']),
    kind: z.enum(EXPENSE_KINDS),
    excluded: z.boolean(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    quarter: quarterValue,
    base: invoiceAmount,
    vatRate: vatRateValue,
    vat: invoiceAmount,
    total: invoiceAmount,
    withheld: invoiceAmount,
    concept: z.string().max(200),
    period: quarterValue.nullish(),
    /** Withholding of a received invoice (modelos 111 and 115), its correction and the payee's tax id. */
    retention: invoiceAmount.optional(),
    retentionFix: invoiceAmount.optional(),
    nif: z.string().max(40).optional(),
    withholding: z.enum(['none', 'professional', 'rent']).optional(),
    /** Read from a PDF: what is still to check and what the reading did not give. */
    source: z.literal('pdf').optional(),
    review: z.array(z.enum(PDF_REVIEW_CODES)).max(20).optional(),
    missing: z
      .array(z.enum(['date', 'base', 'rate']))
      .max(3)
      .optional(),
  })
  .strict();
const savedPayees = z.object({ people: formText, paid: formText, withheld: formText }).strict();
const savedWithholding = z
  .object({
    staff: z
      .object({
        people: formText,
        paid: formText,
        withheld: formText,
        kindPeople: formText,
        kindPaid: formText,
        kindWithheld: formText,
      })
      .strict(),
    pros: savedPayees,
    rent: savedPayees,
    filed111: z.boolean(),
    filed115: z.boolean(),
  })
  .strict();
const autonomoSaved = z
  .object({
    manual: z
      .object({
        profile: z
          .object({
            workArea: formText,
            homeArea: formText,
            vehicleExclusive: z.boolean(),
            healthPeople: formText,
            healthDisability: z.boolean(),
          })
          .strict(),
        prior: z
          .object({
            on: z.boolean(),
            income: formText,
            expenses: formText,
            payments: formText,
            withheld: formText,
          })
          .strict(),
        quarters: z.tuple([savedQuarter, savedQuarter, savedQuarter, savedQuarter]),
        invoices: z.array(savedInvoice).max(5000),
        model130: z
          .object({
            year: z.number().int().min(1970).max(9999),
            quarter: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            income: invoiceAmount,
            expenses: invoiceAmount,
          })
          .strict()
          .nullable(),
        withholdings: z.tuple([
          savedWithholding,
          savedWithholding,
          savedWithholding,
          savedWithholding,
        ]),
      })
      .strict(),
    extras: z
      .object({
        hardToJustify: z.boolean(),
        exempt: z.boolean(),
        priorNet: formText,
        toOffset: formText,
      })
      .strict(),
    /** Supplier → kind of expense the user chose, for the next imports. */
    kinds: z
      .record(z.string().max(200), z.enum(EXPENSE_KINDS))
      .refine((kinds) => Object.keys(kinds).length <= 2000, 'Demasiados proveedores'),
  })
  .strict();
export const autonomoDataBody = z
  .object({
    data: autonomoSaved,
    /** The version the device last read or wrote; null when it never had one. */
    baseVersion: z.number().int().min(1).nullable(),
  })
  .strict();
export const categoryIdParam = z.object({ categoryId: id });
export const splitGroupBody = z.object({
  name: z.string().trim().min(1).max(60),
  members: z.array(z.string().trim().min(1).max(40)).min(2).max(12),
});
export const splitExpenseBody = z.object({
  description: z.string().trim().min(1).max(100),
  amount: money,
  paidBy: id,
  participants: z.array(id).max(12).optional(),
  date: date.nullish(),
});
export const splitSettleBody = z.object({ from: id, to: id, amount: money, date: date.nullish() });
export const splitExpenseParams = z.object({ id, expenseId: id });
export const pushSubscribeBody = z.object({
  endpoint: z
    .string()
    .url()
    .max(1000)
    .refine(isAllowedPushEndpoint, { message: 'Servicio de notificaciones no admitido' }),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export const pushUnsubscribeBody = z.object({ endpoint: z.string().url().max(1000) });
export const acquisitionBody = z.object({
  source: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{0,39}$/),
});
export const netWorthQuery = z.object({
  months: z.coerce.number().int().min(1).max(120).default(12),
});
export const forecastQuery = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
  /** Comma-separated recurring rule ids left out of the projection ("what if I cancel…"). */
  exclude: z
    .string()
    .max(2000)
    .default('')
    .transform((value) => value.split(',').filter(Boolean).slice(0, 50)),
});

// ─── Billing & offers ────────────────────────────────────────────────────────

export const checkoutBody = z.object({
  kind: z.enum(['monthly', 'yearly', 'lifetime', 'renta_pass']),
  acceptTerms: z.boolean().default(false),
  waiveWithdrawal: z.boolean().default(false),
});
export const categoryRuleBody = z.object({
  pattern: z.string().trim().min(1).max(200),
  categoryId: id,
});
export const ruleSuggestQuery = z.object({ description: z.string().trim().min(1).max(200) });
export const offerParams = z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/) });

// ---------- Client error reports ----------
export const clientErrorBody = z.object({
  kind: z.enum(['render', 'error', 'unhandledrejection']),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).optional(),
});

/** Removes every `<open ...>...</close>` block of the given tag, scanning the text once. */
function dropBlocks(html: string, tag: 'style' | 'script'): string {
  const lower = html.toLowerCase();
  let out = '';
  let from = 0;
  for (;;) {
    const start = lower.indexOf(`<${tag}`, from);
    if (start < 0) break;
    const end = lower.indexOf(`</${tag}>`, start);
    if (end < 0) break;
    out += `${html.slice(from, start)} `;
    from = end + tag.length + 3;
  }
  return out + html.slice(from);
}

/** Plain text out of an html e-mail. Linear in the size of the input, whatever it contains. */
export function stripTags(html: string): string {
  const body = dropBlocks(dropBlocks(html, 'style'), 'script');
  let out = '';
  let from = 0;
  for (;;) {
    const open = body.indexOf('<', from);
    if (open < 0) break;
    const close = body.indexOf('>', open + 1);
    if (close < 0) break;
    out += `${body.slice(from, open)} `;
    from = close + 1;
  }
  return (out + body.slice(from))
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&');
}

/** A message forwarded by the e-mail service: plain text, or html when there is no text. */
export const inboundMailBody = z
  .object({
    to: z.union([z.string().max(1000), z.array(z.string().max(320)).max(20)]),
    from: z.string().max(300).default(''),
    subject: z.string().max(500).default(''),
    text: z.string().max(50_000).default(''),
    html: z.string().max(200_000).optional(),
    date: z.string().max(40).nullish(),
  })
  .transform(({ to, html, text, ...rest }) => ({
    ...rest,
    to: Array.isArray(to) ? to.join(',') : to,
    text: (text.trim() ? text : html ? stripTags(html) : '').slice(0, 50_000),
  }));
