import { NotFoundError } from '@domain/errors';
import {
  AutonomoPdfRepository,
  AutonomoUsageRepository,
  BusinessCategoryRepository,
  CategoryRepository,
  TransactionRepository,
  VatRate,
} from '@domain/ports/repositories';
import { DraftInputs, DraftResult, prepareDraft } from '@domain/services/autonomo';
import { ExpenseLine, manualMovements } from '@domain/services/autonomo-expenses';
import { BusinessMovement, YearTax, yearlyTax } from '@domain/services/tax';
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
    private readonly entitlements: EntitlementService,
    private readonly drafts: AutonomoUsageRepository,
    private readonly pdfs: AutonomoPdfRepository
  ) {}

  list(userId: string): BusinessCategoryView[] {
    const names = new Map(this.categories.listByUser(userId).map((c) => [c.id, c.name]));
    // A category's row goes away with it, so the name is always known.
    return this.business.listByUser(userId).map((b) => ({
      categoryId: b.categoryId,
      categoryName: names.get(b.categoryId) as string,
      vatRate: b.vatRate,
    }));
  }

  set(userId: string, categoryId: string, vatRate: VatRate): void {
    if (!this.categories.findById(userId, categoryId)) {
      throw new NotFoundError('Categoría no encontrada', 'CATEGORY_NOT_FOUND');
    }
    this.business.set(userId, categoryId, vatRate);
  }

  remove(userId: string, categoryId: string): void {
    this.business.remove(userId, categoryId);
  }

  yearly(userId: string, year: number): YearTax {
    return yearlyTax(year, this.movements(userId));
  }

  /**
   * The draft of a quarter (modelo 303, modelo 130 and the contribution): the free plan can prepare
   * one, Premium as many as it wants.
   */
  draft(
    userId: string,
    year: number,
    quarter: 1 | 2 | 3 | 4,
    inputs: DraftInputs
  ): DraftResult & { used: number; expenses: ExpenseLine[] | null } {
    this.entitlements.assertCanCreate(userId, 'autonomoDrafts', this.drafts.count(userId));
    const manual = inputs.manual ? manualMovements(year, inputs.manual) : null;
    const result = prepareDraft(year, quarter, manual?.movements ?? this.movements(userId), inputs);
    return {
      ...result,
      expenses: manual ? manual.lines.filter((l) => l.quarter <= quarter) : null,
      used: this.drafts.increment(userId),
    };
  }

  /** A draft downloaded as a PDF: the free plan can download one, Premium as many as it wants. */
  recordPdf(userId: string): { used: number } {
    this.entitlements.assertCanCreate(userId, 'autonomoPdfs', this.pdfs.count(userId));
    return { used: this.pdfs.increment(userId) };
  }

  private movements(userId: string): BusinessMovement[] {
    const rates = new Map(this.business.listByUser(userId).map((b) => [b.categoryId, b.vatRate]));
    return this.transactions
      .listAllByUser(userId)
      .map((t) => t.toPrimitives())
      .filter((t) => rates.has(t.categoryId) && (t.type === 'INCOME' || t.type === 'EXPENSE'))
      .map((t) => ({
        date: t.date,
        type: t.type as 'INCOME' | 'EXPENSE',
        amountCents: t.amountCents,
        vatRate: rates.get(t.categoryId) as VatRate,
      }));
  }
}
