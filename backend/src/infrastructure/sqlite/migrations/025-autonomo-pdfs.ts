import { Migration } from '../migrator';

/** How many draft PDFs each self-employed user has downloaded (the free plan allows one). */
export const autonomoPdfs: Migration = {
  version: 25,
  name: 'self-employed draft PDFs',
  up(db) {
    db.exec(`
      CREATE TABLE autonomo_pdfs (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        uses    INTEGER NOT NULL DEFAULT 0
      );
    `);
  },
};
