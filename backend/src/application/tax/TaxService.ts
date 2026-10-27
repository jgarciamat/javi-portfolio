import { NotFoundError, PaymentRequiredError } from '@domain/errors';
import {
  AutonomoPdfRepository,
  AutonomoUsageRepository,
  BusinessCategoryRepository,
  CategoryRepository,
  TransactionRepository,
  VatRate,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { DraftInputs, DraftResult, prepareDraft } from '@domain/services/autonomo';
import { freeDraftQuarters, quarterOf } from '@domain/services/plans';
import { ExpenseLine, manualMovements } from '@domain/services/autonomo-expenses';
import { BusinessMovement, YearTax, yearlyTax } from '@domain/services/tax';
import { EntitlementService } from '@application/billing/EntitlementService';

/** Drafts prepared for one quarter. */
export interface QuarterDraftUsage {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  used: number;
  /** Territory of the last draft (null before any): a draft for another one may be the extra. */
  territory: string | null;
  /** The extra free draft for a change of territory has been used. */
  territoryExtraUsed: boolean;
}

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
    private readonly pdfs: AutonomoPdfRepository,
    private readonly clock: Clock
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
    // Only that year's professional movements, from SQL: the estimate adds up whole cents, so the
    // order they come in does not change it (with tens of thousands of movements, loading them all
    // took most of the time).
    const rates = new Map(this.business.listByUser(userId).map((b) => [b.categoryId, b.vatRate]));
    const movements = this.transactions
      .listTaxMovements(userId, [...rates.keys()], year)
      .map((t) => ({
        date: t.date,
        type: t.type,
        amountCents: t.amountCents,
        vatRate: rates.get(t.categoryId) as VatRate,
      }));
    return yearlyTax(year, movements);
  }

  /**
   * The draft of a quarter (modelo 303, modelo 130 and the contribution): the free plan can prepare
   * one per quarter, of the current one or of the one just ended while it can be filed; Premium as
   * many as it wants, of any quarter. A free draft spent with one territory gives one extra draft of
   * that quarter for another (the 130 goes from 20 % to 8 % in Ceuta, Melilla and La Palma), once.
   */
  draft(
    userId: string,
    year: number,
    quarter: 1 | 2 | 3 | 4,
    inputs: DraftInputs
  ): DraftResult & { used: number; expenses: ExpenseLine[] | null } {
    if (!this.entitlements.isPremium(userId)) {
      const allowed = freeDraftQuarters(this.clock.now());
      if (!allowed.some((q) => q.year === year && q.quarter === quarter)) {
        throw new PaymentRequiredError(
          'AUTONOMO_QUARTER_LOCKED',
          'Con el plan gratuito puedes preparar el borrador del trimestre actual y, mientras está abierto su plazo, el del trimestre que acaba de terminar; los demás son Premium',
          { ...allowed[0], allowed }
        );
      }
    }
    const record = this.drafts.record(userId, year, quarter);
    const territory = inputs.territory ?? 'general';
    let extra = false;
    try {
      this.entitlements.assertCanCreate(userId, 'autonomoDrafts', record.uses);
    } catch (limit) {
      // Rows from before territories were kept were made for the general one.
      if (record.territoryExtra || (record.territory ?? 'general') === territory) throw limit;
      extra = true;
    }
    const manual = inputs.manual ? manualMovements(year, inputs.manual) : null;
    const result = prepareDraft(year, quarter, manual?.movements ?? this.movements(userId), inputs);
    if (extra) this.drafts.useTerritoryExtra(userId, year, quarter, territory);
    return {
      ...result,
      expenses: manual ? manual.lines.filter((l) => l.quarter <= quarter) : null,
      // The extra draft does not count as one more of the plan: it redoes the one spent.
      used: extra ? record.uses : this.drafts.increment(userId, year, quarter, territory),
    };
  }

  /**
   * How many drafts the user has prepared this quarter (what the free plan limits).
   */
  draftsThisQuarter(userId: string): number {
    const { year, quarter } = quarterOf(this.clock.now());
    return this.drafts.count(userId, year, quarter);
  }

  /**
   * Drafts prepared for each quarter the free plan can draft today (the current one and, while
   * it can be filed, the one just ended), so the plan screen knows which of them is used up.
   */
  draftQuarters(userId: string): QuarterDraftUsage[] {
    return freeDraftQuarters(this.clock.now()).map((q) => {
      const record = this.drafts.record(userId, q.year, q.quarter);
      return {
        ...q,
        used: record.uses,
        territory: record.uses > 0 ? (record.territory ?? 'general') : null,
        territoryExtraUsed: record.territoryExtra,
      };
    });
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
