import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  cryptoAlertBody,
  cryptoCandlesQuery,
  cryptoOrderBody,
  cryptoOrderParams,
  cryptoPortfolioParams,
  cryptoRankingBody,
  cryptoResetBody,
  cryptoSeasonParams,
  cryptoSimQuery,
} from '../schemas';

/**
 * «Consola crypto»: public market data through the server (the app never calls the source
 * directly: one cache for everybody, no keys, no third party in the browser) and the
 * simulator with play money of the signed-in person (`userId`, also inside a household).
 */
export function cryptoRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const byUser = (limit: number) =>
    limiter({
      windowMs: 60 * 1000,
      limit,
      keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? '',
    });
  const reads = byUser(120);
  const writes = byUser(30);

  router.get(
    '/crypto/coins',
    reads,
    authed(async (_req, res) => {
      res.set('Cache-Control', 'private, max-age=15');
      res.json(await c.cryptoMarket.coins());
    })
  );
  router.get(
    '/crypto/candles',
    reads,
    authed(async (req, res) => {
      const { symbol, interval } = cryptoCandlesQuery.parse(req.query);
      res.set('Cache-Control', 'private, max-age=15');
      res.json(await c.cryptoMarket.candles(symbol, interval));
    })
  );

  router.get(
    '/crypto/sim',
    reads,
    authed(async (req, res) =>
      res.json(await c.cryptoSim.portfolio(req.userId, cryptoSimQuery.parse(req.query).portfolio))
    )
  );
  router.post(
    '/crypto/sim/orders',
    writes,
    authed(async (req, res) => {
      const { portfolioId, ...order } = cryptoOrderBody.parse(req.body);
      const input =
        order.action === 'buy'
          ? {
              action: order.action,
              symbol: order.symbol,
              direction: order.direction,
              type: order.type,
              amountCents: order.amount,
              price: order.price,
              takeProfit: order.takeProfit,
              stopLoss: order.stopLoss,
            }
          : order;
      res.status(201).json(await c.cryptoSim.place(req.userId, input, portfolioId));
    })
  );
  router.delete(
    '/crypto/sim/orders/:id',
    writes,
    authed(async (req, res) =>
      res.json(await c.cryptoSim.cancel(req.userId, cryptoOrderParams.parse(req.params).id))
    )
  );
  // «Start again» only exists for practice portfolios: the official season never restarts.
  router.post(
    '/crypto/sim/reset',
    writes,
    authed(async (req, res) => {
      const { portfolioId } = cryptoResetBody.parse(req.body);
      res.json(await c.cryptoSim.resetPractice(req.userId, portfolioId));
    })
  );
  router.post(
    '/crypto/sim/practice',
    writes,
    authed(async (req, res) => res.status(201).json(await c.cryptoSim.createPractice(req.userId)))
  );
  router.delete(
    '/crypto/sim/practice/:id',
    writes,
    authed(async (req, res) =>
      res.json(
        await c.cryptoSim.deletePractice(req.userId, cryptoPortfolioParams.parse(req.params).id)
      )
    )
  );

  // The voluntary monthly ranking: only aliases, never e-mails, names or ids.
  router.get(
    '/crypto/ranking',
    reads,
    authed(async (req, res) => res.json(await c.cryptoRanking.ranking(req.userId)))
  );
  router.put(
    '/crypto/ranking/settings',
    writes,
    authed(async (req, res) =>
      res.json(await c.cryptoRanking.setSettings(req.userId, cryptoRankingBody.parse(req.body)))
    )
  );

  // Premium comforts (no edge in the ranking): the season report and price alerts.
  router.get(
    '/crypto/seasons/:season/report',
    reads,
    authed(async (req, res) => {
      const { season } = cryptoSeasonParams.parse(req.params);
      c.entitlements.assertFeature(req.userId, 'cryptoPro');
      res.json(await c.cryptoSim.report(req.userId, season));
    })
  );
  router.get(
    '/crypto/alerts',
    reads,
    authed(async (req, res) => res.json(c.cryptoAlerts.list(req.userId)))
  );
  router.post(
    '/crypto/alerts',
    writes,
    authed(async (req, res) =>
      res.status(201).json(c.cryptoAlerts.create(req.userId, cryptoAlertBody.parse(req.body)))
    )
  );
  router.delete(
    '/crypto/alerts/:id',
    writes,
    authed(async (req, res) =>
      res.json(c.cryptoAlerts.remove(req.userId, cryptoPortfolioParams.parse(req.params).id))
    )
  );
  return router;
}
