import { Router } from 'express';
import { ForbiddenError } from '@domain/errors';
import { PREMIUM_VIDEO_IDS } from '@domain/services/premium-videos';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';

/** The YouTube ids of the Premium videos of the «Videoteca», for Premium users only. */
export function videoRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  router.get(
    '/videos/premium',
    limiter({ windowMs: 60 * 1000, limit: 30 }),
    authed((req, res) => {
      // A household member has the plan of its owner, as everywhere else.
      if (!c.entitlements.isPremium(req.dataUserId)) {
        throw new ForbiddenError('Estos vídeos son parte de Premium', 'PREMIUM_REQUIRED');
      }
      // Unlisted links: not to be kept by shared caches nor after the plan ends.
      res.set('Cache-Control', 'private, no-store');
      res.json({ ...PREMIUM_VIDEO_IDS });
    })
  );
  return router;
}
