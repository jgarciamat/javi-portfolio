import fs from 'fs';
import path from 'path';
import { Db } from './database';

export interface Migration {
  version: number;
  name: string;
  up(db: Db): void;
}

export interface MigrationResult {
  from: number;
  to: number;
  backupFile: string | null;
}

interface Logger {
  info(message: string): void;
}

function hasUserTables(db: Db): boolean {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )
    .get() as { n: number };
  return row.n > 0;
}

/**
 * Applies pending migrations in order. Each one runs in its own transaction with
 * foreign keys disabled (needed to rebuild tables) and a foreign key check before
 * commit, so a migration either applies completely or not at all.
 *
 * When `databaseFile` is given and the database already has data, a copy is taken
 * with VACUUM INTO before touching anything.
 */
export function migrate(
  db: Db,
  migrations: Migration[],
  options: { databaseFile?: string; logger?: Logger } = {}
): MigrationResult {
  const logger = options.logger ?? { info: () => undefined };
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  const from = db.pragma('user_version', { simple: true }) as number;
  const pending = sorted.filter((m) => m.version > from);
  if (pending.length === 0) return { from, to: from, backupFile: null };

  let backupFile: string | null = null;
  if (options.databaseFile && options.databaseFile !== ':memory:' && hasUserTables(db)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupFile = path.join(
      path.dirname(path.resolve(options.databaseFile)),
      `pre-migration-v${from}-${stamp}.db`
    );
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    db.prepare('VACUUM INTO ?').run(backupFile);
    logger.info(`[migrate] backup written to ${backupFile}`);
  }

  for (const migration of pending) {
    logger.info(`[migrate] applying ${migration.version} ${migration.name}`);
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        migration.up(db);
        const violations = db.prepare('PRAGMA foreign_key_check').all();
        if (violations.length > 0) {
          throw new Error(
            `Migration ${migration.version} left ${
              violations.length
            } foreign key violations: ${JSON.stringify(violations.slice(0, 5))}`
          );
        }
        db.pragma(`user_version = ${migration.version}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
  const to = pending[pending.length - 1].version;
  return { from, to, backupFile };
}
