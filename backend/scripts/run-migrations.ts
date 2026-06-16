import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const migrationsDir = path.resolve(__dirname, '..', 'migrations');
const dbPath = process.env.DATABASE_URL || path.resolve(__dirname, '..', '..', 'data', 'db.sqlite');

const db = new Database(dbPath);

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function appliedMigrations() {
  const rows = db.prepare('SELECT id FROM migrations').all();
  return new Set(rows.map((r: any) => r.id));
}

function applyMigration(id: string, name: string, sql: string) {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)').run(id, name, now);
  });
  tx();
}

try {
  ensureMigrationsTable();
  const applied = appliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const id = file;
    if (applied.has(id)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Applying migration ${file}...`);
    applyMigration(id, file, sql);
    console.log(`Applied ${file}`);
  }
  console.log('All migrations applied.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  db.close();
}
