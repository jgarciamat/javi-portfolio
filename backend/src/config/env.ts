import { z } from 'zod';
import type { CreatorProgramConfig } from '@application/creators/CreatorProgram';

const booleanish = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const cents = (euros: number): number => Math.round(euros * 100);

const PRODUCTION_URL = 'https://finanverso.app';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Opens the tax return draft reader to everybody (development: always on, to try it). */
  RENTA_DRAFT_OPEN: z.enum(['true', 'false']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().optional(),
  /** Legacy name kept so old deploy files keep working. */
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  /** Encrypts the 2FA secrets at rest; without it a key is derived from JWT_SECRET. */
  TWO_FACTOR_ENCRYPTION_KEY: z
    .union([z.literal(''), z.string().min(32, 'use at least 32 characters')])
    .optional(),
  APP_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  /** Error tracking (Sentry EU / GlitchTip). Empty or missing = off. */
  SENTRY_DSN: z.string().optional(),
  /** cloudflare (default when configured) | gemini (paid key only: the free tier is not allowed for EEA users) | none */
  AI_PROVIDER: z.enum(['cloudflare', 'gemini', 'none']).optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_AI_TOKEN: z.string().optional(),
  CLOUDFLARE_AI_MODEL: z.string().default('@cf/meta/llama-3.1-8b-instruct-fp8-fast'),
  CLOUDFLARE_AI_JSON_MODE: booleanish,
  /** Neurons per million tokens of the chosen model (defaults: llama-3.1-8b-instruct-fp8-fast). */
  AI_NEURONS_PER_M_INPUT: z.coerce.number().positive().default(4119),
  AI_NEURONS_PER_M_OUTPUT: z.coerce.number().positive().default(34868),
  /** Stay below Cloudflare's free 10,000 neurons/day. */
  AI_DAILY_NEURON_BUDGET: z.coerce.number().nonnegative().default(9000),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash-lite'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  STRIPE_PRICE_LIFETIME: z.string().optional(),
  STRIPE_PRICE_RENTA_PASS: z.string().optional(),
  /** Shared secret RevenueCat sends in the Authorization header of its webhooks (Google Play purchases). */
  REVENUECAT_WEBHOOK_AUTH: z.string().min(16).optional(),
  /** Receipts forwarded by e-mail: domain of the addresses and the secret of the forwarding service. */
  INBOUND_EMAIL_DOMAIN: z.string().optional(),
  INBOUND_EMAIL_SECRET: z.string().min(16).optional(),
  /** Web Push (phone and browser notifications): `npx web-push generate-vapid-keys`. */
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:support@finanverso.app'),
  /** Prices shown in the UI (must match the Stripe prices, VAT included). */
  PRICE_MONTHLY: z.coerce.number().positive().default(3.49),
  PRICE_YEARLY: z.coerce.number().positive().default(29.99),
  PRICE_LIFETIME: z.coerce.number().positive().default(59),
  PRICE_RENTA_PASS: z.coerce.number().positive().default(10),
  FOUNDER_LIMIT: z.coerce.number().int().nonnegative().default(100),
  AFFILIATES_FILE: z.string().optional(),
  /** Creator affiliate program (docs/afiliacion): off unless set to true. */
  CREATOR_PROGRAM: booleanish,
  CREATOR_COMMISSION_MONTHLY_EUR: z.coerce.number().nonnegative().default(2),
  CREATOR_COMMISSION_YEARLY_EUR: z.coerce.number().nonnegative().default(7),
  CREATOR_COMMISSION_LIFETIME_EUR: z.coerce.number().nonnegative().default(10),
  /** Caps per calendar year: per creator and for the whole program. */
  CREATOR_CAP_EUR: z.coerce.number().nonnegative().default(300),
  CREATOR_GLOBAL_CAP_EUR: z.coerce.number().nonnegative().default(1500),
  CREATOR_WINDOW_DAYS: z.coerce.number().int().positive().default(90),
  CREATOR_HOLD_DAYS: z.coerce.number().int().nonnegative().default(45),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('onboarding@resend.dev'),
  EMAIL_FROM_NAME: z.string().optional(),
  /** Legacy name for EMAIL_FROM_NAME. */
  SMTP_FROM_NAME: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
  BACKUP_INTERVAL_HOURS: z.coerce.number().positive().default(24),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
  RATE_LIMIT_DISABLED: booleanish,
  SEED_DEMO_USER: booleanish,
  SEED_DEMO_EMAIL: z.string().email().default('demo@moneymanager.local'),
  SEED_DEMO_PASSWORD: z.string().optional(),
});

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  /** Anybody can read a tax return draft, with no pass (local development). */
  rentaDraftOpen: boolean;
  port: number;
  databasePath: string;
  jwt: { accessSecret: string; accessTtl: string; refreshTtlMs: number };
  /** Key material for the 2FA secrets (its own key, or the JWT secret as fallback). */
  twoFactor: { encryptionKey: string };
  appUrl: string;
  corsOrigins: string[];
  trustProxy: number;
  sentryDsn: string | null;
  google: { clientId: string | null };
  ai: {
    provider: 'cloudflare' | 'gemini' | 'none';
    cloudflare: {
      accountId: string;
      apiToken: string;
      model: string;
      jsonMode: boolean;
      neuronsPerMInput: number;
      neuronsPerMOutput: number;
    } | null;
    gemini: { apiKey: string; model: string } | null;
    dailyNeuronBudget: number;
  };
  billing: {
    stripe: {
      secretKey: string;
      webhookSecret: string;
      prices: {
        monthly: string;
        yearly: string;
        lifetime: string | null;
        rentaPass: string | null;
      };
    } | null;
    /** Secret that authenticates RevenueCat's webhooks; null leaves Google Play purchases off. */
    revenueCatWebhookAuth: string | null;
    displayPrices: { monthly: number; yearly: number; lifetime: number; rentaPass: number };
    founderLimit: number;
  };
  /** Receipts by e-mail; both values are needed to turn it on. */
  inbox: { domain: string | null; secret: string | null };
  /** Web Push keys; null leaves push notifications off. */
  push: { publicKey: string; privateKey: string; subject: string } | null;
  affiliatesFile: string | null;
  creators: CreatorProgramConfig;
  email: { resendApiKey: string | null; fromEmail: string; fromName: string };
  backup: { dir: string | null; intervalHours: number; retentionDays: number };
  rateLimitDisabled: boolean;
  demoSeed: { enabled: boolean; email: string; password: string | null };
}

