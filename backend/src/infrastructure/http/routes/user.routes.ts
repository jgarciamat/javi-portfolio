import { Router } from 'express';
import { SettingsChanges } from '@domain/model/UserSettings';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  presentForecast,
  presentNetWorth,
  presentSubscriptions,
  presentTrend,
} from '../presenters';
import {
  adviceBody,
  avatarBody,
  forecastQuery,
  nameBody,
  netWorthQuery,
  passwordBody,
  periodParams,
  settingsBody,
} from '../schemas';

/** Profile, settings, data export and insights (stats + AI advice). */
export function userRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();

  router.get(
    '/profile',
    authed((req, res) =>
      res.json({ ...c.profile.getProfile(req.userId), settings: c.settings.get(req.userId) })
    )
  );
  router.patch(
    '/profile/name',
    authed((req, res) => res.json(c.profile.rename(req.userId, nameBody.parse(req.body).name)))
  );
  router.patch(
    '/profile/password',
    limiter({ windowMs: 15 * 60 * 1000, limit: 10 }),
    authed(async (req, res) => {
      const { currentPassword, newPassword } = passwordBody.parse(req.body);
      const tokens = await c.profile.changePassword(req.userId, currentPassword, newPassword);
      res.json({ message: 'Contraseña actualizada correctamente', ...tokens });
    })
  );
  router.patch(
    '/profile/avatar',
    authed((req, res) =>
      res.json(c.profile.updateAvatar(req.userId, avatarBody.parse(req.body).avatarDataUrl))
    )
  );
  router.delete(
    '/profile/account',
    authed(async (req, res) => {
      await c.billing.cancelBeforeAccountDeletion(req.userId);
      c.profile.deleteAccount(req.userId);
      res.status(204).end();
    })
  );

  router.get(
    '/settings',
    authed((req, res) => res.json(c.settings.get(req.userId)))
  );
  router.patch(
    '/settings',
    authed((req, res) =>
      res.json(c.settings.update(req.userId, settingsBody.parse(req.body) as SettingsChanges))
    )
  );

  router.get(
    '/export',
    limiter({ windowMs: 60 * 60 * 1000, limit: 20 }),
    authed((req, res) => {
      const date = c.clock.now().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="money-manager-${date}.json"`);
      res.json(c.exporter.exportAll(req.userId));
    })
  );

  router.get(
    '/stats/trends/:year/:month',
    authed((req, res) => {
      const result = c.stats.trends(req.userId, periodParams.parse(req.params));
      res.json({
        year: result.year,
        month: result.month,
        categories: result.categories.map(presentTrend),
      });
    })
  );
  router.get(
    '/stats/net-worth',
    authed((req, res) => {
      const { months } = netWorthQuery.parse(req.query);
      res.json(c.stats.netWorth(req.userId, months).map(presentNetWorth));
    })
  );

  router.get(
    '/stats/forecast',
    authed((req, res) => {
      const { months, exclude } = forecastQuery.parse(req.query);
      res.json(presentForecast(c.stats.forecast(req.userId, { months, exclude })));
    })
  );

  router.get(
    '/stats/subscriptions',
    authed((req, res) => res.json(presentSubscriptions(c.stats.subscriptions(req.userId))))
  );

  router.post(
    '/ai/advice',
    limiter({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? '',
    }),
    authed(async (req, res) => {
      const { year, month, locale } = adviceBody.parse(req.body);
      res.json(await c.advice.getAdvice(req.userId, { year, month }, locale));
    })
  );

  return router;
}
