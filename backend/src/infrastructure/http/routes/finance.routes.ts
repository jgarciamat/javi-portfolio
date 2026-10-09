import { Router } from 'express';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  presentAnnual,
  presentMonth,
  presentSearch,
  presentSummary,
  presentTransaction,
} from '../presenters';
import {
  idParam,
  importBody,
  periodParams,
  searchQuery,
  transactionBody,
  transactionPatchBody,
  yearParam,
} from '../schemas';
import { z } from 'zod';

const optionalPeriod = z.object({
  year: z.coerce.number().int().min(1970).max(9999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

/** Movements, month overview, search, annual summary and CSV import. */
export function financeRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();

  const periodOrCurrent = (userId: string, q: unknown): { year: number; month: number } => {
    const { year, month } = optionalPeriod.parse(q);
    if (year && month) return { year, month };
    return c.settings.get(userId).currentPeriod;
  };

  /** Everything the month screen needs in one call. */
  router.get(
    '/months/:year/:month',
    authed((req, res) => {
      res.json(presentMonth(c.transactions.getMonth(req.userId, periodParams.parse(req.params))));
    })
  );

  router.get(
    '/transactions',
    authed((req, res) => {
      const month = c.transactions.getMonth(req.userId, periodOrCurrent(req.userId, req.query));
      res.json(month.transactions.map(presentTransaction));
    })
  );

  router.get(
    '/transactions/summary',
    authed((req, res) => {
      const period = periodOrCurrent(req.userId, req.query);
      res.json(presentSummary(c.transactions.getMonth(req.userId, period).summary, period));
    })
  );

  router.get(
    '/transactions/search',
    authed((req, res) => {
      const q = searchQuery.parse(req.query);
      res.json(
        presentSearch(
          c.transactions.search(req.userId, {
            text: q.q,
            type: q.type,
            categoryIds: q.categoryIds,
            accountId: q.accountId,
            from: q.from,
            to: q.to,
            minCents: q.min,
            maxCents: q.max,
            sort: q.sort,
            limit: q.limit,
            offset: q.offset,
          })
        )
      );
    })
  );

  router.get(
    '/transactions/annual/:year',
    authed((req, res) => {
      res.json(presentAnnual(c.transactions.annual(req.userId, yearParam.parse(req.params).year)));
    })
  );

  router.post(
    '/transactions/import',
    limiter({ windowMs: 60 * 60 * 1000, limit: 30 }),
    authed(async (req, res) => {
      const body = importBody.parse(req.body);
      const result = await c.importer.import(
        req.userId,
        body.rows.map((r) => ({ ...r, amountCents: r.amount })),
        { accountId: body.accountId, dryRun: body.dryRun }
      );
      if (!body.dryRun) c.repos.metrics.record('import_done');
      res.status(body.dryRun ? 200 : 201).json({
        ...result,
        rows: result.rows.map((r) => ({
          ...r,
          amount: r.amountCents === undefined ? undefined : r.amountCents / 100,
          amountCents: undefined,
        })),
      });
    })
  );

  router.post(
    '/transactions',
    authed((req, res) => {
      const body = transactionBody.parse(req.body);
      res
        .status(201)
        .json(
          presentTransaction(
            c.transactions.create(req.userId, { ...body, amountCents: body.amount })
          )
        );
    })
  );

  const update = authed((req, res) => {
    const { id } = idParam.parse(req.params);
    const body = transactionPatchBody.parse(req.body);
    res.json(
      presentTransaction(
        c.transactions.update(req.userId, id, { ...body, amountCents: body.amount })
      )
    );
  });
  router.put('/transactions/:id', update);
  router.patch('/transactions/:id', update);

  router.delete(
    '/transactions/:id',
    authed((req, res) => {
      c.transactions.delete(req.userId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );

  /** Kept for older clients: money available before the given month. */
  router.get(
    '/budget/carryover/:year/:month',
    authed((req, res) => {
      const period = periodParams.parse(req.params);
      res.json({
        carryover: c.transactions.getMonth(req.userId, period).carryoverCents / 100,
        ...period,
      });
    })
  );

  return router;
}
