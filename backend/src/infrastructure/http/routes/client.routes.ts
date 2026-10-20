import express, { Router } from 'express';
import { RateLimiterFactory } from '../middleware';
import { clientErrorBody } from '../schemas';

/**
 * Errors caught in the browser, written to the server log. Public (they can
 * happen before signing in) and stored nowhere else.
 */
export function clientErrorRoutes(
  limiter: RateLimiterFactory,
  logger: Pick<Console, 'warn'> = console
): Router {
  const router = Router();
  router.post('/client-errors', limiter({ windowMs: 60 * 1000, limit: 10 }), (req, res) => {
    const report = clientErrorBody.parse(req.body);
    // The query string can carry e-mail tokens (verify, reset): only the path is logged.
    const path = report.path?.split(/[?#]/)[0];
    const userAgent = req.get('user-agent')?.slice(0, 200);
    logger.warn(`[client] ${JSON.stringify({ ...report, path, userAgent })}`);
    res.status(204).end();
  });

  // Content-Security-Policy violations (`report-uri` sends application/csp-report, `report-to`
  // application/reports+json). Nothing is stored: a counter per directive and a short log line
  // with the directive and the origin/path of the blocked URL (no query, no fragment, no body).
  const cspBody = express.json({
    type: ['application/csp-report', 'application/reports+json', 'application/json'],
    limit: '16kb',
  });
  router.post('/csp-report', limiter({ windowMs: 60 * 1000, limit: 20 }), cspBody, (req, res) => {
    for (const v of cspViolations(req.body)) {
      const key = v.directive;
      cspCounts.set(key, (cspCounts.get(key) ?? 0) + 1);
      logger.warn(`[csp] ${JSON.stringify({ ...v, count: cspCounts.get(key) })}`);
    }
    res.status(204).end();
  });
  return router;
}

/** How many violations each directive has reported since the server started. */
const cspCounts = new Map<string, number>();
// A cap so a flood of made-up directives cannot grow the map.
const MAX_DIRECTIVES = 50;

const short = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.split(/[?#]/)[0].slice(0, max) : '';

function cspViolations(
  body: unknown
): { directive: string; blocked: string; page: string; disposition: string }[] {
  const entries: unknown[] = Array.isArray(body)
    ? body.map((r) => (r as { body?: unknown })?.body)
    : [(body as { 'csp-report'?: unknown } | undefined)?.['csp-report']];
  const out = [];
  for (const raw of entries.slice(0, 10)) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const directive = short(
      r.effectiveDirective ?? r['effective-directive'] ?? r['violated-directive'],
      40
    );
    if (!directive || (!cspCounts.has(directive) && cspCounts.size >= MAX_DIRECTIVES)) continue;
    out.push({
      directive,
      blocked: short(r.blockedURL ?? r['blocked-uri'], 120),
      page: short(r.documentURL ?? r['document-uri'], 120),
      disposition: short(r.disposition, 10),
    });
  }
  return out;
}
