import { BusinessCategory, BusinessCategoryRepository, VatRate } from '@domain/ports/repositories';
import { Db } from '../database';

export class SqliteBusinessCategoryRepository implements BusinessCategoryRepository {
  constructor(private readonly db: Db) {}

  listByUser(userId: string): BusinessCategory[] {
    return (
      this.db
        .prepare(
          'SELECT category_id AS categoryId, vat_rate AS vatRate FROM category_business WHERE user_id = ?'
        )
        .all(userId) as { categoryId: string; vatRate: number }[]
    ).map((r) => ({ categoryId: r.categoryId, vatRate: r.vatRate as VatRate }));
  }

  set(userId: string, categoryId: string, vatRate: VatRate): void {
    this.db
      .prepare(
        `INSERT INTO category_business (category_id, user_id, vat_rate) VALUES (?, ?, ?)
         ON CONFLICT(category_id) DO UPDATE SET vat_rate = excluded.vat_rate`
      )
      .run(categoryId, userId, vatRate);
  }

  remove(userId: string, categoryId: string): void {
    this.db
      .prepare('DELETE FROM category_business WHERE user_id = ? AND category_id = ?')
      .run(userId, categoryId);
  }
}
