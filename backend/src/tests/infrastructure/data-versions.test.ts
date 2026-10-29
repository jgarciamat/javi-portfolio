import { VersionedCache } from '@application/shared/VersionedCache';
import { Transaction } from '@domain/model/Transaction';
import { openDatabase } from '@infrastructure/sqlite/database';
import {
  UserDataVersions,
  WriteTracking,
  methodNames,
  statsTracking,
  trackWrites,
} from '@infrastructure/sqlite/dataVersions';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import {
  SqliteAccountRepository,
  SqliteTransferRepository,
} from '@infrastructure/sqlite/repositories/SqliteAccountRepository';
import { SqliteCategoryRepository } from '@infrastructure/sqlite/repositories/SqliteCategoryRepository';
import { SqliteCategoryRuleRepository } from '@infrastructure/sqlite/repositories/SqliteCategoryRuleRepository';
import { SqliteLeakDecisionRepository } from '@infrastructure/sqlite/repositories/SqliteLeakDecisionRepository';
import {
  SqliteCategoryBudgetRepository,
  SqliteRecurringRuleRepository,
  SqliteSettingsRepository,
} from '@infrastructure/sqlite/repositories/SqlitePlanningRepositories';
import { SqliteTransactionRepository } from '@infrastructure/sqlite/repositories/SqliteTransactionRepository';
import { SqliteUserRepository } from '@infrastructure/sqlite/repositories/SqliteUserRepository';

describe('UserDataVersions', () => {
  it('gives a new stamp to the user who writes and leaves the others alone', () => {
    const v = new UserDataVersions();
    expect(v.of('a')).toBe(0);
    v.bump('a');
    expect(v.of('a')).toBe(1);
    expect(v.of('b')).toBe(0);
    v.bump('b');
    v.bump('a');
    expect([v.of('a'), v.of('b')]).toEqual([3, 2]);
  });

  it('moves every stamp up when the user of a write is not known', () => {
    const v = new UserDataVersions();
    v.bump('a');
    const before = [v.of('a'), v.of('b')];
    v.bumpAll();
    expect(v.of('a')).not.toBe(before[0]);
    expect(v.of('b')).not.toBe(before[1]);
    expect(v.of('a')).toBe(v.of('b'));
  });

  it('never hands an old stamp back when it forgets a user to stay bounded', () => {
    const v = new UserDataVersions(null, 2);
    v.bump('a'); // a = 1
    const kept = v.of('a');
    v.bump('a'); // a = 2: what was kept with 1 is stale
    v.bump('b'); // b = 3
    v.bump('c'); // c = 4, «a» is forgotten: the floor goes up to its last stamp
    expect(v.of('a')).toBe(2);
    expect(v.of('a')).not.toBe(kept);
    expect(v.of('b')).toBe(3);
    expect(v.of('c')).toBe(4);
    expect(v.of('someone else')).toBe(2);
  });

  it('has no stamp inside a transaction', () => {
    const db = { inTransaction: false };
    const v = new UserDataVersions(db);
    expect(v.of('a')).toBe(0);
    db.inTransaction = true;
    expect(v.of('a')).toBeNull();
  });
});

describe('VersionedCache', () => {
  const setup = (max?: number) => {
    const versions = new UserDataVersions();
    const cache = new VersionedCache<string>(versions, max);
    let calls = 0;
    const get = (user: string, key = 'k', value = `${user}:${key}`) =>
      cache.get(user, key, () => {
        calls++;
        return value;
      });
    return { versions, cache, get, calls: () => calls };
  };

  it('works a result out once while the data does not change', () => {
    const { versions, get, calls } = setup();
    expect(get('a')).toBe('a:k');
    expect(get('a')).toBe('a:k');
    expect(calls()).toBe(1);
    versions.bump('a');
    expect(get('a', 'k', 'new')).toBe('new');
    expect(calls()).toBe(2);
  });

  it('never serves one user what was worked out for another', () => {
    const { versions, get, calls } = setup();
    expect(get('a')).toBe('a:k');
    expect(get('b')).toBe('b:k');
    versions.bump('b');
    expect(get('a')).toBe('a:k');
    expect(calls()).toBe(2);
  });

  it('keeps nothing worked out while the data changed or inside a transaction', () => {
    const versions = new UserDataVersions();
    const cache = new VersionedCache<number>(versions);
    let n = 0;
    const writing = () => {
      versions.bump('a'); // e.g. the automatic operations added while reading
      return ++n;
    };
    expect(cache.get('a', 'k', writing)).toBe(1);
    expect(cache.size).toBe(0);
    expect(cache.get('a', 'k', () => ++n)).toBe(2);
    expect(cache.get('a', 'k', () => ++n)).toBe(2);

    const db = { inTransaction: true };
    const inTx = new VersionedCache<number>(new UserDataVersions(db));
    expect(inTx.get('a', 'k', () => ++n)).toBe(3);
    expect(inTx.get('a', 'k', () => ++n)).toBe(4);
    expect(inTx.size).toBe(0);
  });

  it('drops the least recently used entries first', () => {
    const { cache, get, calls } = setup(2);
    get('a');
    get('b');
    get('a'); // «a» used again: «b» is now the oldest
    get('c');
    expect(cache.size).toBe(2);
    expect(calls()).toBe(3);
    get('a');
    expect(calls()).toBe(3);
    get('b');
    expect(calls()).toBe(4);
  });
});

