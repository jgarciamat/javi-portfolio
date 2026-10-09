import { Router } from 'express';
import { Container } from '../../container';
import { authed } from '../middleware';
import {
  presentAccount,
  presentAlert,
  presentBudget,
  presentGoal,
  presentRule,
  presentTransfer,
} from '../presenters';
import {
  accountBody,
  accountPatchBody,
  budgetBody,
  categoryBody,
  categoryPatchBody,
  customAlertBody,
  customAlertPatchBody,
  deleteCategoryQuery,
  goalBody,
  goalPatchBody,
  idParam,
  recurringBody,
  recurringDeleteQuery,
  recurringPatchBody,
  transferBody,
} from '../schemas';
import { z } from 'zod';

type RecurringBody = Partial<z.infer<typeof recurringBody>>;

/** Maps the flat startYear/startMonth API fields to the domain's periods. */
function ruleInput(body: RecurringBody) {
  const { startYear, startMonth, endYear, endMonth, amount, ...rest } = body;
  return {
    ...rest,
    amountCents: amount,
    start:
      startYear !== undefined && startMonth !== undefined
        ? { year: startYear, month: startMonth }
        : undefined,
    end:
      endYear === undefined && endMonth === undefined
        ? undefined
        : endYear && endMonth
        ? { year: endYear, month: endMonth }
        : null,
  };
}

export function planningRoutes(c: Container): Router {
  const router = Router();

  // ─── Categories ────────────────────────────────────────────────────────────
  router.get(
    '/categories',
    authed((req, res) => res.json(c.categories.list(req.dataUserId)))
  );
  router.post(
    '/categories',
    authed((req, res) =>
      res.status(201).json(c.categories.create(req.dataUserId, categoryBody.parse(req.body)))
    )
  );
  router.patch(
    '/categories/:id',
    authed((req, res) =>
      res.json(
        c.categories.update(
          req.dataUserId,
          idParam.parse(req.params).id,
          categoryPatchBody.parse(req.body)
        )
      )
    )
  );
  router.get(
    '/categories/:id/usage',
    authed((req, res) => res.json(c.categories.usage(req.dataUserId, idParam.parse(req.params).id)))
  );
  router.delete(
    '/categories/:id',
    authed((req, res) => {
      const { reassignTo } = deleteCategoryQuery.parse(req.query);
      c.categories.delete(req.dataUserId, idParam.parse(req.params).id, reassignTo);
      res.status(204).end();
    })
  );

  // ─── Accounts & transfers ──────────────────────────────────────────────────
  router.get(
    '/accounts',
    authed((req, res) => {
      const { accounts, totalCents } = c.accounts.list(req.dataUserId);
      res.json({ accounts: accounts.map(presentAccount), total: totalCents / 100 });
    })
  );
  router.post(
    '/accounts',
    authed((req, res) => {
      const { initialBalance, ...rest } = accountBody.parse(req.body);
      c.accounts.create(req.dataUserId, { ...rest, initialBalanceCents: initialBalance });
      res.status(201).json(c.accounts.list(req.dataUserId).accounts.map(presentAccount));
    })
  );
  router.patch(
    '/accounts/:id',
    authed((req, res) => {
      const { initialBalance, ...rest } = accountPatchBody.parse(req.body);
      c.accounts.update(req.dataUserId, idParam.parse(req.params).id, {
        ...rest,
        initialBalanceCents: initialBalance,
      });
      res.json(c.accounts.list(req.dataUserId).accounts.map(presentAccount));
    })
  );
  router.delete(
    '/accounts/:id',
    authed((req, res) => {
      c.accounts.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );
  router.get(
    '/transfers',
    authed((req, res) => res.json(c.accounts.listTransfers(req.dataUserId).map(presentTransfer)))
  );
  router.post(
    '/transfers',
    authed((req, res) => {
      const { amount, ...rest } = transferBody.parse(req.body);
      res
        .status(201)
        .json(
          presentTransfer(
            c.accounts.createTransfer(req.dataUserId, { ...rest, amountCents: amount })
          )
        );
    })
  );
  router.delete(
    '/transfers/:id',
    authed((req, res) => {
      c.accounts.deleteTransfer(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );

  // ─── Recurring rules ───────────────────────────────────────────────────────
  router.get(
    '/recurring-rules',
    authed((req, res) => res.json(c.recurring.list(req.dataUserId).map(presentRule)))
  );
  router.post(
    '/recurring-rules',
    authed((req, res) =>
      res
        .status(201)
        .json(
          presentRule(c.recurring.create(req.dataUserId, ruleInput(recurringBody.parse(req.body))))
        )
    )
  );
  router.patch(
    '/recurring-rules/:id',
    authed((req, res) =>
      res.json(
        presentRule(
          c.recurring.update(
            req.dataUserId,
            idParam.parse(req.params).id,
            ruleInput(recurringPatchBody.parse(req.body))
          )
        )
      )
    )
  );
  router.delete(
    '/recurring-rules/:id',
    authed((req, res) => {
      const { scope } = recurringDeleteQuery.parse(req.query);
      c.recurring.delete(req.dataUserId, idParam.parse(req.params).id, scope);
      res.status(204).end();
    })
  );

  // ─── Custom alerts ─────────────────────────────────────────────────────────
  router.get(
    '/custom-alerts',
    authed((req, res) => res.json(c.alerts.list(req.dataUserId).map(presentAlert)))
  );
  router.post(
    '/custom-alerts',
    authed((req, res) =>
      res
        .status(201)
        .json(presentAlert(c.alerts.create(req.dataUserId, customAlertBody.parse(req.body))))
    )
  );
  router.patch(
    '/custom-alerts/:id',
    authed((req, res) =>
      res.json(
        presentAlert(
          c.alerts.update(
            req.dataUserId,
            idParam.parse(req.params).id,
            customAlertPatchBody.parse(req.body)
          )
        )
      )
    )
  );
  router.delete(
    '/custom-alerts/:id',
    authed((req, res) => {
      c.alerts.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );

  // ─── Category budgets ──────────────────────────────────────────────────────
  router.get(
    '/budgets',
    authed((req, res) => res.json(c.budgets.list(req.dataUserId).map(presentBudget)))
  );
  router.put(
    '/budgets',
    authed((req, res) => {
      const { amount, ...ref } = budgetBody.parse(req.body);
      res.json(presentBudget(c.budgets.set(req.dataUserId, ref, amount)));
    })
  );
  router.delete(
    '/budgets/:id',
    authed((req, res) => {
      c.budgets.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );

  // ─── Goals ─────────────────────────────────────────────────────────────────
  router.get(
    '/goals',
    authed((req, res) => res.json(c.goals.list(req.dataUserId).map(presentGoal)))
  );
  router.post(
    '/goals',
    authed((req, res) => {
      const { target, ...rest } = goalBody.parse(req.body);
      res
        .status(201)
        .json(presentGoal(c.goals.create(req.dataUserId, { ...rest, targetCents: target })));
    })
  );
  router.patch(
    '/goals/:id',
    authed((req, res) => {
      const { target, ...rest } = goalPatchBody.parse(req.body);
      res.json(
        presentGoal(
          c.goals.update(req.dataUserId, idParam.parse(req.params).id, {
            ...rest,
            targetCents: target,
          })
        )
      );
    })
  );
  router.delete(
    '/goals/:id',
    authed((req, res) => {
      c.goals.delete(req.dataUserId, idParam.parse(req.params).id);
      res.status(204).end();
    })
  );

  return router;
}
