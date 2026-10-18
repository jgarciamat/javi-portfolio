import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';

/** The Premium chapters of «Learn to invest» (a household member has the plan of its owner). */
export function learnRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const learnLimiter = limiter({ windowMs: 60 * 1000, limit: 60 });
  router.get(
    '/learn/glossary',
    learnLimiter,
    authed((req, res) => {
      res.set('Cache-Control', 'private, no-store');
      res.json(c.learn.glossary(req.dataUserId));
    })
  );
  router.get(
    '/learn/chapters/:id',
    learnLimiter,
    authed((req, res) => {
      res.set('Cache-Control', 'private, no-store');
      res.json(c.learn.chapter(req.dataUserId, String(req.params.id)));
    })
  );
  return router;
}
