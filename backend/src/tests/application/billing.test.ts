import { ConflictError } from '@domain/errors';
import {
  SubscriptionProps,
  TERMS_VERSION,
  emptySubscription,
  newTrial,
} from '@domain/model/Subscription';
import { User } from '@domain/model/User';
import {
  BillingEventRepository,
  RentaPassRepository,
  SubscriptionRepository,
  UserRepository,
} from '@domain/ports/repositories';
import { BillingEvent, CheckoutRequest, EmailSender, PaymentGateway } from '@domain/ports/services';
import { AiAllowance } from '@application/ai/AiAllowance';
import { BillingOptions, BillingService, ResourceUsage } from '@application/billing/BillingService';
import { EntitlementService } from '@application/billing/EntitlementService';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-10T10:00:00.000Z');
const later = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
const CONSENT = { acceptTerms: true, waiveWithdrawal: true };

class Gateway implements PaymentGateway {
  enabled = true;
  checkouts: CheckoutRequest[] = [];
  cancelled: { subscriptionId: string; atPeriodEnd: boolean }[] = [];
  /** The provider may not hand back a customer (Stripe creates it on payment). */
  customerId: string | null = 'cus_new';
  event: BillingEvent | null = null;
  failCancel = false;

  async createCheckout(request: CheckoutRequest) {
    this.checkouts.push(request);
    return { url: `https://checkout.test/${request.kind}`, customerId: this.customerId };
  }
  async createPortal(customerId: string) {
    return { url: `https://portal.test/${customerId}` };
  }
  async parseWebhook(): Promise<BillingEvent> {
    return this.event!;
  }
  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean) {
    if (this.failCancel) throw new Error('provider down');
    this.cancelled.push({ subscriptionId, atPeriodEnd });
  }
}

function setup(options: Partial<BillingOptions> = {}) {
  const subs = new Map<string, SubscriptionProps>();
  const passes = new Map<string, string>();
  const processed = new Set<string>();
  const users = new Map<string, User>([
    ['u1', { id: 'u1', email: 'ana@test.dev', name: 'Ana' } as User],
  ]);
  const subscriptions: SubscriptionRepository = {
    get: (id) => subs.get(id) ?? null,
    save: (s) => void subs.set(s.userId, s),
    findByStripeCustomer: (c) => [...subs.values()].find((s) => s.stripeCustomerId === c) ?? null,
    findByStripeSubscription: (id) =>
      [...subs.values()].find((s) => s.stripeSubscriptionId === id) ?? null,
    countLifetime: () => [...subs.values()].filter((s) => s.lifetime).length,
  };
  const passRepo: RentaPassRepository = {
    endsAt: (id) => passes.get(id) ?? null,
    set: (id, endsAt) => void passes.set(id, endsAt),
    remove: (id) => void passes.delete(id),
  };
  const events: BillingEventRepository = {
    wasProcessed: (id) => processed.has(id),
    markProcessed: (id) => void processed.add(id),
  };
  const clock = { now: () => NOW };
  const entitlements = new EntitlementService(subscriptions, clock, passRepo);
  const gateway = new Gateway();
  const mails: string[] = [];
  const email = {
    sendPurchaseConfirmation: async (to: string) => void mails.push(to),
  } as unknown as EmailSender;
  const logger = { error: jest.fn(), warn: jest.fn() };
  const usage = { accounts: 1, movements: 3 } as ResourceUsage;
  const service = new BillingService(
    subscriptions,
    events,
    { findById: (id: string) => users.get(id) ?? null } as UserRepository,
    entitlements,
    { quota: () => ({ used: 0, limit: 1 }) } as unknown as AiAllowance,
    gateway,
    email,
    () => usage,
    () => [{ year: 2026, quarter: 1, used: 1, territory: 'general', territoryExtraUsed: false }],
    () => 'es',
    { run: (work) => work() },
    clock,
    {
      appUrl: 'https://app.test',
      displayPrices: { monthly: 3.49, yearly: 29.99, lifetime: 59, rentaPass: 10 },
      founderLimit: 1,
      lifetimeConfigured: true,
      rentaPassConfigured: true,
      metrics: { record: jest.fn() },
      ...options,
    },
    logger
  );
  const webhook = (event: BillingEvent) => {
    gateway.event = event;
    return service.handleWebhook(Buffer.from('{}'), 'sig');
  };
  return { service, subs, passes, gateway, mails, logger, webhook };
}

