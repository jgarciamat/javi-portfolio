import { CategoryBudget } from '@domain/model/CategoryBudget';
import { CustomAlert, CustomAlertMetric, CustomAlertOperator } from '@domain/model/CustomAlert';
import { Goal } from '@domain/model/Goal';
import { RecurringFrequency, RecurringRule } from '@domain/model/RecurringRule';
import { TransactionType } from '@domain/model/TransactionType';
import { Currency, Locale, UserSettingsProps, defaultSettings } from '@domain/model/UserSettings';
import {
  BudgetView,
  CategoryBudgetRepository,
  CustomAlertRepository,
  GoalRepository,
  RecurringRuleRepository,
  SettingsRepository,
} from '@domain/ports/repositories';
import { Period, periodOrdinal } from '@domain/shared/period';
import { Db } from '../database';

// ─── Recurring rules ─────────────────────────────────────────────────────────

interface RuleRow {
  id: string;
  user_id: string;
  description: string;
  amount_cents: number;
  type: string;
  category_id: string;
  account_id: string | null;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  frequency: string;
  active: number;
  created_at: string;
}

const toRule = (r: RuleRow): RecurringRule =>
  RecurringRule.reconstitute({
    id: r.id,
    userId: r.user_id,
    description: r.description,
    amountCents: r.amount_cents,
    type: r.type as TransactionType,
    categoryId: r.category_id,
    accountId: r.account_id,
    start: { year: r.start_year, month: r.start_month },
    end:
      r.end_year !== null && r.end_month !== null ? { year: r.end_year, month: r.end_month } : null,
    frequency: r.frequency as RecurringFrequency,
    active: r.active === 1,
    createdAt: r.created_at,
  });

export class SqliteRecurringRuleRepository implements RecurringRuleRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): RecurringRule[] {
    return (
      this.db
        .prepare('SELECT * FROM recurring_rules WHERE user_id = ? ORDER BY created_at')
        .all(userId) as RuleRow[]
    ).map(toRule);
  }

  findById(userId: string, id: string): RecurringRule | null {
    const row = this.db
      .prepare('SELECT * FROM recurring_rules WHERE user_id = ? AND id = ?')
      .get(userId, id) as RuleRow | undefined;
    return row ? toRule(row) : null;
  }

  save(rule: RecurringRule): void {
    const p = rule.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO recurring_rules (id, user_id, description, amount_cents, type, category_id,
           account_id, start_year, start_month, end_year, end_month, frequency, active, created_at)
         VALUES (@id, @userId, @description, @amountCents, @type, @categoryId, @accountId,
           @startYear, @startMonth, @endYear, @endMonth, @frequency, @active, @createdAt)
         ON CONFLICT(id) DO UPDATE SET description = excluded.description,
           amount_cents = excluded.amount_cents, type = excluded.type,
           category_id = excluded.category_id, account_id = excluded.account_id,
           start_year = excluded.start_year, start_month = excluded.start_month,
           end_year = excluded.end_year, end_month = excluded.end_month,
           frequency = excluded.frequency, active = excluded.active`
      )
      .run({
        id: p.id,
        userId: p.userId,
        description: p.description,
        amountCents: p.amountCents,
        type: p.type,
        categoryId: p.categoryId,
        accountId: p.accountId,
        startYear: p.start.year,
        startMonth: p.start.month,
        endYear: p.end?.year ?? null,
        endMonth: p.end?.month ?? null,
        frequency: p.frequency,
        active: p.active ? 1 : 0,
        createdAt: p.createdAt,
      });
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM recurring_rules WHERE user_id = ? AND id = ?').run(userId, id);
  }

  addSkip(ruleId: string, period: Period): void {
    this.db
      .prepare('INSERT OR IGNORE INTO recurring_rule_skips (rule_id, year, month) VALUES (?, ?, ?)')
      .run(ruleId, period.year, period.month);
  }

  skippedPeriods(ruleId: string): Period[] {
    return this.db
      .prepare('SELECT year, month FROM recurring_rule_skips WHERE rule_id = ?')
      .all(ruleId) as Period[];
  }

  clearSkipsFrom(ruleId: string, from: Period): void {
    this.db
      .prepare(
        'DELETE FROM recurring_rule_skips WHERE rule_id = ? AND (year * 12 + month - 1) >= ?'
      )
      .run(ruleId, periodOrdinal(from));
  }
}

// ─── Custom alerts ───────────────────────────────────────────────────────────

interface AlertRow {
  id: string;
  user_id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  category_id: string | null;
  color: string;
  active: number;
  created_at: string;
}

const toAlert = (r: AlertRow): CustomAlert =>
  CustomAlert.reconstitute({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    metric: r.metric as CustomAlertMetric,
    operator: r.operator as CustomAlertOperator,
    threshold: r.threshold,
    categoryId: r.category_id,
    color: r.color,
    active: r.active === 1,
    createdAt: r.created_at,
  });

export class SqliteCustomAlertRepository implements CustomAlertRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): CustomAlert[] {
    return (
      this.db
        .prepare('SELECT * FROM custom_alerts WHERE user_id = ? ORDER BY created_at')
        .all(userId) as AlertRow[]
    ).map(toAlert);
  }

  findById(userId: string, id: string): CustomAlert | null {
    const row = this.db
      .prepare('SELECT * FROM custom_alerts WHERE user_id = ? AND id = ?')
      .get(userId, id) as AlertRow | undefined;
    return row ? toAlert(row) : null;
  }

  save(alert: CustomAlert): void {
    const p = alert.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO custom_alerts (id, user_id, name, metric, operator, threshold, category_id, color, active, created_at)
         VALUES (@id, @userId, @name, @metric, @operator, @threshold, @categoryId, @color, @active, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, metric = excluded.metric,
           operator = excluded.operator, threshold = excluded.threshold,
           category_id = excluded.category_id, color = excluded.color, active = excluded.active`
      )
      .run({ ...p, active: p.active ? 1 : 0 });
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM custom_alerts WHERE user_id = ? AND id = ?').run(userId, id);
  }
}

