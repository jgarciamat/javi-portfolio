import { ConflictError } from '@domain/errors';
import { Account, AccountType } from '@domain/model/Account';
import { Transfer } from '@domain/model/Transfer';
import { AccountRepository, TransferRepository, TransferView } from '@domain/ports/repositories';
import { Cents } from '@domain/shared/money';
import { Period } from '@domain/shared/period';
import { Db } from '../database';

interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance_cents: number;
  color: string;
  icon: string;
  archived: number;
  created_at: string;
}

const toAccount = (r: AccountRow): Account =>
  Account.reconstitute({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    type: r.type as AccountType,
    initialBalanceCents: r.initial_balance_cents,
    color: r.color,
    icon: r.icon,
    archived: r.archived === 1,
    createdAt: r.created_at,
  });

export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): Account[] {
    const rows = this.db
      .prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY archived, created_at')
      .all(userId) as AccountRow[];
    return rows.map(toAccount);
  }

  findById(userId: string, id: string): Account | null {
    const row = this.db
      .prepare('SELECT * FROM accounts WHERE user_id = ? AND id = ?')
      .get(userId, id) as AccountRow | undefined;
    return row ? toAccount(row) : null;
  }

  save(account: Account): void {
    const p = account.toPrimitives();
    try {
      this.db
        .prepare(
          `INSERT INTO accounts (id, user_id, name, type, initial_balance_cents, color, icon, archived, created_at)
           VALUES (@id, @userId, @name, @type, @initialBalanceCents, @color, @icon, @archived, @createdAt)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, type = excluded.type,
             initial_balance_cents = excluded.initial_balance_cents, color = excluded.color,
             icon = excluded.icon, archived = excluded.archived`
        )
        .run({ ...p, archived: p.archived ? 1 : 0 });
    } catch (e) {
      if (e instanceof Error && e.message.includes('UNIQUE')) {
        throw new ConflictError('Ya existe una cuenta con ese nombre', 'ACCOUNT_EXISTS');
      }
      throw e;
    }
  }

  delete(userId: string, id: string): void {
    this.db.prepare('DELETE FROM accounts WHERE user_id = ? AND id = ?').run(userId, id);
  }

  countReferences(userId: string, id: string): number {
    // A part of a split movement counts too (its row of transaction_splits points at the account).
    const tx = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM transactions t
          WHERE t.user_id = @userId AND (t.account_id = @id OR EXISTS (
            SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id AND s.account_id = @id))`
      )
      .get({ userId, id }) as { n: number };
    const tr = this.db
      .prepare(
        'SELECT COUNT(*) AS n FROM transfers WHERE user_id = ? AND (from_account_id = ? OR to_account_id = ?)'
      )
      .get(userId, id, id) as { n: number };
    return tx.n + tr.n;
  }

  movementBalances(
    userId: string,
    upTo?: { period: Period; endDate: string }
  ): Record<string, Cents> {
    // The movements belong to a period (year, month); the transfers only have a date. A split
    // movement adds each part to its account; any other, its whole amount to its account.
    const inPeriod = upTo ? 'AND (t.year, t.month) <= (@year, @month)' : '';
    const byDate = upTo ? 'AND date <= @endDate' : '';
    const rows = this.db
      .prepare(
        `SELECT account_id AS id, SUM(delta) AS cents FROM (
           SELECT t.account_id,
                  CASE WHEN t.type = 'INCOME' THEN t.amount_cents ELSE -t.amount_cents END AS delta
             FROM transactions t
            WHERE t.user_id = @userId ${inPeriod}
              AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id)
           UNION ALL
           SELECT s.account_id,
                  CASE WHEN t.type = 'INCOME' THEN s.amount_cents ELSE -s.amount_cents END
             FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id
            WHERE t.user_id = @userId ${inPeriod}
           UNION ALL
           SELECT to_account_id, amount_cents FROM transfers WHERE user_id = @userId ${byDate}
           UNION ALL
           SELECT from_account_id, -amount_cents FROM transfers WHERE user_id = @userId ${byDate}
         ) GROUP BY account_id`
      )
      .all({
        userId,
        ...(upTo
          ? { year: upTo.period.year, month: upTo.period.month, endDate: upTo.endDate }
          : {}),
      }) as { id: string; cents: number }[];
    return Object.fromEntries(rows.map((r) => [r.id, r.cents]));
  }
}

interface TransferRow {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_cents: number;
  date: string;
  description: string | null;
  created_at: string;
}

export class SqliteTransferRepository implements TransferRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string, limit: number): TransferView[] {
    const rows = this.db
      .prepare(
        `SELECT t.*, fa.name AS from_name, ta.name AS to_name
           FROM transfers t
           JOIN accounts fa ON fa.id = t.from_account_id
           JOIN accounts ta ON ta.id = t.to_account_id
          WHERE t.user_id = ?
          ORDER BY t.date DESC, t.created_at DESC
          LIMIT ?`
      )
      .all(userId, limit) as (TransferRow & { from_name: string; to_name: string })[];
    return rows.map((r) => ({
      id: r.id,
      fromAccountId: r.from_account_id,
      fromAccountName: r.from_name,
      toAccountId: r.to_account_id,
      toAccountName: r.to_name,
      amountCents: r.amount_cents,
      date: r.date,
      description: r.description,
      createdAt: r.created_at,
    }));
  }

  findById(userId: string, id: string): Transfer | null {
    const r = this.db
      .prepare('SELECT * FROM transfers WHERE user_id = ? AND id = ?')
      .get(userId, id) as TransferRow | undefined;
    return r
      ? Transfer.reconstitute({
          id: r.id,
          userId: r.user_id,
          fromAccountId: r.from_account_id,
          toAccountId: r.to_account_id,
          amountCents: r.amount_cents,
          date: r.date,
          description: r.description,
          createdAt: r.created_at,
        })
      : null;
  }

  save(transfer: Transfer): void {
    const p = transfer.toPrimitives();
    this.db
      .prepare(
        `INSERT INTO transfers (id, user_id, from_account_id, to_account_id, amount_cents, date, description, created_at)
         VALUES (@id, @userId, @fromAccountId, @toAccountId, @amountCents, @date, @description, @createdAt)`
      )
      .run(p);
  }

  delete(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM transfers WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }
}
