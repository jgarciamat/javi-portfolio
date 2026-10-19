import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import { autonomoDataBody } from '../schemas';

/**
 * The self-employed form saved in the account (only when the user turns it on). It is the user's
 * own tax data, so it goes by `req.userId`, not by the household owner: each member who is
 * self-employed keeps their own invoices, and nobody else in the household can read them.
 */
export function businessDataRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  // Saves come debounced while typing: room for a busy session, not for a loop. Per user: the
  // router sits behind the authentication, so the id is always there.
  const writes = limiter({
    windowMs: 60 * 1000,
    limit: 60,
    keyGenerator: (req) => (req as unknown as { userId: string }).userId,
  });

  router.get(
    '/business/data',
    authed((req, res) => res.json(c.autonomoData.get(req.userId)))
  );
  router.put(
    '/business/data',
    writes,
    authed((req, res) => {
      const { data, baseVersion } = autonomoDataBody.parse(req.body);
      res.json(c.autonomoData.save(req.userId, data, baseVersion));
    })
  );
  router.delete(
    '/business/data',
    writes,
    authed((req, res) => {
      c.autonomoData.delete(req.userId);
      res.status(204).end();
    })
  );
  return router;
}
