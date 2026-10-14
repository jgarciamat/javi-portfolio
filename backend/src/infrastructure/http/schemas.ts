import { z } from 'zod';
import { toCents } from '@domain/shared/money';

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
  endpoint: z.string().url().max(1000),
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
  kind: z.enum(['monthly', 'yearly', 'lifetime']),
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

const stripTags = (html: string) =>
  html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&amp;/g, '&');

/** A message forwarded by the e-mail service: plain text, or html when there is no text. */
export const inboundMailBody = z
  .object({
    to: z.union([z.string(), z.array(z.string())]),
    from: z.string().max(300).default(''),
    subject: z.string().max(500).default(''),
    text: z.string().max(100_000).default(''),
    html: z.string().max(300_000).optional(),
    date: z.string().max(40).nullish(),
  })
  .transform(({ to, html, text, ...rest }) => ({
    ...rest,
    to: Array.isArray(to) ? to.join(',') : to,
    text: text.trim() ? text : html ? stripTags(html) : '',
  }));
