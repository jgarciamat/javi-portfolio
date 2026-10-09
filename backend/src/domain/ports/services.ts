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

export interface EmailSender {
  sendVerification(to: string, name: string, token: string, locale: EmailLocale): Promise<void>;
  sendPasswordReset(to: string, name: string, token: string, locale: EmailLocale): Promise<void>;
  /**
   * Confirms a purchase on a durable medium, including the request to start at
   * once and the loss of the right of withdrawal (required for that loss to apply).
   */
  sendPurchaseConfirmation(to: string, name: string, locale: EmailLocale): Promise<void>;
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
}

/** Suggests a category (one of `categories`, or null) for each description. */
export interface CategorySuggester {
  suggestCategories(
    descriptions: string[],
    categories: string[]
  ): Promise<{ suggestions: (string | null)[]; usage: AiUsage }>;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type CheckoutKind = 'monthly' | 'yearly' | 'lifetime';

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
      type: 'lifetime_purchased' | 'checkout_completed';
      userId: string | null;
      customerId: string | null;
    }
  /** The founder payment was refunded in full (from the payment provider's dashboard). */
  | { id: string; type: 'lifetime_refunded'; userId: string | null; customerId: string | null }
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
  | 'import_done'
  | 'referral_joined';

export interface MetricsRecorder {
  record(name: MetricName): void;
}
