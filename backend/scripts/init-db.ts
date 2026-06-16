import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const migrationsPath = path.resolve(__dirname, '..', 'migrations', 'init.sql');
const dbPath = process.env.DATABASE_URL || path.resolve(__dirname, '..', '..', 'data', 'db.sqlite');

const sql = fs.readFileSync(migrationsPath, 'utf-8');

console.log(`Initializing DB at ${dbPath}`);
const db = new Database(dbPath);
try {
  db.exec(sql);
  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
} finally {
  db.close();
}
