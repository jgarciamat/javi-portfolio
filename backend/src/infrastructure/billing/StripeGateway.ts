import Stripe from 'stripe';
import { ValidationError } from '@domain/errors';
import { BillingEvent, CheckoutRequest, PaymentGateway } from '@domain/ports/services';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  prices: {
    monthly: string;
    yearly: string;
    lifetime: string | null;
    rentaPass?: string | null;
  };
}

/** Checkout only accepts a trial end at least 48 hours away. */
const MIN_TRIAL_MS = 48 * 60 * 60 * 1000 + 5 * 60 * 1000;

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null);

function mapStatus(status: string): 'trialing' | 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return status;
  // incomplete, incomplete_expired, unpaid, paused, canceled: no access.
  return 'canceled';
}

export class StripeGateway implements PaymentGateway {
  readonly enabled = true;
  private readonly stripe: Stripe;

  constructor(
    private readonly config: StripeConfig,
    client?: Stripe
  ) {
    this.stripe =
      client ??
      new Stripe(config.secretKey, {
        apiVersion: '2026-09-30.endive',
        maxNetworkRetries: 2,
        timeout: 20_000,
        appInfo: { name: 'money-manager' },
      });
  }

  async createCheckout(request: CheckoutRequest): Promise<{ url: string; customerId: string }> {
    const customerId =
      request.customerId ??
      (
        await this.stripe.customers.create({
          email: request.email,
          metadata: { userId: request.userId },
        })
      ).id;
    const metadata = { userId: request.userId, kind: request.kind };
    const common = {
      customer: customerId,
      client_reference_id: request.userId,
      metadata,
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      allow_promotion_codes: true,
    } satisfies Stripe.Checkout.SessionCreateParams;

    let session: Stripe.Checkout.Session;
    if (request.kind === 'lifetime') {
      if (!this.config.prices.lifetime) {
        throw new ValidationError('El plan vitalicio no está disponible', 'PLAN_UNAVAILABLE');
      }
      session = await this.stripe.checkout.sessions.create({
        ...common,
        mode: 'payment',
        line_items: [{ price: this.config.prices.lifetime, quantity: 1 }],
        payment_intent_data: { metadata },
        invoice_creation: { enabled: true },
      });
    } else if (request.kind === 'renta_pass') {
      if (!this.config.prices.rentaPass) {
        throw new ValidationError('El pase de la Renta no está disponible', 'PLAN_UNAVAILABLE');
      }
      session = await this.stripe.checkout.sessions.create({
        ...common,
        mode: 'payment',
        line_items: [{ price: this.config.prices.rentaPass, quantity: 1 }],
        payment_intent_data: { metadata },
        invoice_creation: { enabled: true },
      });
    } else {
      const trialEnd =
        request.trialEnd && request.trialEnd.getTime() - Date.now() > MIN_TRIAL_MS
          ? Math.floor(request.trialEnd.getTime() / 1000)
          : undefined;
      session = await this.stripe.checkout.sessions.create({
        ...common,
        mode: 'subscription',
        line_items: [
          {
            price:
              request.kind === 'monthly' ? this.config.prices.monthly : this.config.prices.yearly,
            quantity: 1,
          },
        ],
        subscription_data: { metadata: { userId: request.userId }, trial_end: trialEnd },
      });
    }
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url, customerId };
  }

  async createPortal(customerId: string, returnUrl: string): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void> {
    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  /** Monthly or yearly, from the price of the invoice lines (the new API and the old one). */
  private planOf(lines: Stripe.InvoiceLineItem[]): 'monthly' | 'yearly' | null {
    for (const line of lines) {
      const legacy = line as unknown as { price?: { id?: string } | null };
      const price = idOf(line.pricing?.price_details?.price) ?? legacy.price?.id ?? null;
      if (price === this.config.prices.monthly) return 'monthly';
      if (price === this.config.prices.yearly) return 'yearly';
    }
    return null;
  }

  async parseWebhook(rawBody: Buffer, signature: string | undefined): Promise<BillingEvent> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature ?? '',
        this.config.webhookSecret
      );
    } catch {
      throw new ValidationError('Firma del webhook no válida', 'INVALID_SIGNATURE');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
        const customerId = idOf(session.customer);
        // One purchase, one event: the founder plan once it is paid (cards at once,
        // bank debits later), subscriptions when the payment page completes.
        if (session.metadata?.kind === 'lifetime') {
          return session.payment_status === 'paid'
            ? { id: event.id, type: 'lifetime_purchased', userId, customerId }
            : { id: event.id, type: 'ignored' };
        }
        if (session.metadata?.kind === 'renta_pass') {
          return session.payment_status === 'paid'
            ? { id: event.id, type: 'renta_pass_purchased', userId, customerId }
            : { id: event.id, type: 'ignored' };
        }
        return event.type === 'checkout.session.completed'
          ? { id: event.id, type: 'checkout_completed', userId, customerId }
          : { id: event.id, type: 'ignored' };
      }
      case 'invoice.paid': {
        // Real money for a subscription: the creator program counts it (trials and 100 %
        // discounts are paid with 0 and do not).
        const invoice = event.data.object;
        const details = invoice.parent?.subscription_details;
        const plan = this.planOf(invoice.lines?.data ?? []);
        if (invoice.amount_paid <= 0 || !details || !plan) return { id: event.id, type: 'ignored' };
        return {
          id: event.id,
          type: 'premium_paid',
          userId: details.metadata?.userId ?? null,
          customerId: idOf(invoice.customer),
          plan,
        };
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = idOf(charge.payment_intent);
        // Partial refunds keep the purchase.
        if (!charge.refunded || !paymentIntentId) return { id: event.id, type: 'ignored' };
        const { metadata } = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const customerId = idOf(charge.customer);
        if (metadata?.kind !== 'lifetime' && metadata?.kind !== 'renta_pass') {
          // A subscription payment: the access follows the subscription, the creator
          // program takes its commission back.
          return { id: event.id, type: 'premium_reversed', userId: null, customerId };
        }
        return {
          id: event.id,
          type: metadata.kind === 'renta_pass' ? 'renta_pass_refunded' : 'lifetime_refunded',
          userId: metadata.userId ?? null,
          customerId,
        };
      }
      case 'charge.dispute.created': {
        // A chargeback: only the creator program reacts (the access is handled by hand).
        const paymentIntentId = idOf(event.data.object.payment_intent);
        if (!paymentIntentId) return { id: event.id, type: 'ignored' };
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.metadata?.kind === 'renta_pass') return { id: event.id, type: 'ignored' };
        return {
          id: event.id,
          type: 'premium_reversed',
          userId: intent.metadata?.userId ?? null,
          customerId: idOf(intent.customer),
        };
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Read the live object: webhooks may arrive late or out of order.
        const sub =
          event.type === 'customer.subscription.deleted'
            ? event.data.object
            : await this.stripe.subscriptions.retrieve(event.data.object.id);
        const legacy = sub as unknown as { current_period_end?: number };
        const periodEnd = sub.items.data[0]?.current_period_end ?? legacy.current_period_end;
        return {
          id: event.id,
          type: 'subscription_changed',
          userId: sub.metadata?.userId ?? null,
          customerId: idOf(sub.customer)!,
          subscriptionId: sub.id,
          status: mapStatus(sub.status),
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end || !!sub.cancel_at,
        };
      }
      default:
        return { id: event.id, type: 'ignored' };
    }
  }
}

/** Used when Stripe is not configured: the app runs, upgrading is just unavailable. */
export class DisabledPaymentGateway implements PaymentGateway {
  readonly enabled = false;
  private fail(): never {
    throw new ValidationError('Los pagos no están configurados', 'PAYMENTS_DISABLED');
  }
  async createCheckout(): Promise<never> {
    this.fail();
  }
  async createPortal(): Promise<never> {
    this.fail();
  }
  async cancelSubscription(): Promise<void> {
    // Nothing to cancel without a provider.
  }
  async parseWebhook(): Promise<never> {
    this.fail();
  }
}
