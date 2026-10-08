import { Transaction } from '@domain/model/Transaction';
import { TransactionType } from '@domain/model/TransactionType';
import {
  PeriodTotals,
  TransactionRepository,
  TransactionSearchFilters,
  TransactionSearchResult,
  TransactionSort,
  TransactionView,
} from '@domain/ports/repositories';
import { CategoryPeriodTotal } from '@domain/services/trends';
import { Cents } from '@domain/shared/money';
import { Period, periodOrdinal } from '@domain/shared/period';
import { normalizeText } from '@domain/shared/text';
import { Db, escapeLike, inChunks, placeholders } from '../database';

interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  year: number;
  month: number;
  date: string;
  description: string;
  description_key: string;
  amount_cents: number;
  type: string;
  notes: string | null;
  recurring_rule_id: string | null;
  import_hash: string | null;
  created_at: string;
}

interface ViewRow extends TransactionRow {
  category_name: string;
  category_color: string;
  category_icon: string;
  account_name: string;
}

const VIEW_SELECT = `
  SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
         a.name AS account_name
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    JOIN accounts a ON a.id = t.account_id`;

const ORDINAL = '(t.year * 12 + t.month - 1)';

const SORTS: Record<TransactionSort, string> = {
  date_desc: 't.date DESC, t.created_at DESC',
  date_asc: 't.date ASC, t.created_at ASC',
  amount_desc: 't.amount_cents DESC, t.date DESC',
  amount_asc: 't.amount_cents ASC, t.date DESC',
};

function toEntity(r: TransactionRow): Transaction {
  return Transaction.reconstitute({
    id: r.id,
    userId: r.user_id,
    accountId: r.account_id,
    categoryId: r.category_id,
    description: r.description,
    amountCents: r.amount_cents,
    type: r.type as TransactionType,
    date: r.date,
    period: { year: r.year, month: r.month },
    notes: r.notes,
    recurringRuleId: r.recurring_rule_id,
    importHash: r.import_hash,
    createdAt: r.created_at,
  });
}

function toView(r: ViewRow): TransactionView {
  return {
    id: r.id,
    description: r.description,
    amountCents: r.amount_cents,
    type: r.type as TransactionType,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryColor: r.category_color,
    categoryIcon: r.category_icon,
    accountId: r.account_id,
    accountName: r.account_name,
    date: r.date,
    year: r.year,
    month: r.month,
    notes: r.notes,
    recurringRuleId: r.recurring_rule_id,
    createdAt: r.created_at,
  };
}

function toRow(tx: Transaction): Record<string, unknown> {
  const p = tx.toPrimitives();
  return {
    id: p.id,
    userId: p.userId,
    accountId: p.accountId,
    categoryId: p.categoryId,
    year: p.period.year,
    month: p.period.month,
    date: p.date,
    description: p.description,
    descriptionKey: tx.descriptionKey,
    amountCents: p.amountCents,
    type: p.type,
    notes: p.notes,
    recurringRuleId: p.recurringRuleId,
    importHash: p.importHash,
    createdAt: p.createdAt,
  };
}

const INSERT_COLUMNS = `(id, user_id, account_id, category_id, year, month, date, description,
  description_key, amount_cents, type, notes, recurring_rule_id, import_hash, created_at)
  VALUES (@id, @userId, @accountId, @categoryId, @year, @month, @date, @description,
  @descriptionKey, @amountCents, @type, @notes, @recurringRuleId, @importHash, @createdAt)`;

export class SqliteTransactionRepository implements TransactionRepository {
  constructor(private readonly db: Db) {}

  findById(userId: string, id: string): Transaction | null {
    const row = this.db
      .prepare('SELECT * FROM transactions WHERE user_id = ? AND id = ?')
      .get(userId, id) as TransactionRow | undefined;
    return row ? toEntity(row) : null;
  }

  findView(userId: string, id: string): TransactionView | null {
    const row = this.db
      .prepare(`${VIEW_SELECT} WHERE t.user_id = ? AND t.id = ?`)
      .get(userId, id) as ViewRow | undefined;
    return row ? toView(row) : null;
  }

