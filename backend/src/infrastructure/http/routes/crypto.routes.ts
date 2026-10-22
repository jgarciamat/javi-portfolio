import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  cryptoCandlesQuery,
  cryptoOrderBody,
  cryptoOrderParams,
  cryptoResetBody,
  cryptoSettingsBody,
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
    authed(async (req, res) => res.json(await c.cryptoSim.portfolio(req.userId)))
  );
  router.post(
    '/crypto/sim/orders',
    writes,
    authed(async (req, res) => {
      const order = cryptoOrderBody.parse(req.body);
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
      res.status(201).json(await c.cryptoSim.place(req.userId, input));
    })
  );
  router.delete(
    '/crypto/sim/orders/:id',
    writes,
    authed(async (req, res) =>
      res.json(await c.cryptoSim.cancel(req.userId, cryptoOrderParams.parse(req.params).id))
    )
  );
  router.post(
    '/crypto/sim/reset',
    writes,
    authed(async (req, res) => {
      const { initial, feeBps } = cryptoResetBody.parse(req.body);
      res.json(await c.cryptoSim.reset(req.userId, initial, feeBps));
    })
  );
  router.patch(
    '/crypto/sim/settings',
    writes,
    authed(async (req, res) =>
      res.json(await c.cryptoSim.setFee(req.userId, cryptoSettingsBody.parse(req.body).feeBps))
    )
  );
  return router;
}
