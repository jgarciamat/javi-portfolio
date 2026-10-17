import { Migration } from '../migrator';

/**
 * Indexes on the foreign keys that had none. Deleting a category, an account, a split member or
 * a user made SQLite scan these whole tables to apply ON DELETE (or to check nothing points to
 * the row), and the lookups by category read every rule, alert, budget and goal of the table.
 */
export const foreignKeyIndexes: Migration = {
  version: 26,
  name: 'foreign key indexes',
  up(db) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_default_account ON user_settings(default_account_id);
      CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user ON affiliate_clicks(user_id);
      CREATE INDEX IF NOT EXISTS idx_split_shares_member ON split_shares(member_id);
      CREATE INDEX IF NOT EXISTS idx_split_expenses_paid_by ON split_expenses(paid_by);
      CREATE INDEX IF NOT EXISTS idx_recurring_rules_category ON recurring_rules(category_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_rules_account ON recurring_rules(account_id);
      CREATE INDEX IF NOT EXISTS idx_custom_alerts_category ON custom_alerts(category_id);
      CREATE INDEX IF NOT EXISTS idx_category_budgets_category ON category_budgets(category_id);
      CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category_id);
      CREATE INDEX IF NOT EXISTS idx_category_rules_category ON category_rules(category_id);
    `);
  },
};
