import { NotFoundError } from '@domain/errors';
import {
  BusinessCategoryRepository,
  CategoryRepository,
  TransactionRepository,
  VatRate,
} from '@domain/ports/repositories';
import { YearTax, yearlyTax } from '@domain/services/tax';
import { EntitlementService } from '@application/billing/EntitlementService';

export interface BusinessCategoryView {
  categoryId: string;
  categoryName: string;
  vatRate: VatRate;
}

/** Self-employed tools (Premium): which categories are professional, and the quarterly estimate. */
export class TaxService {
  constructor(
    private readonly business: BusinessCategoryRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly entitlements: EntitlementService
  ) {}

  list(userId: string): BusinessCategoryView[] {
    this.entitlements.assertFeature(userId, 'insights');
    const names = new Map(this.categories.listByUser(userId).map((c) => [c.id, c.name]));
    // A category's row goes away with it, so the name is always known.
    return this.business.listByUser(userId).map((b) => ({
      categoryId: b.categoryId,
      categoryName: names.get(b.categoryId) as string,
      vatRate: b.vatRate,
    }));
  }

  set(userId: string, categoryId: string, vatRate: VatRate): void {
    this.entitlements.assertFeature(userId, 'insights');
    if (!this.categories.findById(userId, categoryId)) {
      throw new NotFoundError('Categoría no encontrada', 'CATEGORY_NOT_FOUND');
    }
    this.business.set(userId, categoryId, vatRate);
  }

  remove(userId: string, categoryId: string): void {
    this.entitlements.assertFeature(userId, 'insights');
    this.business.remove(userId, categoryId);
  }

  yearly(userId: string, year: number): YearTax {
    this.entitlements.assertFeature(userId, 'insights');
    const rates = new Map(this.business.listByUser(userId).map((b) => [b.categoryId, b.vatRate]));
    const movements = this.transactions
      .listAllByUser(userId)
      .map((t) => t.toPrimitives())
      .filter((t) => rates.has(t.categoryId) && (t.type === 'INCOME' || t.type === 'EXPENSE'))
      .map((t) => ({
        date: t.date,
        type: t.type as 'INCOME' | 'EXPENSE',
        amountCents: t.amountCents,
        vatRate: rates.get(t.categoryId) as VatRate,
      }));
    return yearlyTax(year, movements);
  }
}