// ─── Category budgets ────────────────────────────────────────────────────────

interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string;
  amount_cents: number;
  created_at: string;
}

const toBudget = (r: BudgetRow): CategoryBudget =>
  CategoryBudget.reconstitute({
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    amountCents: r.amount_cents,
    createdAt: r.created_at,
  });

export class SqliteCategoryBudgetRepository implements CategoryBudgetRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): BudgetView[] {
    return this.db
      .prepare(
        `SELECT b.id, b.category_id AS categoryId, c.name AS categoryName, b.amount_cents AS amountCents
           FROM category_budgets b JOIN categories c ON c.id = b.category_id
          WHERE b.user_id = ? ORDER BY c.name COLLATE NOCASE`
      )
      .all(userId) as BudgetView[];
  }

  findById(userId: string, id: string): CategoryBudget | null {
    const row = this.db
      .prepare('SELECT * FROM category_budgets WHERE user_id = ? AND id = ?')
      .get(userId, id) as BudgetRow | undefined;
    return row ? toBudget(row) : null;
  }

  findByCategory(userId: string, categoryId: string): CategoryBudget | null {
    const row = this.db
      .prepare('SELECT * FROM category_budgets WHERE user_id = ? AND category_id = ?')
      .get(userId, categoryId) as BudgetRow | undefined;
    return row ? toBudget(row) : null;
  }

  save(budget: CategoryBudget): void {
    const p = budget.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO category_budgets (id, user_id, category_id, amount_cents, created_at)
         VALUES (@id, @userId, @categoryId, @amountCents, @createdAt)
         ON CONFLICT(id) DO UPDATE SET amount_cents = excluded.amount_cents`
      )
      .run(p);
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM category_budgets WHERE user_id = ? AND id = ?').run(userId, id);
  }
}

// ─── Goals ───────────────────────────────────────────────────────────────────

interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  target_date: string | null;
  category_id: string;
  icon: string;
  color: string;
  archived: number;
  created_at: string;
}

const toGoal = (r: GoalRow): Goal =>
  Goal.reconstitute({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    targetCents: r.target_cents,
    targetDate: r.target_date,
    categoryId: r.category_id,
    icon: r.icon,
    color: r.color,
    archived: r.archived === 1,
    createdAt: r.created_at,
  });

export class SqliteGoalRepository implements GoalRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): Goal[] {
    return (
      this.db
        .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY archived, created_at')
        .all(userId) as GoalRow[]
    ).map(toGoal);
  }

  findById(userId: string, id: string): Goal | null {
    const row = this.db
      .prepare('SELECT * FROM goals WHERE user_id = ? AND id = ?')
      .get(userId, id) as GoalRow | undefined;
    return row ? toGoal(row) : null;
  }

  save(goal: Goal): void {
    const p = goal.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO goals (id, user_id, name, target_cents, target_date, category_id, icon, color, archived, created_at)
         VALUES (@id, @userId, @name, @targetCents, @targetDate, @categoryId, @icon, @color, @archived, @createdAt)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, target_cents = excluded.target_cents,
           target_date = excluded.target_date, category_id = excluded.category_id,
           icon = excluded.icon, color = excluded.color, archived = excluded.archived`
      )
      .run({ ...p, archived: p.archived ? 1 : 0 });
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM goals WHERE user_id = ? AND id = ?').run(userId, id);
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

interface SettingsRow {
  user_id: string;
  currency: string;
  locale: string;
  month_start_day: number;
  default_account_id: string | null;
  notifications_enabled: number;
  show_offers: number;
  show_tour: number;
  show_getting_started: number;
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Db) {}

  get(userId: string): UserSettingsProps {
    const row = this.db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as
      | SettingsRow
      | undefined;
    if (!row) return defaultSettings(userId);
    return {
      userId: row.user_id,
      currency: row.currency as Currency,
      locale: row.locale as Locale,
      monthStartDay: row.month_start_day,
      defaultAccountId: row.default_account_id,
      notificationsEnabled: row.notifications_enabled === 1,
      showOffers: row.show_offers !== 0,
      showTour: row.show_tour !== 0,
      showGettingStarted: row.show_getting_started !== 0,
    };
  }

  save(s: UserSettingsProps): void {
    this.db
      .prepare(
        `INSERT INTO user_settings (user_id, currency, locale, month_start_day, default_account_id,
           notifications_enabled, show_offers, show_tour, show_getting_started)
         VALUES (@userId, @currency, @locale, @monthStartDay, @defaultAccountId, @notificationsEnabled,
           @showOffers, @showTour, @showGettingStarted)
         ON CONFLICT(user_id) DO UPDATE SET currency = excluded.currency, locale = excluded.locale,
           month_start_day = excluded.month_start_day, default_account_id = excluded.default_account_id,
           notifications_enabled = excluded.notifications_enabled, show_offers = excluded.show_offers,
           show_tour = excluded.show_tour, show_getting_started = excluded.show_getting_started`
      )
      .run({
        ...s,
        notificationsEnabled: s.notificationsEnabled ? 1 : 0,
        showOffers: s.showOffers ? 1 : 0,
        showTour: s.showTour ? 1 : 0,
        showGettingStarted: s.showGettingStarted ? 1 : 0,
      });
  }
}
