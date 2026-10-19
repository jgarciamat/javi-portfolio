import { Router } from 'express';
import { ForbiddenError } from '@domain/errors';
import { SettingsChanges } from '@domain/model/UserSettings';
import { Container } from '../../container';
import { RateLimiterFactory, authed } from '../middleware';
import {
  presentAnnualReport,
  presentAsset,
  presentInbox,
  presentSplitGroup,
  presentTax,
  presentForecast,
  presentNetWorth,
  presentSubscriptions,
  presentTrend,
} from '../presenters';
import {
  adviceBody,
  askBody,
  avatarBody,
  deleteAccountBody,
  forecastQuery,
  nameBody,
  acquisitionBody,
  assetBody,
  assetTermsBody,
  splitExpenseBody,
  splitExpenseParams,
  splitGroupBody,
  splitSettleBody,
  autonomoDraftBody,
  businessCategoryBody,
  categoryIdParam,
  assetValueBody,
  idParam,
  netWorthQuery,
  pushSubscribeBody,
  pushUnsubscribeBody,
  rateQuery,
  passwordBody,
  periodParams,
  referralSummaryResponse,
  settingsBody,
  yearParams,
} from '../schemas';

/** Profile, settings, data export and insights (stats + AI advice). */
export function userRoutes(c: Container, limiter: RateLimiterFactory): Router {
  const router = Router();
  const ratesLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 120 });

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
      const tokens = await c.profile.changePassword(
        req.userId,
        currentPassword,
        newPassword,
        req.authTime
      );
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
    limiter({ windowMs: 15 * 60 * 1000, limit: 10 }),
    authed(async (req, res) => {
      const { password, googleToken, confirmPlayCancelled } = deleteAccountBody.parse(
        req.body ?? {}
      );
      await c.auth.confirmIdentity(req.userId, { password, googleToken, authTime: req.authTime });
      await c.billing.cancelBeforeAccountDeletion(req.userId, {
        playCancelled: confirmPlayCancelled,
      });
      c.profile.deleteAccount(req.userId);
      res.status(204).end();
    })
  );

  router.get(
    '/referral',
    authed((req, res) => res.json(referralSummaryResponse.parse(c.referrals.summary(req.userId))))
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
      res.setHeader('Content-Disposition', `attachment; filename="finanverso-${date}.json"`);
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

  /** Reference exchange rate to enter a movement made in another currency. */
  router.get(
    '/rates',
    ratesLimiter,
    authed(async (req, res) => {
      const { from, to } = rateQuery.parse(req.query);
      res.json({ from, to, rate: await c.rates.rate(from, to) });
    })
  );

  // Where a new user came from: counted anonymously, only within the hour after sign-up, so
  // someone who simply signs in on another browser is not counted as a new user.
  router.post(
    '/acquisition',
    authed((req, res) => {
      const { source } = acquisitionBody.parse(req.body);
      const created = c.repos.users.findById(req.userId)?.toPrimitives().createdAt as string;
      if (c.clock.now().getTime() - new Date(created).getTime() < 60 * 60 * 1000) {
        c.repos.metrics.record(`signup:${source}`);
      }
      res.status(204).end();
    })
  );

  // Push notifications: the browser or the installed web app subscribes to receive them.
  router.get(
    '/push/key',
    authed((_req, res) => res.json({ enabled: c.push.enabled, publicKey: c.push.publicKey() }))
  );
  router.post(
    '/push/subscribe',
    authed((req, res) => {
      const { endpoint, keys } = pushSubscribeBody.parse(req.body);
      c.push.subscribe(req.userId, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
      res.status(204).end();
    })
  );
  router.post(
    '/push/unsubscribe',
    authed((req, res) => {
      c.push.unsubscribe(req.userId, pushUnsubscribeBody.parse(req.body).endpoint);
      res.status(204).end();
    })
  );
  router.post(
    '/push/test',
    authed(async (req, res) => {
      const sent = await c.push.notify(req.userId, {
        title: 'Finanverso',
        body: '✔ Las notificaciones funcionan en este dispositivo.',
        url: '/',
      });
      res.json({ sent });
    })
  );

  // Shared expenses with friends or flatmates.
  router.get(
    '/splits',
    authed((req, res) => res.json(c.split.list(req.dataUserId)))
  );
  router.post(
    '/splits',
    authed((req, res) =>
      res
        .status(201)
        .json(presentSplitGroup(c.split.create(req.dataUserId, splitGroupBody.parse(req.body))))
    )
  );
  router.get(
    '/splits/:id',
    authed((req, res) =>
      res.json(presentSplitGroup(c.split.get(req.dataUserId, idParam.parse(req.params).id)))
    )
  );
  router.delete(
    '/splits/:id',
    authed((req, res) => {
      c.split.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );
  router.post(
    '/splits/:id/expenses',
    authed((req, res) => {
      const { amount, ...rest } = splitExpenseBody.parse(req.body);
      const group = c.split.addExpense(req.dataUserId, idParam.parse(req.params).id, {
        ...rest,
        amountCents: amount,
      });
      res.status(201).json(presentSplitGroup(group));
    })
  );
  router.post(
    '/splits/:id/settlements',
    authed((req, res) => {
      const { amount, ...rest } = splitSettleBody.parse(req.body);
      const group = c.split.settle(req.dataUserId, idParam.parse(req.params).id, {
        ...rest,
        amountCents: amount,
      });
      res.status(201).json(presentSplitGroup(group));
    })
  );
  router.delete(
    '/splits/:id/expenses/:expenseId',
    authed((req, res) => {
      const { id, expenseId } = splitExpenseParams.parse(req.params);
      res.json(presentSplitGroup(c.split.deleteExpense(req.dataUserId, id, expenseId)));
    })
  );

  // Self-employed: professional categories and the quarterly VAT / income-tax estimate.
  router.get(
    '/business/categories',
    authed((req, res) => res.json(c.tax.list(req.dataUserId)))
  );
  router.put(
    '/business/categories/:categoryId',
    authed((req, res) => {
      const { categoryId } = categoryIdParam.parse(req.params);
      c.tax.set(req.dataUserId, categoryId, businessCategoryBody.parse(req.body).vatRate);
      res.status(204).end();
    })
  );
  router.delete(
    '/business/categories/:categoryId',
    authed((req, res) => {
      c.tax.remove(req.dataUserId, categoryIdParam.parse(req.params).categoryId);
      res.status(204).end();
    })
  );
  router.post(
    '/business/draft',
    authed((req, res) => {
      const { year, quarter, inputs } = autonomoDraftBody.parse(req.body);
      res.status(201).json(c.tax.draft(req.dataUserId, year, quarter, inputs));
    })
  );
  router.post(
    '/business/draft/pdf',
    authed((req, res) => res.status(201).json(c.tax.recordPdf(req.dataUserId)))
  );
  router.get(
    '/business/tax/:year',
    authed((req, res) =>
      res.json(presentTax(c.tax.yearly(req.dataUserId, yearParams.parse(req.params).year)))
    )
  );

  // Investments, property and debts valued by hand: part of the net worth.
  router.get(
    '/assets',
    authed((req, res) => res.json(c.assetService.list(req.dataUserId).map(presentAsset)))
  );
  router.post(
    '/assets',
    authed((req, res) => {
      const { value, minPayment, ...rest } = assetBody.parse(req.body);
      res.status(201).json(
        presentAsset(
          c.assetService.create(req.dataUserId, {
            ...rest,
            valueCents: value,
            minPaymentCents: minPayment,
          })
        )
      );
    })
  );
  router.post(
    '/assets/:id/values',
    authed((req, res) => {
      const { value, date } = assetValueBody.parse(req.body);
      res.json(
        presentAsset(
          c.assetService.setValue(req.dataUserId, idParam.parse(req.params).id, value, date)
        )
      );
    })
  );
  // Income tax return calculator: each calculation is counted (the free plan has one).
  router.post(
    '/renta/draft',
    authed((req, res) => res.status(201).json(c.renta.useDraft(req.userId)))
  );
  router.post(
    '/renta/calculation',
    authed((req, res) => res.status(201).json(c.renta.register(req.userId)))
  );

  // Receipts forwarded by e-mail: the user's private address and what happened to each message.
  router.get(
    '/inbox',
    authed((req, res) => res.json(presentInbox(c.inbox.overview(req.dataUserId))))
  );
  router.post(
    '/inbox/rotate',
    authed((req, res) => res.json(presentInbox(c.inbox.rotate(req.dataUserId))))
  );
  router.patch(
    '/assets/:id/terms',
    authed((req, res) => {
      const { interestRate, minPayment } = assetTermsBody.parse(req.body);
      res.json(
        presentAsset(
          c.assetService.setTerms(req.dataUserId, idParam.parse(req.params).id, {
            interestRate,
            minPaymentCents: minPayment,
          })
        )
      );
    })
  );
  router.delete(
    '/assets/:id',
    authed((req, res) => {
      c.assetService.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
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
