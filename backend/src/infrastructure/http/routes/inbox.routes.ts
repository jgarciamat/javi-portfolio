import express, { Router } from 'express';
import { Container } from '../../container';
import { asyncHandler } from '../middleware';
import { inboundMailBody } from '../schemas';

/**
 * The e-mail service (a Cloudflare Email Worker, for instance) posts every message sent to a
 * receipts address here. It is authenticated with a shared secret, not with a user session.
 */
export function inboundMailRoute(c: Container): Router {
  const router = Router();
  router.post(
    '/inbound/email',
    express.json({ limit: '1mb' }),
    asyncHandler(async (req, res) => {
      const mail = inboundMailBody.parse(req.body);
      const status = await c.inbox.receive(req.header('x-inbound-secret'), mail);
      res.json({ status });
    })
  );
  return router;
}
