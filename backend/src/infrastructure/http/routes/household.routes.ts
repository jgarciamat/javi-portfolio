import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import { householdCodeParams, householdJoinBody, memberParams } from '../schemas';

/** Share the data with one more person: invitation, joining, leaving and removing. */
export function householdRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const hourly = limiter({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? '',
  });

  router.get(
    '/household',
    authed((req, res) => res.json(c.household.status(req.userId)))
  );
  router.post(
    '/household/invite',
    hourly,
    authed((req, res) => res.status(201).json(c.household.invite(req.userId)))
  );
  router.delete(
    '/household/invite',
    authed((req, res) => {
      c.household.cancelInvite(req.userId);
      res.status(204).end();
    })
  );
  // The code travels in the body so it never ends up in URLs and access logs.
  router.post(
    '/household/invite/preview',
    hourly,
    authed((req, res) => res.json(c.household.preview(householdJoinBody.parse(req.body).code)))
  );
  /** @deprecated Older app versions: the code is in the path. */
  router.get(
    '/household/invite/:code',
    hourly,
    authed((req, res) => res.json(c.household.preview(householdCodeParams.parse(req.params).code)))
  );
  router.post(
    '/household/join',
    hourly,
    authed((req, res) => {
      c.household.join(req.userId, householdJoinBody.parse(req.body).code);
      c.repos.metrics.record('household_joined');
      res.status(204).end();
    })
  );
  router.delete(
    '/household/membership',
    authed((req, res) => {
      c.household.leave(req.userId);
      res.status(204).end();
    })
  );
  router.delete(
    '/household/members/:id',
    authed((req, res) => {
      c.household.remove(req.userId, memberParams.parse(req.params).id);
      res.status(204).end();
    })
  );
  return router;
}
