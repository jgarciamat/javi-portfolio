import { Router } from 'express';
import { normalizeOrigin } from '@application/analytics/origin';
import { Container } from '../../container';
import { RateLimiterFactory } from '../middleware';
import { funnelBody, funnelOrigin } from '../schemas';

/** Crawlers and headless browsers that run scripts: their visits are not people. */
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget/i;

/** Our own host names: a link from one of our pages is not an origin. */
export function ownHosts(c: Container): string[] {
  const hosts = [c.config.appUrl, ...c.config.corsOrigins].map((url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  });
  return [...new Set(hosts.filter(Boolean))];
}

/**
 * A new account in the funnel (`signup` and the 14-day trial that starts with it), by the origin
 * that came in the sign-up request itself. Nothing is stored with the account; an origin that does
 * not validate counts as `(unknown)` and never blocks the sign-up.
 */
export function recordSignup(c: Container, origin: unknown): void {
  const parsed = funnelOrigin.safeParse(origin);
  const dims = parsed.success ? normalizeOrigin(parsed.data, ownHosts(c)) : {};
  c.repos.funnel.record('signup', dims);
  c.repos.funnel.record('trial_start', dims);
}

/**
 * Anonymous funnel events from the browser (docs/analitica.md). Public, like the client errors:
 * most happen before signing in. Only a counter per day, event and origin is kept: no IP, no user
 * agent, no identifier (the IP is only held in memory by the rate limiter for one minute).
 */
export function funnelRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  router.post('/funnel', limiter({ windowMs: 60 * 1000, limit: 30 }), (req, res) => {
    const { event, guide, detail, ...origin } = funnelBody.parse(req.body);
    if (!BOTS.test(req.get('user-agent') ?? '')) {
      c.repos.funnel.record(event, {
        ...normalizeOrigin(origin, ownHosts(c)),
        detail: guide ?? detail ?? '',
      });
    }
    res.status(204).end();
  });
  return router;
}
