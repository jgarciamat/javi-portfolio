import { Router } from 'express';
import { ForbiddenError } from '@domain/errors';
import { SettingsChanges } from '@domain/model/UserSettings';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  presentAnnualReport,
  presentForecast,
  presentNetWorth,
  presentSubscriptions,
  presentTrend,
} from '../presenters';
import {
  adviceBody,
  askBody,
  avatarBody,
  forecastQuery,
  nameBody,
  netWorthQuery,
  passwordBody,
  periodParams,
  settingsBody,
  yearParams,
} from '../schemas';

/** Profile, settings, data export and insights (stats + AI advice). */
export function userRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();

  /** Personal settings are the user's own; currency and month start belong to the shared data. */
  const settingsFor = (userId: string, dataUserId: string) => {
    const own = c.settings.get(userId);
    if (userId === dataUserId) return own;
    const shared = c.settings.get(dataUserId);
    return {
      ...own,
      currency: shared.currency,
      monthStartDay: shared.monthStartDay,
      defaultAccountId: shared.defaultAccountId,
      currentPeriod: shared.currentPeriod,
    };
  };

  router.get(
    '/profile',
    authed((req, res) =>
      res.json({
        ...c.profile.getProfile(req.userId),
        settings: settingsFor(req.userId, req.dataUserId),
      })
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
    '/referral',
    authed((req, res) => res.json(c.referrals.summary(req.userId)))
  );

  router.get(
    '/settings',
    authed((req, res) => res.json(settingsFor(req.userId, req.dataUserId)))
  );
  router.patch(
    '/settings',
    authed((req, res) => {
      const changes = settingsBody.parse(req.body) as SettingsChanges;
      const shared = ['currency', 'monthStartDay', 'defaultAccountId'] as const;
      if (req.dataUserId !== req.userId && shared.some((key) => key in changes)) {
        throw new ForbiddenError(
          'Solo quien creó el hogar puede cambiar la moneda, el inicio de mes o la cuenta por defecto',
          'HOUSEHOLD_MEMBER_SETTINGS'
        );
      }
      c.settings.update(req.userId, changes);
      res.json(settingsFor(req.userId, req.dataUserId));
    })
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
      const result = c.stats.trends(req.dataUserId, periodParams.parse(req.params));
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
      res.json(c.stats.netWorth(req.dataUserId, months).map(presentNetWorth));
    })
  );

  router.get(
    '/stats/forecast',
    authed((req, res) => {
      const { months, exclude } = forecastQuery.parse(req.query);
      res.json(presentForecast(c.stats.forecast(req.dataUserId, { months, exclude })));
    })
  );

  router.get(
    '/stats/report/:year',
    authed((req, res) => {
      const { year } = yearParams.parse(req.params);
      res.json(presentAnnualReport(c.stats.annualReport(req.dataUserId, year)));
    })
  );
  router.get(
    '/stats/subscriptions',
    authed((req, res) => res.json(presentSubscriptions(c.stats.subscriptions(req.dataUserId))))
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
      const advice = await c.advice.getAdvice(req.dataUserId, { year, month }, locale);
      if (advice.source === 'ai') c.repos.metrics.record('ai_analysis');
      res.json(advice);
    })
  );

  router.post(
    '/ai/ask',
    limiter({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? '',
    }),
    authed(async (req, res) => {
      const { question, locale } = askBody.parse(req.body);
      const result = await c.advice.ask(req.dataUserId, question, locale);
      c.repos.metrics.record('ai_question');
      res.json(result);
    })
  );

  return router;
}
