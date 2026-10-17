import { PaymentRequiredError } from '@domain/errors';
import {
  RENTA_PASS_DAYS,
  SubscriptionProps,
  TRIAL_DAYS,
  emptySubscription,
  newTrial,
} from '@domain/model/Subscription';
import { RentaPassRepository, SubscriptionRepository } from '@domain/ports/repositories';
import { EntitlementService } from '@application/billing/EntitlementService';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-05-10T10:00:00.000Z');
const later = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

function setup({ draftOpen = false } = {}) {
  const subs = new Map<string, SubscriptionProps>();
  const passes = new Map<string, string>();
  const subscriptions: SubscriptionRepository = {
    get: (id) => subs.get(id) ?? null,
    save: (s) => void subs.set(s.userId, s),
    findByStripeCustomer: () => null,
    findByStripeSubscription: () => null,
    countLifetime: () => 0,
  };
  const passRepo: RentaPassRepository = {
    endsAt: (id) => passes.get(id) ?? null,
    set: (id, endsAt) => void passes.set(id, endsAt),
    remove: (id) => void passes.delete(id),
  };
  const clock = { now: () => NOW };
  const service = draftOpen
    ? new EntitlementService(subscriptions, clock, passRepo, true)
    : new EntitlementService(subscriptions, clock, passRepo);
  return { service, subs, passes };
}

/** The error a call throws (fails the test when it does not throw). */
function thrown(fn: () => void): PaymentRequiredError {
  try {
    fn();
  } catch (e) {
    return e as PaymentRequiredError;
  }
  throw new Error('expected an error');
}

const paid = (userId: string, extra: Partial<SubscriptionProps> = {}): SubscriptionProps => ({
  ...emptySubscription(userId, NOW),
  status: 'active',
  source: 'stripe',
  currentPeriodEnd: later(20),
  ...extra,
});

describe('EntitlementService', () => {
  it('a user without subscription is on the free plan, with its limits', () => {
    const { service } = setup();
    expect(service.plan('u1')).toBe('free');
    expect(service.isPremium('u1')).toBe(false);
    expect(service.status('u1')).toEqual(
      expect.objectContaining({ plan: 'free', subscription: null, trialDaysLeft: 0 })
    );
    expect(service.limits('u1').resources.assets).toBe(1);
  });

  it('blocks Premium features and the creation past the free limit, saying which one', () => {
    const { service } = setup();
    expect(() => service.assertFeature('u1', 'insights')).toThrow(PaymentRequiredError);
    expect(thrown(() => service.assertFeature('u1', 'forecast'))).toEqual(
      expect.objectContaining({ code: 'PREMIUM_REQUIRED', details: { feature: 'forecast' } })
    );
    expect(() => service.assertCanCreate('u1', 'assets', 0)).not.toThrow();
    expect(() => service.assertCanCreate('u1', 'assets', 1)).toThrow(
      'Has llegado al máximo del plan gratuito para inversiones y deudas: 1'
    );
    expect(thrown(() => service.assertCanCreate('u1', 'accounts', 2))).toEqual(
      expect.objectContaining({ code: 'PLAN_LIMIT', details: { resource: 'accounts', limit: 2 } })
    );
  });

  it('a paying user has every feature and no limits', () => {
    const { service, subs } = setup();
    subs.set('u1', paid('u1'));
    expect(service.isPremium('u1')).toBe(true);
    expect(() => service.assertFeature('u1', 'insights')).not.toThrow();
    expect(() => service.assertCanCreate('u1', 'assets', 500)).not.toThrow();
  });

  it('gives the trial only once and counts its days', () => {
    const { service, subs } = setup();
    service.grantTrial('u1');
    expect(subs.get('u1')?.status).toBe('trialing');
    expect(service.status('u1').trialDaysLeft).toBe(TRIAL_DAYS);
    subs.set('u1', { ...subs.get('u1')!, trialEndsAt: later(-1), status: 'canceled' });
    service.grantTrial('u1');
    expect(subs.get('u1')?.status).toBe('canceled');
    expect(service.plan('u1')).toBe('free');
  });

  describe('grantDays (invitations)', () => {
    it('starts a trial from today for a user without subscription', () => {
      const { service, subs } = setup();
      expect(service.grantDays('u1', 7)).toBe(true);
      expect(subs.get('u1')).toEqual(
        expect.objectContaining({ status: 'trialing', trialEndsAt: later(7) })
      );
    });

    it('adds the days after a trial that has not ended, keeping the status', () => {
      const { service, subs } = setup();
      subs.set('u1', newTrial('u1', NOW));
      service.grantDays('u1', 7);
      expect(subs.get('u1')?.trialEndsAt).toBe(later(TRIAL_DAYS + 7));
      subs.set('u2', paid('u2', { trialEndsAt: later(-30) }));
      service.grantDays('u2', 3);
      expect(subs.get('u2')).toEqual(
        expect.objectContaining({ status: 'active', trialEndsAt: later(3) })
      );
    });

    it('does nothing for lifetime users', () => {
      const { service, subs } = setup();
      const lifetime = paid('u1', { lifetime: true, source: 'lifetime' });
      subs.set('u1', lifetime);
      expect(service.grantDays('u1', 7)).toBe(false);
      expect(subs.get('u1')).toBe(lifetime);
    });
  });

  describe('Renta pass', () => {
    it('lasts a month from today, or after the pass the user still has', () => {
      const { service, passes } = setup();
      expect(service.grantRentaPass('u1')).toBe(later(RENTA_PASS_DAYS));
      expect(service.grantRentaPass('u1')).toBe(later(2 * RENTA_PASS_DAYS));
      passes.set('u2', later(-5));
      expect(service.grantRentaPass('u2')).toBe(later(RENTA_PASS_DAYS));
      service.revokeRentaPass('u1');
      expect(passes.has('u1')).toBe(false);
    });

    it('opens the draft reader with an active pass', () => {
      const { service } = setup();
      expect(service.rentaAccess('u1').draft).toEqual({ allowed: false, reason: null });
      service.grantRentaPass('u1');
      expect(service.rentaAccess('u1')).toEqual(
        expect.objectContaining({
          draft: { allowed: true, reason: 'pass' },
          passUntil: later(RENTA_PASS_DAYS),
        })
      );
    });

    it('in local development the draft reader is open to everybody', () => {
      const { service, subs } = setup({ draftOpen: true });
      expect(service.rentaAccess('u1').draft).toEqual({ allowed: true, reason: 'pass' });
      // Already allowed: kept as it is.
      subs.set('u2', paid('u2', { paidSince: later(-90) }));
      expect(service.rentaAccess('u2').draft).toEqual({ allowed: true, reason: 'premium' });
    });
  });
});