describe('trackWrites', () => {
  class Repo {
    rows: string[] = [];
    list(userId: string): string[] {
      return this.rows.filter((r) => r.startsWith(userId));
    }
    add(userId: string, row: string): void {
      this.helper();
      this.rows.push(`${userId}:${row}`);
    }
    fail(userId: string): void {
      throw new Error(`no ${userId}`);
    }
    unknown(): void {}
    private helper(): void {}
  }
  const tracking: WriteTracking = {
    untracked: ['list', 'helper'],
    writes: { add: (userId) => userId as string, fail: (userId) => userId as string },
  };

  it('moves the stamp of the owner of each write, even when the write fails', () => {
    const versions = new UserDataVersions();
    const repo = trackWrites(new Repo(), versions, tracking);
    expect(repo).toBeInstanceOf(Repo);
    repo.add('a', 'x');
    expect(repo.list('a')).toEqual(['a:x']);
    expect([versions.of('a'), versions.of('b')]).toEqual([1, 0]);
    expect(() => repo.fail('b')).toThrow('no b');
    expect(versions.of('b')).toBe(2);
    expect(versions.of('a')).toBe(1);
  });

  it('moves every stamp on a method it does not know', () => {
    const versions = new UserDataVersions();
    const repo = trackWrites(new Repo(), versions, tracking);
    versions.bump('a');
    repo.unknown();
    expect(versions.of('a')).toBe(2);
    expect(versions.of('b')).toBe(2);
  });

  it('can still be spied on in tests', () => {
    const repo = trackWrites(new Repo(), new UserDataVersions(), tracking);
    const spy = jest.spyOn(repo, 'list').mockReturnValue(['fake']);
    expect(repo.list('a')).toEqual(['fake']);
    spy.mockRestore();
  });
});

describe('statsTracking', () => {
  const db = openDatabase(':memory:');
  migrate(db, migrations);
  const repos: Record<string, object> = {
    transactions: new SqliteTransactionRepository(db),
    rules: new SqliteRecurringRuleRepository(db),
    categories: new SqliteCategoryRepository(db),
    accounts: new SqliteAccountRepository(db),
    transfers: new SqliteTransferRepository(db),
    budgets: new SqliteCategoryBudgetRepository(db),
    settings: new SqliteSettingsRepository(db),
    categoryRules: new SqliteCategoryRuleRepository(db),
    leakDecisions: new SqliteLeakDecisionRepository(db),
    users: new SqliteUserRepository(db),
  };
  const tracking = statsTracking(db);

  it('says, for every method of every repository the statistics read, whether it writes', () => {
    expect(Object.keys(tracking).sort()).toEqual(Object.keys(repos).sort());
    for (const [name, repo] of Object.entries(repos)) {
      const classified = [...tracking[name].untracked, ...Object.keys(tracking[name].writes)];
      expect({ name, methods: methodNames(repo).sort() }).toEqual({
        name,
        methods: [...new Set(classified)].sort(),
      });
      // Nothing is both a read and a write.
      expect(classified).toHaveLength(new Set(classified).size);
    }
  });

  it('finds the owner of a rule by its id, and moves every stamp for an unknown rule', () => {
    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u1', 'u1@x.es', 'U', 'x', '2026-01-01')"
    ).run();
    const accounts = new SqliteAccountRepository(db);
    const categories = new SqliteCategoryRepository(db);
    categories.seedDefaults('u1');
    db.prepare(
      "INSERT INTO accounts (id, user_id, name, type, initial_balance_cents, created_at) VALUES ('a1', 'u1', 'Cuenta', 'checking', 0, '2026-01-01')"
    ).run();
    const category = categories.listByUser('u1')[0];
    db.prepare(
      `INSERT INTO recurring_rules (id, user_id, description, amount_cents, type, category_id,
         account_id, start_year, start_month, frequency, active, created_at)
       VALUES ('r1', 'u1', 'Alquiler', 100, 'EXPENSE', ?, 'a1', 2026, 1, 'monthly', 1, '2026-01-01')`
    ).run(category.id);
    expect(accounts.listByUser('u1')).toHaveLength(1);

    const versions = new UserDataVersions(db);
    const rules = trackWrites(new SqliteRecurringRuleRepository(db), versions, tracking.rules);
    rules.addSkip('r1', { year: 2026, month: 2 });
    expect(versions.of('u1')).toBe(1);
    expect(versions.of('u2')).toBe(0);
    rules.clearSkipsFrom('missing', { year: 2026, month: 1 });
    expect(versions.of('u2')).toBe(2);

    const transactions = trackWrites(
      new SqliteTransactionRepository(db),
      versions,
      tracking.transactions
    );
    transactions.save(
      Transaction.create(
        {
          userId: 'u1',
          accountId: 'a1',
          categoryId: category.id,
          description: 'Pan',
          amountCents: 120,
          type: 'EXPENSE',
          date: '2026-03-01',
        },
        1
      )
    );
    expect(versions.of('u1')).toBe(3);
    expect(transactions.count('u1')).toBe(1);
    expect(versions.of('u1')).toBe(3);
  });
});