const live = (extra: Partial<SubscriptionProps> = {}): SubscriptionProps => ({
  ...emptySubscription('u1', NOW),
  status: 'active',
  source: 'stripe',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  currentPeriodEnd: later(20),
  ...extra,
});

describe('BillingService', () => {
  describe('terms of sale', () => {
    it('asks nothing of someone who never accepted them, and records nothing', () => {
      const { service, subs } = setup();
      expect(service.overview('u1').terms).toEqual({
        version: TERMS_VERSION,
        acceptedVersion: null,
        acceptedAt: null,
        mustAccept: false,
      });
      expect(service.acceptTerms('u1').mustAccept).toBe(false);
      expect(subs.has('u1')).toBe(false);
    });

    it('asks whoever accepted an earlier version to accept the current one, and keeps the proof', () => {
      const { service, subs } = setup();
      subs.set(
        'u1',
        live({ termsVersion: '2026-01-01', termsAcceptedAt: '2026-01-01T00:00:00.000Z' })
      );
      expect(service.overview('u1').terms).toMatchObject({
        acceptedVersion: '2026-01-01',
        mustAccept: true,
      });
      expect(service.acceptTerms('u1')).toEqual({
        version: TERMS_VERSION,
        acceptedVersion: TERMS_VERSION,
        acceptedAt: NOW.toISOString(),
        mustAccept: false,
      });
      expect(subs.get('u1')).toMatchObject({
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: NOW.toISOString(),
        status: 'active',
        stripeSubscriptionId: 'sub_1',
      });
      expect(service.overview('u1').terms.mustAccept).toBe(false);
    });
  });

  describe('catalog and overview', () => {
    it('includes the self-employed drafts of each quarter that can be drafted', () => {
      expect(setup().service.overview('u1').autonomoQuarters).toEqual([
        { year: 2026, quarter: 1, used: 1, territory: 'general', territoryExtraUsed: false },
      ]);
    });

    it('shows a user without subscription as free, with an empty subscription', () => {
      const { service } = setup();
      const overview = service.overview('u1');
      expect(overview.plan).toBe('free');
      expect(overview.subscription).toEqual(
        expect.objectContaining({ status: 'none', canManage: false, lifetime: false })
      );
      expect(overview.usage).toEqual({ accounts: 1, movements: 3 });
      expect(overview.limits.resources.assets).toBe(3);
    });

    it('sells the founder plan and the pass only when payments and prices are set up', () => {
      expect(setup().service.catalog()).toEqual(
        expect.objectContaining({
          rentaPass: { available: true },
          lifetime: { available: true, remaining: 1 },
        })
      );
      const off = setup({ lifetimeConfigured: false, rentaPassConfigured: false });
      expect(off.service.catalog().lifetime.available).toBe(false);
      expect(off.service.catalog().rentaPass.available).toBe(false);
      const sold = setup();
      sold.subs.set('u9', { ...live(), userId: 'u9', lifetime: true });
      expect(sold.service.catalog().lifetime).toEqual({ available: false, remaining: 0 });
    });
  });

  describe('checkout', () => {
    it('keeps the trial running until its end and records the new customer', async () => {
      const { service, subs, gateway } = setup();
      subs.set('u1', newTrial('u1', NOW));
      await expect(service.checkout('u1', 'monthly', CONSENT)).resolves.toEqual({
        url: 'https://checkout.test/monthly',
      });
      expect(gateway.checkouts[0].trialEnd).toEqual(new Date(subs.get('u1')!.trialEndsAt!));
      expect(subs.get('u1')!.stripeCustomerId).toBe('cus_new');
    });

    it('keeps the known customer when the provider does not return one', async () => {
      const { service, subs, gateway } = setup();
      subs.set('u1', { ...live({ status: 'canceled' }), stripeCustomerId: 'cus_old' });
      gateway.customerId = null;
      await service.checkout('u1', 'yearly', CONSENT);
      expect(gateway.checkouts[0]).toEqual(
        expect.objectContaining({ customerId: 'cus_old', trialEnd: null })
      );
      expect(subs.get('u1')!.stripeCustomerId).toBe('cus_old');
    });

    it('refuses to sell what the user already has', async () => {
      const { service, subs } = setup();
      await expect(service.checkout('nobody', 'monthly', CONSENT)).rejects.toThrow(
        'Usuario no encontrado'
      );
      subs.set('u1', live({ lifetime: true }));
      await expect(service.checkout('u1', 'monthly', CONSENT)).rejects.toThrow(ConflictError);
      subs.set('u1', live({ source: 'google', stripeSubscriptionId: null }));
      await expect(service.checkout('u1', 'yearly', CONSENT)).rejects.toThrow(/Google Play/);
      subs.set('u1', live());
      await expect(service.checkout('u1', 'monthly', CONSENT)).rejects.toThrow(
        /Ya tienes una suscripción/
      );
    });

    it('lets a subscriber buy the founder plan while it lasts', async () => {
      const { service, subs, gateway } = setup();
      subs.set('u1', live());
      await service.checkout('u1', 'lifetime', CONSENT);
      expect(gateway.checkouts.map((c) => c.kind)).toEqual(['lifetime']);
      subs.set('u9', { ...live(), userId: 'u9', lifetime: true });
      await expect(service.checkout('u1', 'lifetime', CONSENT)).rejects.toThrow(
        'El plan fundador ya no está disponible'
      );
    });

    it('sells the Renta pass unless the draft reader is included or the pass is off', async () => {
      const { service, subs, gateway } = setup();
      gateway.customerId = null;
      await expect(service.checkout('u1', 'renta_pass', CONSENT)).resolves.toEqual({
        url: 'https://checkout.test/renta_pass',
      });
      expect(gateway.checkouts[0].successUrl).toBe('https://app.test/?billing=success&renta=1');
      expect(subs.get('u1')).toEqual(
        expect.objectContaining({ stripeCustomerId: null, termsVersion: expect.any(String) })
      );

      subs.set('u1', live({ paidSince: later(-90) }));
      await expect(service.checkout('u1', 'renta_pass', CONSENT)).rejects.toThrow(
        'Tu Premium ya incluye leer el borrador'
      );

      const off = setup({ rentaPassConfigured: false });
      await expect(off.service.checkout('u1', 'renta_pass', CONSENT)).rejects.toThrow(
        'El pase de la Renta no está disponible'
      );
    });
  });

  describe('account deletion', () => {
    it('cancels a live subscription at once, and fails loudly when it cannot', async () => {
      const { service, subs, gateway, logger } = setup();
      await service.cancelBeforeAccountDeletion('u1');
      subs.set('u1', live({ status: 'canceled' }));
      await service.cancelBeforeAccountDeletion('u1');
      expect(gateway.cancelled).toEqual([]);

      subs.set('u1', live());
      await service.cancelBeforeAccountDeletion('u1');
      expect(gateway.cancelled).toEqual([{ subscriptionId: 'sub_1', atPeriodEnd: false }]);

      gateway.failCancel = true;
      await expect(service.cancelBeforeAccountDeletion('u1')).rejects.toThrow(
        /No hemos podido cancelar/
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('webhooks', () => {
    const changed = (extra: Partial<Extract<BillingEvent, { type: 'subscription_changed' }>>) =>
      ({
        id: 'evt_sub',
        type: 'subscription_changed',
        userId: 'u1',
        customerId: 'cus_1',
        subscriptionId: 'sub_1',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        ...extra,
      }) as BillingEvent;

    it('ignores events without a known user', async () => {
      const { webhook, logger, mails, subs } = setup();
      for (const type of ['renta_pass_purchased', 'lifetime_purchased'] as const) {
        await webhook({ id: `evt_${type}`, type, userId: 'ghost', customerId: 'cus_ghost' });
      }
      await webhook({ id: 'evt_ref', type: 'renta_pass_refunded', userId: null, customerId: null });
      await webhook(changed({ id: 'evt_orphan', userId: null, customerId: 'cus_x' }));
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(mails).toEqual([]);
      expect(subs.size).toBe(0);
    });

    it('keeps a lifetime user active and stops the subscription that still renews', async () => {
      const { webhook, subs, gateway } = setup();
      subs.set('u1', live({ lifetime: true, source: 'lifetime', stripeSubscriptionId: null }));
      await webhook(changed({ status: 'trialing', currentPeriodEnd: new Date(later(30)) }));
      expect(subs.get('u1')).toEqual(
        expect.objectContaining({
          source: 'lifetime',
          status: 'active',
          stripeSubscriptionId: 'sub_1',
          currentPeriodEnd: later(30),
        })
      );
      expect(gateway.cancelled).toEqual([{ subscriptionId: 'sub_1', atPeriodEnd: true }]);

      // Already set to end: nothing more to stop.
      await webhook(changed({ id: 'evt_2', cancelAtPeriodEnd: true }));
      expect(gateway.cancelled).toHaveLength(1);
    });

    it('logs, without failing, when the old subscription cannot be stopped', async () => {
      const { webhook, subs, gateway, logger, mails } = setup();
      subs.set('u1', live());
      gateway.failCancel = true;
      await webhook({ id: 'evt_life', type: 'lifetime_purchased', userId: 'u1', customerId: null });
      expect(subs.get('u1')).toEqual(
        expect.objectContaining({ lifetime: true, stripeCustomerId: 'cus_1' })
      );
      expect(logger.error).toHaveBeenCalledWith(
        '[billing] could not stop the old subscription',
        expect.any(Error)
      );
      expect(mails).toEqual(['ana@test.dev']);
    });

    it('does not stop anything when the founder plan replaces a subscription already ending', async () => {
      const { webhook, subs, gateway } = setup();
      subs.set('u1', live({ cancelAtPeriodEnd: true }));
      await webhook({ id: 'evt_life', type: 'lifetime_purchased', userId: 'u1', customerId: null });
      expect(gateway.cancelled).toEqual([]);
    });

    it('tells the creator program about first payments and refunds, when it is wired', async () => {
      // Without the program nothing breaks.
      await setup().webhook({
        id: 'evt_p0',
        type: 'premium_paid',
        userId: 'u1',
        customerId: null,
        plan: 'yearly',
      });
      await setup().webhook({
        id: 'evt_r0',
        type: 'premium_reversed',
        userId: 'u1',
        customerId: null,
      });
      await setup().webhook({
        id: 'evt_l0',
        type: 'lifetime_refunded',
        userId: 'u1',
        customerId: null,
      });
      const creators = { recordSale: jest.fn(), reverseSale: jest.fn() };
      const { webhook } = setup({ creators });
      await webhook({
        id: 'evt_p1',
        type: 'premium_paid',
        userId: 'u1',
        customerId: null,
        plan: 'monthly',
      });
      await webhook({ id: 'evt_l1', type: 'lifetime_purchased', userId: 'u1', customerId: null });
      await webhook({ id: 'evt_r1', type: 'premium_reversed', userId: 'u1', customerId: null });
      await webhook({ id: 'evt_l2', type: 'lifetime_refunded', userId: 'u1', customerId: null });
      expect(creators.recordSale.mock.calls).toEqual([
        ['u1', 'monthly', 'stripe'],
        ['u1', 'lifetime', 'stripe'],
      ]);
      expect(creators.reverseSale.mock.calls).toEqual([['u1'], ['u1']]);
    });
  });
});
