import { rmSync } from 'node:fs';

/** Removes the run's database and SQLite's side files. */
export default function teardown(): void {
  const database = process.env.E2E_DATABASE;
  if (!database) return;
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${database}${suffix}`, { force: true });
}
