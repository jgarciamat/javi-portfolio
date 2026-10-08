import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { UnitOfWork } from '@domain/ports/repositories';

export type Db = Database.Database;

export function openDatabase(filePath: string): Db {
  const inMemory = filePath === ':memory:';
  if (!inMemory) fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  const db = new Database(filePath);
  if (!inMemory) db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  return db;
}

export class SqliteUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}

  run<T>(work: () => T): T {
    return this.db.transaction(work)();
  }
}

/** Escapes LIKE wildcards so user input is matched literally (use with ESCAPE '\\'). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Runs `fn` over `items` in chunks, to stay below SQLite's bound-parameter limit. */
export function inChunks<T>(items: T[], size: number, fn: (chunk: T[]) => void): void {
  for (let i = 0; i < items.length; i += size) fn(items.slice(i, i + size));
}

export function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}
