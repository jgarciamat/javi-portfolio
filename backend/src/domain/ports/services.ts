import type {
  CryptoInterval,
  CryptoSymbol,
  MarketCandle,
  MarketFeed,
  MarketQuote,
  MarketTicker,
} from '@domain/services/crypto-market';
import { DigestData } from '@domain/services/digest';
import { QuestionFacts } from '@domain/services/question-facts';
import { Advice, AdviceContext } from '@domain/services/rule-based-advisor';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface AccessTokenClaims {
  userId: string;
  sessionVersion: number;
  /** When the user last proved who they are (sign-in), in ms; null in older tokens. */
  authTime: number | null;
}

export interface IssuedToken {
  /** Raw value handed to the client. */
  token: string;
  /** SHA-256 stored in the database. */
  hash: string;
  expiresAt: Date;
}

export interface TokenService {
  issueAccessToken(claims: AccessTokenClaims): string;
  /** Throws UnauthorizedError when the token is invalid or expired. */
  verifyAccessToken(token: string): AccessTokenClaims;
  issueRefreshToken(): IssuedToken;
  /** Random single-use token for e-mail links (verification, password reset). */
  issueEmailToken(ttlMs: number): IssuedToken;
  hash(token: string): string;
}

export type EmailLocale = 'es' | 'en';

/** Changes to how the account is protected, told to its owner by e-mail. */
export type SecurityNotice =
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'recovery_codes_regenerated'
  | 'recovery_code_used';

export type TrialNoticeKind = 'ends_soon' | 'last_day' | 'ended';

/** What the user has created that the free plan limits (counts only, never amounts or names). */
export interface TrialUsage {
  accounts: number;
  budgets: number;
  goals: number;
  recurringRules: number;
}

export interface TrialNotice {
  kind: TrialNoticeKind;
  /** When the trial ends (ISO). */
  endsAt: string;
  usage: TrialUsage;
}

