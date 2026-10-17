import express, { Router } from 'express';
import { Container } from '../../container';
import { asyncHandler, RateLimiterFactory } from '../middleware';
import { inboundMailBody } from '../schemas';

/**
 * The e-mail service (a Cloudflare Email Worker, for instance) posts every message sent to a
 * receipts address here. It is authenticated with a shared secret, not with a user session.
 */
export function inboundMailRoute(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  router.post(
    '/inbound/email',
    limiter({ windowMs: 60 * 1000, limit: 60 }),
    // The secret is checked before the body is read, so anonymous callers cost nothing.
    (req, _res, next) => {
      c.inbox.assertAuthorized(req.header('x-inbound-secret'));
      next();
    },
    express.json({ limit: '1mb' }),
    asyncHandler(async (req, res) => {
      const mail = inboundMailBody.parse(req.body);
      const status = await c.inbox.receive(req.header('x-inbound-secret'), mail);
      res.json({ status });
    })
  );
  return router;
}
