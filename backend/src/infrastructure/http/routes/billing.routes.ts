import express, { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, asyncHandler, authed } from '../middleware';
import { checkoutBody, offerParams } from '../schemas';

/**
 * Stripe calls this with a signed raw body, so it is mounted before the JSON
 * parser and outside authentication.
 */
export function billingWebhookRoute(c: Container): Router {
  const router = Router();
  router.post(
    '/billing/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    asyncHandler(async (req, res) => {
      await c.billing.handleWebhook(req.body as Buffer, req.header('stripe-signature'));
      res.json({ received: true });
    })
  );
  return router;
}

/** Plans and prices, for the public pricing page. */
export function publicBillingRoutes(c: Container): Router {
  const router = Router();
  router.get('/billing/plans', (_req, res) => {
    res.json(c.billing.catalog());
  });
  return router;
}

export function billingRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const paymentsLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? '',
  });

  router.get(
    '/billing',
    authed((req, res) => {
      // An invited user who has just finished the first steps makes the invitation count.
      c.referrals.reward(req.userId);
      const own = c.billing.overview(req.userId);
      const household = c.household.status(req.userId);
      if (req.dataUserId === req.userId) return res.json({ ...own, household });
      // Someone working in a household uses the plan, limits and quota of its owner.
      const shared = c.billing.overview(req.dataUserId);
      return res.json({
        ...own,
        plan: shared.plan,
        trialDaysLeft: shared.trialDaysLeft,
        limits: shared.limits,
        usage: shared.usage,
        ai: shared.ai,
        subscription: { ...shared.subscription, canManage: false },
        household,
      });
    })
  );
  router.post(
    '/billing/checkout',
    paymentsLimiter,
    authed(async (req, res) => {
      const { kind, ...consent } = checkoutBody.parse(req.body);
      const result = await c.billing.checkout(req.userId, kind, consent);
      c.repos.metrics.record('checkout_started');
      res.json(result);
    })
  );
  router.post(
    '/billing/portal',
    paymentsLimiter,
    authed(async (req, res) => res.json(await c.billing.portal(req.userId)))
  );

  router.get(
    '/offers',
    authed((req, res) => res.json(c.offers.list(req.userId)))
  );
  router.post(
    '/offers/:id/click',
    authed((req, res) => res.json(c.offers.click(req.userId, offerParams.parse(req.params).id)))
  );
  return router;
}
