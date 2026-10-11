import { CategoryRule, CategoryRuleRepository } from '@domain/ports/repositories';
import { Db } from '../database';

interface RuleRow {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string;
  created_at: string;
}

const toRule = (r: RuleRow): CategoryRule => ({
  id: r.id,
  userId: r.user_id,
  pattern: r.pattern,
  categoryId: r.category_id,
  createdAt: r.created_at,
});

export class SqliteCategoryRuleRepository implements CategoryRuleRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): CategoryRule[] {
    const rows = this.db
      .prepare('SELECT * FROM category_rules WHERE user_id = ? ORDER BY pattern')
      .all(userId) as RuleRow[];
    return rows.map(toRule);
  }

  save(rule: CategoryRule): CategoryRule {
    this.db
      .prepare(
        `INSERT INTO category_rules (id, user_id, pattern, category_id, created_at)
         VALUES (@id, @userId, @pattern, @categoryId, @createdAt)
         ON CONFLICT(user_id, pattern) DO UPDATE SET category_id = excluded.category_id`
      )
      .run(rule);
    const row = this.db
      .prepare('SELECT * FROM category_rules WHERE user_id = ? AND pattern = ?')
      .get(rule.userId, rule.pattern) as RuleRow;
    return toRule(row);
  }

  delete(userId: string, id: string): boolean {
    return (
      this.db.prepare('DELETE FROM category_rules WHERE user_id = ? AND id = ?').run(userId, id)
        .changes > 0
    );
  }
}
