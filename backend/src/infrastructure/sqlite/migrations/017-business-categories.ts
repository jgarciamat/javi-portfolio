import { Migration } from '../migrator';

/**
 * Self-employed users mark which categories are professional activity and the VAT rate of
 * their movements; the quarterly VAT and income-tax estimate is computed from them.
 */
export const businessCategories: Migration = {
  version: 17,
  name: 'business categories',
  up(db) {
    db.exec(`
      CREATE TABLE category_business (
        category_id TEXT PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vat_rate    INTEGER NOT NULL CHECK(vat_rate IN (0, 4, 10, 21))
      );
      CREATE INDEX idx_category_business_user ON category_business(user_id);
    `);
  },
};
