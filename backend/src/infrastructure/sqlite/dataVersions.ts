import { DataVersions } from '@domain/ports/services';
import { Db } from './database';

/** Users whose last write is remembered; older ones fall back to the shared floor. */
export const DEFAULT_TRACKED_USERS = 10_000;

/**
 * The stamp of each user's money data, in memory (one process owns the database). Every stamp
 * comes from one counter that only goes up, so a stamp is never handed out twice:
 *
 *   - a write of a user gives that user a new stamp;
 *   - a write whose user is not known moves the floor (every user's stamp) up;
 *   - when a user is forgotten to keep the list bounded, the floor goes up to their last stamp,
 *     so what was kept with an older stamp of theirs is not served again.
 *
 * Rarely, more is thrown away than needed (other users without a stamp of their own); never
 * less. Inside a transaction there is no stamp (`null`): nothing is kept, as it could be rolled
 * back.
 */
export class UserDataVersions implements DataVersions {
  private counter = 0;
  private floor = 0;
  private readonly stamps = new Map<string, number>();

  constructor(
    private readonly db: Pick<Db, 'inTransaction'> | null = null,
    private readonly maxUsers = DEFAULT_TRACKED_USERS
  ) {}

  of(userId: string): number | null {
    if (this.db?.inTransaction) return null;
    return this.stamps.get(userId) ?? this.floor;
  }

  bump(userId: string): void {
    this.stamps.delete(userId);
    this.stamps.set(userId, ++this.counter);
    if (this.stamps.size > this.maxUsers) {
      const [oldest, stamp] = this.stamps.entries().next().value as [string, number];
      this.stamps.delete(oldest);
      this.floor = Math.max(this.floor, stamp);
    }
  }

  /** Every user's data may have changed. */
  bumpAll(): void {
    this.stamps.clear();
    this.floor = ++this.counter;
  }
}

/** Which user a write belongs to (`null`: not known, so every user's stamp moves). */
type Owner = (...args: unknown[]) => string | null;

/**
 * How the calls to a repository change the stamps: `untracked` methods (reads, and writes of
 * things the statistics do not use) leave them alone; `writes` give the owner a new stamp. A
 * method in neither list moves every stamp, so a new write method can never be missed.
 */
export interface WriteTracking {
  untracked: readonly string[];
  writes: Readonly<Record<string, Owner>>;
}

/** The first argument is the user id. */
export const userArg: Owner = (userId) => userId as string;
/** An entity with `toPrimitives().userId`. */
export const entityOwner: Owner = (entity) =>
  (entity as { toPrimitives(): { userId: string } }).toPrimitives().userId;
/** A plain object with `userId`. */
export const fieldOwner: Owner = (value) => (value as { userId: string }).userId;

/** Every method of the repository's classes (private ones too), by name. */
export function methodNames(repo: object): string[] {
  const names = new Set<string>();
  for (
    let p = Object.getPrototypeOf(repo);
    p && p !== Object.prototype;
    p = Object.getPrototypeOf(p)
  ) {
    for (const name of Object.getOwnPropertyNames(p)) {
      if (
        name !== 'constructor' &&
        typeof Object.getOwnPropertyDescriptor(p, name)?.value === 'function'
      ) {
        names.add(name);
      }
    }
  }
  return [...names];
}

/**
 * The repository with the stamps moved after each write (also when it fails: throwing away more
 * is harmless). Every call runs on the repository itself, so its own inner calls are not counted.
 */
export function trackWrites<T extends object>(
  repo: T,
  versions: UserDataVersions,
  tracking: WriteTracking
): T {
  const untracked = new Set(tracking.untracked);
  const tracked = Object.create(repo) as T;
  const source = repo as unknown as Record<string, (...args: unknown[]) => unknown>;
  for (const name of methodNames(repo)) {
    const method = source[name];
    const owner = tracking.writes[name];
    const call = untracked.has(name)
      ? method.bind(repo)
      : (...args: unknown[]): unknown => {
          try {
            return method.apply(repo, args);
          } finally {
            const userId = owner ? owner(...args) : null;
            if (userId === null) versions.bumpAll();
            else versions.bump(userId);
          }
        };
    Object.defineProperty(tracked, name, { value: call, writable: true, configurable: true });
  }
  return tracked;
}

/** The repositories whose data the statistics read, and how their calls move the stamps. */
export function statsTracking(db: Db): Record<string, WriteTracking> {
  const ruleOwner: Owner = (ruleId) =>
    (
      db.prepare('SELECT user_id FROM recurring_rules WHERE id = ?').get(ruleId) as
        { user_id: string } | undefined
    )?.user_id ?? null;
  return {
    transactions: {
      untracked: [
        'findById',
        'findView',
        'listByPeriod',
        'search',
        'netBefore',
        'totalsByPeriod',
        'categoryTotals',
        'savedByCategory',
        'savingByCategoryAndPeriod',
        'listSince',
        'listFromRulesBetween',
        'existingImportHashes',
        'lastCategoryByDescription',
        'listByRule',
        'listAllByUser',
        'listSubscriptionCandidates',
        'listTaxMovements',
        'firstDate',
        'scheduledTotals',
        'exportAll',
        'earliestPeriod',
        'count',
        'countSample',
      ],
      writes: {
        save: entityOwner,
        insertIfAbsent: entityOwner,
        delete: userArg,
        deleteByRule: userArg,
        deleteSample: userArg,
      },
    },
    rules: {
      untracked: ['listByUser', 'findById', 'skippedPeriods'],
      writes: { save: entityOwner, delete: userArg, addSkip: ruleOwner, clearSkipsFrom: ruleOwner },
    },
    categories: {
      untracked: ['listByUser', 'findById', 'findByName', 'usage'],
      writes: { save: entityOwner, delete: userArg, reassign: userArg, seedDefaults: userArg },
    },
    accounts: {
      untracked: ['listByUser', 'findById', 'countReferences', 'movementBalances'],
      writes: { save: entityOwner, delete: userArg },
    },
    transfers: {
      untracked: ['listByUser', 'findById'],
      writes: { save: entityOwner, delete: userArg },
    },
    budgets: {
      untracked: ['listByUser', 'findById', 'findByCategory'],
      writes: { save: entityOwner, delete: userArg },
    },
    settings: { untracked: ['get'], writes: { save: fieldOwner } },
    categoryRules: {
      untracked: ['listByUser'],
      writes: { save: fieldOwner, delete: userArg },
    },
    leakDecisions: {
      untracked: ['listByUser'],
      writes: { save: userArg, delete: userArg, deleteMany: userArg },
    },
    // Signing in saves the user too: only removing the account counts.
    users: {
      untracked: [
        'findOne',
        'findById',
        'findByEmail',
        'findByGoogleId',
        'findByVerificationTokenHash',
        'findByResetTokenHash',
        'save',
      ],
      writes: { delete: userArg },
    },
  };
}
