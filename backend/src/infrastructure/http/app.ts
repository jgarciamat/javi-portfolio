import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { Container } from '../container';
import { errorHandler, notFoundHandler, rateLimiterFactory, requireAuth } from './middleware';
import { authRoutes } from './routes/auth.routes';
import { billingRoutes, billingWebhookRoute, publicBillingRoutes } from './routes/billing.routes';
import { clientErrorRoutes } from './routes/client.routes';
import { financeRoutes } from './routes/finance.routes';
import { planningRoutes } from './routes/planning.routes';
import { userRoutes } from './routes/user.routes';

export function createApp(c: Container): Express {
  const app = express();
  const { config } = c;
  const limiter = rateLimiterFactory(config.rateLimitDisabled || config.env === 'test');

  app.disable('x-powered-by');
  // Behind Caddy: use X-Forwarded-For for the client IP (rate limits, logs).
  app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without Origin (same-origin, curl, native HTTP) are allowed.
        if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
        else callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );
  // Needs the raw body to check Stripe's signature: before the JSON parser.
  app.use('/api', billingWebhookRoute(c));
  app.use(express.json({ limit: '4mb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => {
    try {
      c.db.prepare('SELECT 1').get();
      res.json({ status: 'ok', app: 'money-manager-api' });
    } catch {
      res.status(503).json({ status: 'error', app: 'money-manager-api' });
    }
  });

  api.use(limiter({ windowMs: 60 * 1000, limit: 300 }));
  api.use('/auth', authRoutes(c, limiter));
  api.use(publicBillingRoutes(c));
  api.use(clientErrorRoutes(limiter));
  api.use(requireAuth(c.auth));
  api.use(billingRoutes(c, limiter));
  api.use(financeRoutes(c, limiter));
  api.use(planningRoutes(c));
  api.use(userRoutes(c, limiter));
  api.use(notFoundHandler);

  app.use('/api', api);
  app.use(errorHandler());
  return app;
}