const DEV_ACCESS_SECRET = 'dev-only-access-secret-do-not-use-in-production-000000';
const RECOMMENDED_SECRET_LENGTH = 32;
/** Values that were published in this repository at some point and must never sign tokens. */
const KNOWN_PUBLIC_SECRETS = new Set([
  'money-manager-secret-change-in-prod',
  'change-me-use-a-long-random-string',
  'your_jwt_secret_here',
  DEV_ACCESS_SECRET,
]);

/** Origins used by the Capacitor native shells (Android uses https://localhost, iOS capacitor://localhost). */
const NATIVE_APP_ORIGINS = ['https://localhost', 'http://localhost', 'capacitor://localhost'];

export class ConfigError extends Error {}

function resolveAccessSecret(raw: z.infer<typeof envSchema>): string {
  if (raw.NODE_ENV !== 'production') return raw.JWT_SECRET || DEV_ACCESS_SECRET;
  if (!raw.JWT_SECRET) {
    throw new ConfigError('JWT_SECRET is required in production');
  }
  if (KNOWN_PUBLIC_SECRETS.has(raw.JWT_SECRET)) {
    throw new ConfigError('JWT_SECRET uses a publicly known value; generate a new random secret');
  }
  if (raw.JWT_SECRET.length < RECOMMENDED_SECRET_LENGTH) {
    console.warn(
      `[config] JWT_SECRET is shorter than ${RECOMMENDED_SECRET_LENGTH} characters; use a longer random value`
    );
  }
  return raw.JWT_SECRET;
}