export interface EmailSender {
  sendVerification(to: string, name: string, token: string, locale: EmailLocale): Promise<void>;
  sendPasswordReset(to: string, name: string, token: string, locale: EmailLocale): Promise<void>;
  /** Someone tried to sign up with an address that already has an account. */
  sendAccountExists(to: string, name: string, locale: EmailLocale): Promise<void>;
  /**
   * Confirms a purchase on a durable medium, including the request to start at
   * once and the loss of the right of withdrawal (required for that loss to apply).
   */
  sendPurchaseConfirmation(to: string, name: string, locale: EmailLocale): Promise<void>;
  /** Security alert: 2FA turned on or off, recovery codes renewed or used. */
  sendSecurityNotice(
    to: string,
    name: string,
    notice: SecurityNotice,
    locale: EmailLocale
  ): Promise<void>;
  /** The optional Monday summary of the week. */
  sendWeeklyDigest(
    to: string,
    name: string,
    locale: EmailLocale,
    digest: DigestData,
    currency: string
  ): Promise<void>;
  /** A service message about the end of the free trial (see TrialNoticeService). */
  sendTrialNotice(
    to: string,
    name: string,
    notice: TrialNotice,
    locale: EmailLocale
  ): Promise<void>;
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface GoogleIdentityVerifier {
  /** Accepts a Google ID token or access token issued to this app's client id. */
  verify(token: string): Promise<GoogleIdentity>;
}

/** Cost of an AI call in Cloudflare "neurons" (0 for providers billed elsewhere). */
export interface AiUsage {
  neurons: number;
}

export interface FinancialAdvisor {
  readonly name: string;
  getAdvice(context: AdviceContext): Promise<{ advice: Advice; usage: AiUsage }>;
  /** Free-form questions about the user's own figures (not every provider offers it). */
  answerQuestion?(request: {
    question: string;
    locale: 'es' | 'en';
    facts: QuestionFacts;
  }): Promise<{ answer: string; usage: AiUsage }>;
}

/** Suggests a category (one of `categories`, or null) for each description. */
export interface CategorySuggester {
  suggestCategories(
    descriptions: string[],
    categories: string[]
  ): Promise<{ suggestions: (string | null)[]; usage: AiUsage }>;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type CheckoutKind = 'monthly' | 'yearly' | 'lifetime' | 'renta_pass';

export interface CheckoutRequest {
  userId: string;
  email: string;
  kind: CheckoutKind;
  customerId: string | null;
  /** Premium already granted until this date (remaining trial): first charge after it. */
  trialEnd: Date | null;
  successUrl: string;
  cancelUrl: string;
}

/** Provider event normalised to what the billing service needs. */
export type BillingEvent =
  | {
      id: string;
      type: 'subscription_changed';
      userId: string | null;
      customerId: string;
      subscriptionId: string;
      status: 'trialing' | 'active' | 'past_due' | 'canceled';
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    }
  | {
      id: string;
      type: 'lifetime_purchased' | 'checkout_completed' | 'renta_pass_purchased';
      userId: string | null;
      customerId: string | null;
    }
  /** The founder payment was refunded in full (from the payment provider's dashboard). */
  | {
      id: string;
      type: 'lifetime_refunded' | 'renta_pass_refunded';
      userId: string | null;
      customerId: string | null;
    }
  /** A subscription invoice paid with real money (not a trial, not a 100 % discount). */
  | {
      id: string;
      type: 'premium_paid';
      userId: string | null;
      customerId: string | null;
      plan: 'monthly' | 'yearly';
    }
  /**
   * A Premium payment refunded in full or charged back. Only the creator program uses it:
   * the access itself follows the subscription events.
   */
  | {
      id: string;
      type: 'premium_reversed';
      userId: string | null;
      customerId: string | null;
    }
  | { id: string; type: 'ignored' };

export interface PaymentGateway {
  readonly enabled: boolean;
  createCheckout(request: CheckoutRequest): Promise<{ url: string; customerId: string | null }>;
  createPortal(customerId: string, returnUrl: string): Promise<{ url: string }>;
  /**
   * Verifies the signature (ValidationError 'INVALID_SIGNATURE' if it does not match)
   * and normalises the event, reading the current state of the subscription so
   * events delivered out of order cannot roll it back.
   */
  parseWebhook(rawBody: Buffer, signature: string | undefined): Promise<BillingEvent>;
  /** `atPeriodEnd`: stop renewing but keep what was paid; otherwise cancel now. */
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
}

// ─── Affiliation ─────────────────────────────────────────────────────────────

export type OfferCategory = 'savings' | 'investing' | 'banking' | 'insurance' | 'other';

export interface LocalizedText {
  es: string;
  en: string;
}

export interface AffiliateOffer {
  id: string;
  category: OfferCategory;
  name: string;
  icon: string;
  title: LocalizedText;
  description: LocalizedText;
  highlight: LocalizedText | null;
  url: string;
  active: boolean;
}

export interface OfferCatalog {
  list(): AffiliateOffer[];
}

/** Anonymous, aggregated product counters (no user, no content): what happens, not who. */
export type MetricName =
  | 'signup'
  | 'email_verified'
  | 'checkout_started'
  | 'purchase'
  | 'ai_analysis'
  | 'ai_question'
  | 'import_done'
  | 'referral_joined'
  | 'household_joined'
  /** A paid subscription stops renewing (scheduled or immediate cancellation). */
  | 'subscription_cancelled'
  /** Where a new user came from (`signup:reddit`, `signup:google.com`…): a counter, never a person. */
  | `signup:${string}`;

export interface MetricsRecorder {
  record(name: MetricName): void;
}

/** Funnel events the browser may send (`POST /api/funnel`). Closed list, as in the frontend. */
export const CLIENT_FUNNEL_EVENTS = [
  'visit',
  'signup_view',
  'guide_view',
  'guide_cta_click',
  'pricing_view',
  'paywall_view',
  // «Invite a friend» in the crypto console: card seen, link copied, link shared.
  'cons_invite_view',
  'cons_invite_copy',
  'cons_invite_share',
] as const;

/** Funnel events only the server records, when the thing really happens. */
export const SERVER_FUNNEL_EVENTS = [
  'signup',
  'trial_start',
  'email_verified',
  'first_transaction',
  'activation_step',
  'activation_done',
  'checkout_start',
  'premium',
  'cancel',
  /** A trial notice went out (detail: `ends_soon:email`, `last_day:push`, `ended:email`…). */
  'trial_notice',
] as const;

export type ClientFunnelEvent = (typeof CLIENT_FUNNEL_EVENTS)[number];
export type FunnelEvent = ClientFunnelEvent | (typeof SERVER_FUNNEL_EVENTS)[number];

/** Dimensions of a funnel counter: never a person, an IP or a device. */
export interface FunnelDimensions {
  /** Normalised origin (`tiktok`, `google`, `(direct)`, `(app)`); `(unknown)` when not known. */
  source?: string;
  /** `utm_campaign`, plus `/utm_content` when there is one (`renta2026/v041`). */
  campaign?: string;
  /** Guide slug or activation step. */
  detail?: string;
}

/** Anonymous daily funnel counters, by origin (docs/analitica.md). */
export interface FunnelRecorder {
  record(event: FunnelEvent, dimensions?: FunnelDimensions): void;
}

/**
 * Public crypto market data (no keys) for the educational simulator: candles of a coin and
 * the last prices, always in euros. Answers come from a cache; when the source is down an older
 * copy is returned marked `stale`, and with nothing cached it throws UnavailableError.
 */
export interface CryptoMarketData {
  readonly source: 'binance' | 'demo';
  /** The market a coin's prices come from (fixed for the life of the process). */
  quoteOf(symbol: CryptoSymbol): MarketQuote;
  candles(symbol: CryptoSymbol, interval: CryptoInterval): Promise<MarketFeed<MarketCandle[]>>;
  tickers(): Promise<MarketFeed<MarketTicker[]>>;
}

/** Reference exchange rates (daily, European Central Bank) to enter foreign-currency movements. */
export interface ExchangeRates {
  /** How many `to` one `from` is worth. */
  rate(from: string, to: string): Promise<number>;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where the notification takes the user when tapped (a path of the app). */
  url: string;
}

/** Sends a notification to a browser or installed app. `gone`: the subscription no longer exists. */
export interface PushSender {
  readonly enabled: boolean;
  publicKey(): string | null;
  send(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
  ): Promise<'sent' | 'gone'>;
}
