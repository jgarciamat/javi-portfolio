import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  cryptoAlertBody,
  cryptoCandlesQuery,
  cryptoDrawingParams,
  cryptoDrawingsBody,
  cryptoExitsBody,
  cryptoOrderBody,
  cryptoOrderParams,
  cryptoPortfolioParams,
  cryptoRankingBody,
  cryptoResetBody,
  cryptoSeasonParams,
  cryptoSimQuery,
  cryptoTransferBody,
} from '../schemas';

/** Live ticks a person may ask for per minute (the chart asks 30: one every 2 s). */
export const LIVE_PER_MINUTE = 60;

/** Practice results a person may add to an account per minute. */
export const TRANSFERS_PER_MINUTE = 10;

/** Live ticks per minute from one network (an office or a home behind one IP). */
export const LIVE_PER_NETWORK = 1200;

/** The live tick is counted apart from the API's general limit per network (see app.ts). */
export const isLiveTick = (req: { method: string; path: string }): boolean =>
  req.method === 'GET' && req.path === '/crypto/live';

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
  // Drawings are saved a moment after each change (undo included): their own, wider budget.
  const drawingWrites = byUser(60);
  // The live tick of the chart (every 2 s while it is on screen): its own budget, so it never
  // takes the reads of the rest of the console. Two windows at once still fit.
  const liveReads = byUser(LIVE_PER_MINUTE);
  // Adding a practice result to an account writes a real movement: a few a minute is plenty.
  const transferWrites = byUser(TRANSFERS_PER_MINUTE);

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
    '/crypto/live',
    liveReads,
    authed(async (req, res) => {
      const { symbol, interval } = cryptoCandlesQuery.parse(req.query);
      res.set('Cache-Control', 'no-store');
      res.json(await c.cryptoMarket.live(symbol, interval));
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
  // Take profit and stop loss of an open position (its linked orders, not shown as pending).
  router.put(
    '/crypto/sim/positions/:id/exits',
    writes,
    authed(async (req, res) =>
      res.json(
        await c.cryptoSim.setExits(
          req.userId,
          cryptoOrderParams.parse(req.params).id,
          cryptoExitsBody.parse(req.body)
        )
      )
    )
  );
  // The result of a closed practice operation, added once to an account of type Criptomonedas:
  // the operation is the person's own (`userId`), the account is one of the accounts they use
  // (`dataUserId`, the household's inside one). Answers with that portfolio again.
  router.post(
    '/crypto/sim/positions/:id/transfer',
    transferWrites,
    authed(async (req, res) => {
      const { id } = cryptoOrderParams.parse(req.params);
      const { accountId } = cryptoTransferBody.parse(req.body);
      const { portfolioId } = c.cryptoTransfers.add(req.userId, req.dataUserId, id, accountId);
      res.status(201).json(await c.cryptoSim.portfolio(req.userId, portfolioId));
    })
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

  // Drawings on the chart of each coin (trend lines, levels, zones, notes): free for everybody.
  router.get(
    '/crypto/drawings/:symbol',
    reads,
    authed(async (req, res) =>
      res.json(c.cryptoDrawings.list(req.userId, cryptoDrawingParams.parse(req.params).symbol))
    )
  );
  router.put(
    '/crypto/drawings/:symbol',
    drawingWrites,
    authed(async (req, res) =>
      res.json(
        c.cryptoDrawings.save(
          req.userId,
          cryptoDrawingParams.parse(req.params).symbol,
          cryptoDrawingsBody.parse(req.body).drawings
        )
      )
    )
  );

  // The monthly ranking (everybody is in): only aliases, never e-mails, full names or ids.
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