function resolveAi(raw: z.infer<typeof envSchema>): AppConfig['ai'] {
  const cloudflare =
    raw.CLOUDFLARE_ACCOUNT_ID && raw.CLOUDFLARE_AI_TOKEN
      ? {
          accountId: raw.CLOUDFLARE_ACCOUNT_ID,
          apiToken: raw.CLOUDFLARE_AI_TOKEN,
          model: raw.CLOUDFLARE_AI_MODEL,
          jsonMode: raw.CLOUDFLARE_AI_JSON_MODE,
          neuronsPerMInput: raw.AI_NEURONS_PER_M_INPUT,
          neuronsPerMOutput: raw.AI_NEURONS_PER_M_OUTPUT,
        }
      : null;
  const gemini = raw.GEMINI_API_KEY
    ? { apiKey: raw.GEMINI_API_KEY, model: raw.GEMINI_MODEL }
    : null;
  // Gemini is only used when chosen explicitly: its free tier cannot serve EEA users.
  const provider = raw.AI_PROVIDER ?? (cloudflare ? 'cloudflare' : 'none');
  return { provider, cloudflare, gemini, dailyNeuronBudget: raw.AI_DAILY_NEURON_BUDGET };
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new ConfigError(`Invalid environment:\n- ${details.join('\n- ')}`);
  }
  const raw = parsed.data;
  const accessSecret = resolveAccessSecret(raw);
  // Without a provider the verification and reset links would only be written to the logs.
  if (raw.NODE_ENV === 'production' && !raw.RESEND_API_KEY) {
    throw new ConfigError('RESEND_API_KEY is required in production (e-mail provider)');
  }
  // Emails and payment redirects must never point to localhost in production, even if APP_URL is missing.
  const appUrl = (
    raw.APP_URL ?? (raw.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:5176')
  ).replace(/\/$/, '');
  const extraOrigins = (raw.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devOrigins =
    raw.NODE_ENV === 'production' ? [] : ['http://localhost:5176', 'http://localhost:5173'];

  return {
    env: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    rentaDraftOpen: raw.RENTA_DRAFT_OPEN
      ? raw.RENTA_DRAFT_OPEN === 'true'
      : raw.NODE_ENV === 'development',
    port: raw.PORT,
    databasePath: raw.DATABASE_PATH ?? raw.DATABASE_URL ?? './data/money-manager.db',
    jwt: {
      accessSecret,
      accessTtl: '15m',
      refreshTtlMs: 30 * 24 * 60 * 60 * 1000,
    },
    twoFactor: { encryptionKey: raw.TWO_FACTOR_ENCRYPTION_KEY || accessSecret },
    appUrl,
    corsOrigins: [...new Set([appUrl, ...NATIVE_APP_ORIGINS, ...devOrigins, ...extraOrigins])],
    trustProxy: raw.TRUST_PROXY,
    google: { clientId: raw.GOOGLE_CLIENT_ID ?? null },
    sentryDsn: raw.SENTRY_DSN?.trim() || null,
    ai: resolveAi(raw),
    inbox: {
      domain: raw.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || null,
      secret: raw.INBOUND_EMAIL_SECRET ?? null,
    },
    push:
      raw.VAPID_PUBLIC_KEY && raw.VAPID_PRIVATE_KEY
        ? {
            publicKey: raw.VAPID_PUBLIC_KEY,
            privateKey: raw.VAPID_PRIVATE_KEY,
            subject: raw.VAPID_SUBJECT,
          }
        : null,
    billing: {
      stripe:
        raw.STRIPE_SECRET_KEY &&
        raw.STRIPE_WEBHOOK_SECRET &&
        raw.STRIPE_PRICE_MONTHLY &&
        raw.STRIPE_PRICE_YEARLY
          ? {
              secretKey: raw.STRIPE_SECRET_KEY,
              webhookSecret: raw.STRIPE_WEBHOOK_SECRET,
              prices: {
                monthly: raw.STRIPE_PRICE_MONTHLY,
                yearly: raw.STRIPE_PRICE_YEARLY,
                lifetime: raw.STRIPE_PRICE_LIFETIME || null,
                rentaPass: raw.STRIPE_PRICE_RENTA_PASS || null,
              },
            }
          : null,
      revenueCatWebhookAuth: raw.REVENUECAT_WEBHOOK_AUTH ?? null,
      displayPrices: {
        monthly: raw.PRICE_MONTHLY,
        yearly: raw.PRICE_YEARLY,
        lifetime: raw.PRICE_LIFETIME,
        rentaPass: raw.PRICE_RENTA_PASS,
      },
      founderLimit: raw.FOUNDER_LIMIT,
    },
    affiliatesFile: raw.AFFILIATES_FILE || null,
    creators: {
      enabled: raw.CREATOR_PROGRAM,
      commissionCents: {
        monthly: cents(raw.CREATOR_COMMISSION_MONTHLY_EUR),
        yearly: cents(raw.CREATOR_COMMISSION_YEARLY_EUR),
        lifetime: cents(raw.CREATOR_COMMISSION_LIFETIME_EUR),
      },
      creatorCapCents: cents(raw.CREATOR_CAP_EUR),
      globalCapCents: cents(raw.CREATOR_GLOBAL_CAP_EUR),
      windowDays: raw.CREATOR_WINDOW_DAYS,
      holdDays: raw.CREATOR_HOLD_DAYS,
    },
    email: {
      resendApiKey: raw.RESEND_API_KEY || null,
      fromEmail: raw.RESEND_FROM_EMAIL,
      fromName: raw.EMAIL_FROM_NAME ?? raw.SMTP_FROM_NAME ?? 'Finanverso',
    },
    backup: {
      dir: raw.BACKUP_DIR ?? null,
      intervalHours: raw.BACKUP_INTERVAL_HOURS,
      retentionDays: raw.BACKUP_RETENTION_DAYS,
    },
    rateLimitDisabled: raw.RATE_LIMIT_DISABLED,
    demoSeed: {
      enabled: raw.SEED_DEMO_USER && raw.NODE_ENV !== 'production',
      email: raw.SEED_DEMO_EMAIL,
      password: raw.SEED_DEMO_PASSWORD ?? null,
    },
  };
}
