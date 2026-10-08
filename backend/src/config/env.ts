import { z } from 'zod';

const booleanish = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().optional(),
  /** Legacy name kept so old deploy files keep working. */
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  APP_URL: z.string().url().default('http://localhost:5176'),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
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
  /** Prices shown in the UI (must match the Stripe prices, VAT included). */
  PRICE_MONTHLY: z.coerce.number().positive().default(2.99),
  PRICE_YEARLY: z.coerce.number().positive().default(24.99),
  PRICE_LIFETIME: z.coerce.number().positive().default(49),
  FOUNDER_LIMIT: z.coerce.number().int().nonnegative().default(100),
  AFFILIATES_FILE: z.string().optional(),
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
  port: number;
  databasePath: string;
  jwt: { accessSecret: string; accessTtl: string; refreshTtlMs: number };
  appUrl: string;
  corsOrigins: string[];
  trustProxy: number;
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
      prices: { monthly: string; yearly: string; lifetime: string | null };
    } | null;
    displayPrices: { monthly: number; yearly: number; lifetime: number };
    founderLimit: number;
  };
  affiliatesFile: string | null;
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
  const appUrl = raw.APP_URL.replace(/\/$/, '');
  const extraOrigins = (raw.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devOrigins =
    raw.NODE_ENV === 'production' ? [] : ['http://localhost:5176', 'http://localhost:5173'];

  return {
    env: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    port: raw.PORT,
    databasePath: raw.DATABASE_PATH ?? raw.DATABASE_URL ?? './data/money-manager.db',
    jwt: {
      accessSecret,
      accessTtl: '15m',
      refreshTtlMs: 30 * 24 * 60 * 60 * 1000,
    },
    appUrl,
    corsOrigins: [...new Set([appUrl, ...NATIVE_APP_ORIGINS, ...devOrigins, ...extraOrigins])],
    trustProxy: raw.TRUST_PROXY,
    google: { clientId: raw.GOOGLE_CLIENT_ID ?? null },
    ai: resolveAi(raw),
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
              },
            }
          : null,
      displayPrices: {
        monthly: raw.PRICE_MONTHLY,
        yearly: raw.PRICE_YEARLY,
        lifetime: raw.PRICE_LIFETIME,
      },
      founderLimit: raw.FOUNDER_LIMIT,
    },
    affiliatesFile: raw.AFFILIATES_FILE || null,
    email: {
      resendApiKey: raw.RESEND_API_KEY || null,
      fromEmail: raw.RESEND_FROM_EMAIL,
      fromName: raw.EMAIL_FROM_NAME ?? raw.SMTP_FROM_NAME ?? 'Money Manager',
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
