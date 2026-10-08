import { Router } from 'express';
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
  return router;
}