  save(tx: Transaction): void {
    this.db
      .prepare(
        `INSERT INTO transactions ${INSERT_COLUMNS}
         ON CONFLICT(id) DO UPDATE SET account_id = excluded.account_id,
           category_id = excluded.category_id, year = excluded.year, month = excluded.month,
           date = excluded.date, description = excluded.description,
           description_key = excluded.description_key, amount_cents = excluded.amount_cents,
           type = excluded.type, notes = excluded.notes,
           recurring_rule_id = excluded.recurring_rule_id`
      )
      .run(toRow(tx));
  }

  insertIfAbsent(tx: Transaction): boolean {
    return (
      this.db.prepare(`INSERT OR IGNORE INTO transactions ${INSERT_COLUMNS}`).run(toRow(tx))
        .changes > 0
    );
  }

  delete(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM transactions WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }

  listByPeriod(userId: string, period: Period): TransactionView[] {
    const rows = this.db
      .prepare(
        `${VIEW_SELECT} WHERE t.user_id = ? AND t.year = ? AND t.month = ?
         ORDER BY t.date DESC, t.created_at DESC`
      )
      .all(userId, period.year, period.month) as ViewRow[];
    return rows.map(toView);
  }

  search(userId: string, f: TransactionSearchFilters): TransactionSearchResult {
    const where: string[] = ['t.user_id = @userId'];
    const params: Record<string, unknown> = { userId, limit: f.limit, offset: f.offset };
    if (f.text) {
      where.push(
        "(t.description_key LIKE @text ESCAPE '\\' OR lower(COALESCE(t.notes, '')) LIKE @notes ESCAPE '\\')"
      );
      params.text = `%${escapeLike(normalizeText(f.text))}%`;
      params.notes = `%${escapeLike(f.text.toLowerCase())}%`;
    }
    if (f.type) {
      where.push('t.type = @type');
      params.type = f.type;
    }
    if (f.categoryIds && f.categoryIds.length > 0) {
      const keys = f.categoryIds.map((id, i) => {
        params[`cat${i}`] = id;
        return `@cat${i}`;
      });
      where.push(`t.category_id IN (${keys.join(', ')})`);
    }
    if (f.accountId) {
      where.push('t.account_id = @accountId');
      params.accountId = f.accountId;
    }
    if (f.from) {
      where.push('t.date >= @from');
      params.from = f.from;
    }
    if (f.to) {
      where.push('t.date <= @to');
      params.to = f.to;
    }
    if (f.minCents !== undefined) {
      where.push('t.amount_cents >= @minCents');
      params.minCents = f.minCents;
    }
    if (f.maxCents !== undefined) {
      where.push('t.amount_cents <= @maxCents');
      params.maxCents = f.maxCents;
    }
    const whereSql = where.join(' AND ');
    const rows = this.db
      .prepare(
        `${VIEW_SELECT} WHERE ${whereSql} ORDER BY ${SORTS[f.sort]} LIMIT @limit OFFSET @offset`
      )
      .all(params) as ViewRow[];
    const agg = this.db
      .prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_cents END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents END), 0) AS expense,
                COALESCE(SUM(CASE WHEN t.type = 'SAVING' THEN t.amount_cents END), 0) AS saving
           FROM transactions t WHERE ${whereSql}`
      )
      .get(params) as { total: number; income: number; expense: number; saving: number };
    return {
      items: rows.map(toView),
      total: agg.total,
      totals: { incomeCents: agg.income, expenseCents: agg.expense, savingCents: agg.saving },
    };
  }

  netBefore(userId: string, period: Period): Cents {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_cents ELSE -amount_cents END), 0) AS net
           FROM transactions t
          WHERE t.user_id = ? AND ${ORDINAL} < ?`
      )
      .get(userId, periodOrdinal(period)) as { net: number };
    return row.net;
  }

  totalsByPeriod(userId: string, from: Period, to: Period): PeriodTotals[] {
    const rows = this.db
      .prepare(
        `SELECT t.year, t.month,
                COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_cents END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents END), 0) AS expense,
                COALESCE(SUM(CASE WHEN t.type = 'SAVING' THEN t.amount_cents END), 0) AS saving
           FROM transactions t
          WHERE t.user_id = ? AND ${ORDINAL} BETWEEN ? AND ?
          GROUP BY t.year, t.month
          ORDER BY t.year, t.month`
      )
      .all(userId, periodOrdinal(from), periodOrdinal(to)) as {
      year: number;
      month: number;
      income: number;
      expense: number;
      saving: number;
    }[];
    return rows.map((r) => ({
      year: r.year,
      month: r.month,
      incomeCents: r.income,
      expenseCents: r.expense,
      savingCents: r.saving,
    }));
  }

  categoryTotals(
    userId: string,
    from: Period,
    to: Period,
    type: TransactionType
  ): CategoryPeriodTotal[] {
    return this.db
      .prepare(
        `SELECT t.year, t.month, c.name AS categoryName, SUM(t.amount_cents) AS cents
           FROM transactions t JOIN categories c ON c.id = t.category_id
          WHERE t.user_id = ? AND t.type = ? AND ${ORDINAL} BETWEEN ? AND ?
          GROUP BY t.year, t.month, c.id`
      )
      .all(userId, type, periodOrdinal(from), periodOrdinal(to)) as CategoryPeriodTotal[];
  }

  savedByCategory(userId: string): Record<string, Cents> {
    const rows = this.db
      .prepare(
        `SELECT category_id AS id, SUM(amount_cents) AS cents FROM transactions
          WHERE user_id = ? AND type = 'SAVING' GROUP BY category_id`
      )
      .all(userId) as { id: string; cents: number }[];
    return Object.fromEntries(rows.map((r) => [r.id, r.cents]));
  }

  existingImportHashes(userId: string, hashes: string[]): Set<string> {
    const found = new Set<string>();
    inChunks(hashes, 500, (chunk) => {
      const rows = this.db
        .prepare(
          `SELECT import_hash FROM transactions WHERE user_id = ? AND import_hash IN (${placeholders(
            chunk.length
          )})`
        )
        .all(userId, ...chunk) as { import_hash: string }[];
      rows.forEach((r) => found.add(r.import_hash));
    });
    return found;
  }

  lastCategoryByDescription(userId: string, descriptionKeys: string[]): Map<string, string> {
    const result = new Map<string, string>();
    inChunks([...new Set(descriptionKeys)], 500, (chunk) => {
      const rows = this.db
        .prepare(
          `SELECT description_key, category_id FROM transactions
            WHERE user_id = ? AND description_key IN (${placeholders(chunk.length)})
            ORDER BY date DESC, created_at DESC`
        )
        .all(userId, ...chunk) as { description_key: string; category_id: string }[];
      for (const r of rows) {
        if (!result.has(r.description_key)) result.set(r.description_key, r.category_id);
      }
    });
    return result;
  }

  listByRule(userId: string, ruleId: string): Transaction[] {
    const rows = this.db
      .prepare('SELECT * FROM transactions WHERE user_id = ? AND recurring_rule_id = ?')
      .all(userId, ruleId) as TransactionRow[];
    return rows.map(toEntity);
  }

  deleteByRule(userId: string, ruleId: string, fromPeriod?: Period): number {
    if (!fromPeriod) {
      return this.db
        .prepare('DELETE FROM transactions WHERE user_id = ? AND recurring_rule_id = ?')
        .run(userId, ruleId).changes;
    }
    return this.db
      .prepare(
        `DELETE FROM transactions
          WHERE user_id = ? AND recurring_rule_id = ? AND (year * 12 + month - 1) >= ?`
      )
      .run(userId, ruleId, periodOrdinal(fromPeriod)).changes;
  }

  listAllByUser(userId: string): Transaction[] {
    const rows = this.db
      .prepare('SELECT * FROM transactions WHERE user_id = ?')
      .all(userId) as TransactionRow[];
    return rows.map(toEntity);
  }

  exportAll(userId: string): TransactionView[] {
    const rows = this.db
      .prepare(`${VIEW_SELECT} WHERE t.user_id = ? ORDER BY t.date, t.created_at`)
      .all(userId) as ViewRow[];
    return rows.map(toView);
  }

  earliestPeriod(userId: string): Period | null {
    const row = this.db
      .prepare(
        'SELECT year, month FROM transactions WHERE user_id = ? ORDER BY year, month LIMIT 1'
      )
      .get(userId) as { year: number; month: number } | undefined;
    return row ?? null;
  }
}
