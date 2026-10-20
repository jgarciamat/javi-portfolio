import { createHash } from 'crypto';
import { DomainError, ValidationError } from '@domain/errors';
import { Category } from '@domain/model/Category';
import { Transaction } from '@domain/model/Transaction';
import { TransactionType, parseTransactionType } from '@domain/model/TransactionType';
import {
  AccountRepository,
  CategoryBudgetRepository,
  CategoryRepository,
  CustomAlertRepository,
  GoalRepository,
  ImportUsageRepository,
  PersonalDataReader,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  TransferRepository,
  UnitOfWork,
  UserRepository,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { guessCategoryName } from '@domain/services/categorizer';
import { Cents, fromCents } from '@domain/shared/money';
import { toDateOnly } from '@domain/shared/period';
import { normalizeText } from '@domain/shared/text';
import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';
import { AiCategorizer } from '@application/ai/AiCategorizer';
import { EntitlementService } from '@application/billing/EntitlementService';
import { CategoryRuleService } from '@application/categories/CategoryRuleService';

// ─── Import ──────────────────────────────────────────────────────────────────

export const MAX_IMPORT_ROWS = 5000;

export interface ImportRow {
  date: string;
  description: string;
  /** Signed amount in cents: negative = expense, positive = income (unless `type` says otherwise). */
  amountCents: Cents;
  type?: string | null;
  category?: string | null;
  notes?: string | null;
}

export interface ImportedRowResult {
  index: number;
  status: 'imported' | 'duplicate' | 'invalid';
  date?: string;
  description?: string;
  amountCents?: Cents;
  type?: TransactionType;
  categoryName?: string;
  categorySource?: 'rule' | 'file' | 'history' | 'keywords' | 'ai' | 'fallback';
  error?: string;
}

export interface ImportResult {
  dryRun: boolean;
  imported: number;
  duplicates: number;
  invalid: number;
  rows: ImportedRowResult[];
}

interface PreparedRow {
  index: number;
  date: string;
  description: string;
  amountCents: Cents;
  type: TransactionType;
  category: string | null;
  notes: string | null;
  hash: string;
}

export class ImportService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly categoryResolver: CategoryResolver,
    private readonly accountResolver: AccountResolver,
    private readonly settings: SettingsRepository,
    private readonly entitlements: EntitlementService,
    private readonly categorizer: AiCategorizer,
    private readonly categoryRules: CategoryRuleService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly usage: ImportUsageRepository
  ) {}

  /**
   * Imports a bank statement: the free plan can import one (previews do not count and neither
   * does a file where nothing new was imported), Premium as many as it wants.
   */
  async import(
    userId: string,
    rows: ImportRow[],
    options: { accountId?: string | null; dryRun?: boolean; useAi?: boolean }
  ): Promise<ImportResult> {
    this.entitlements.assertCanCreate(userId, 'imports', this.usage.count(userId));
    const result = await this.importRows(userId, rows, options);
    if (!result.dryRun && result.imported > 0) this.usage.increment(userId);
    return result;
  }

  /** Payments read from the notifications of the bank apps (Premium): not a statement import. */
  async importCaptured(
    userId: string,
    rows: ImportRow[],
    options: { accountId?: string | null; dryRun?: boolean; useAi?: boolean }
  ): Promise<ImportResult> {
    this.entitlements.assertFeature(userId, 'capture');
    return this.importRows(userId, rows, options);
  }

  /**
   * Imports bank movements without counting them as a statement import (the e-mail inbox, which
   * checks its own plan). Re-importing the same file is safe: every row gets a
   * fingerprint (date, amount, description and its position among identical rows)
   * and rows already imported are skipped. Categories come from the file, the
   * user's own history for the same description, keyword rules, the AI (only when the
   * user opts in with `useAi`), or "Otros".
   */
  async importRows(
    userId: string,
    rows: ImportRow[],
    options: { accountId?: string | null; dryRun?: boolean; useAi?: boolean }
  ): Promise<ImportResult> {
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new ValidationError(`Máximo ${MAX_IMPORT_ROWS} filas por importación`, 'TOO_MANY_ROWS');
    }
    const results: ImportedRowResult[] = [];
    const prepared = this.prepare(userId, rows, results);
    const existing = this.transactions.existingImportHashes(
      userId,
      prepared.map((r) => r.hash)
    );
    const history = this.transactions.lastCategoryByDescription(
      userId,
      prepared.map((r) => normalizeText(r.description))
    );
    const startDay = this.settings.get(userId).monthStartDay;
    const categoryNames = this.categories.listByUser(userId).map((c) => c.name);
    const knownNames = new Set(categoryNames.map(normalizeText));
    const ruleFor = this.categoryRules.matcher(userId);
    const unplaced = prepared.filter((r) => {
      if (existing.has(r.hash) || r.category || ruleFor(r.description)) return false;
      if (history.has(normalizeText(r.description))) return false;
      const guess = guessCategoryName(r.description);
      return !guess || !knownNames.has(normalizeText(guess));
    });
    const aiGuesses = options.useAi
      ? await this.categorizer.suggest(
          userId,
          unplaced.map((r) => r.description),
          categoryNames
        )
      : new Map<string, string>();

    const run = (): void => {
      const account = this.accountResolver.resolveForMovement(userId, options.accountId);
      const byName = new Map(
        this.categories.listByUser(userId).map((c) => [normalizeText(c.name), c])
      );
      for (const row of prepared) {
        const base = {
          index: row.index,
          date: row.date,
          description: row.description,
          amountCents: row.amountCents,
          type: row.type,
        };
        if (existing.has(row.hash)) {
          results.push({ ...base, status: 'duplicate' });
          continue;
        }
        const { category, source } = this.pickCategory(
          userId,
          row,
          ruleFor,
          history,
          aiGuesses,
          byName,
          !options.dryRun
        );
        if (!options.dryRun) {
          const tx = Transaction.create(
            {
              userId,
              accountId: account.id,
              categoryId: category.id,
              description: row.description,
              amountCents: row.amountCents,
              type: row.type,
              date: row.date,
              notes: row.notes,
              importHash: row.hash,
            },
            startDay,
            this.clock.now()
          );
          if (!this.transactions.insertIfAbsent(tx)) {
            results.push({ ...base, status: 'duplicate' });
            continue;
          }
        }
        existing.add(row.hash);
        results.push({
          ...base,
          status: 'imported',
          categoryName: category.name,
          categorySource: source,
        });
      }
    };
    if (options.dryRun) run();
    else this.uow.run(run);

    results.sort((a, b) => a.index - b.index);
    return {
      dryRun: !!options.dryRun,
      imported: results.filter((r) => r.status === 'imported').length,
      duplicates: results.filter((r) => r.status === 'duplicate').length,
      invalid: results.filter((r) => r.status === 'invalid').length,
      rows: results,
    };
  }

  private prepare(userId: string, rows: ImportRow[], results: ImportedRowResult[]): PreparedRow[] {
    const occurrences = new Map<string, number>();
    const prepared: PreparedRow[] = [];
    rows.forEach((row, index) => {
      try {
        const date = toDateOnly(row.date);
        const description = (row.description ?? '').trim().slice(0, 200);
        if (!description) throw new ValidationError('Descripción vacía');
        if (!Number.isInteger(row.amountCents) || row.amountCents === 0) {
          throw new ValidationError('Importe inválido');
        }
        const type = row.type
          ? parseTransactionType(row.type)
          : row.amountCents > 0
            ? 'INCOME'
            : 'EXPENSE';
        const baseKey = `${userId}|${date}|${row.amountCents}|${normalizeText(description)}`;
        const nth = (occurrences.get(baseKey) ?? 0) + 1;
        occurrences.set(baseKey, nth);
        prepared.push({
          index,
          date,
          description,
          amountCents: Math.abs(row.amountCents),
          type,
          category: row.category?.trim() || null,
          notes: row.notes?.trim() || null,
          hash: createHash('sha256').update(`${baseKey}|${nth}`).digest('hex'),
        });
      } catch (e) {
        results.push({
          index,
          status: 'invalid',
          error: e instanceof DomainError ? e.message : 'Fila inválida',
        });
      }
    });
    return prepared;
  }

  private pickCategory(
    userId: string,
    row: PreparedRow,
    ruleFor: (description: string) => string | null,
    history: Map<string, string>,
    aiGuesses: Map<string, string>,
    byName: Map<string, Category>,
    persist: boolean
  ): { category: Category; source: ImportedRowResult['categorySource'] } {
    const ensure = (name: string): Category => {
      const key = normalizeText(name);
      const known = byName.get(key);
      if (known) return known;
      const created = persist
        ? this.categoryResolver.findOrCreate(userId, name)
        : Category.create({ userId, name });
      byName.set(key, created);
      return created;
    };
    // What the user taught beats the file's own category, their history and every guess.
    const ruleId = ruleFor(row.description);
    const ruleCategory = ruleId ? this.categories.findById(userId, ruleId) : null;
    if (ruleCategory) return { category: ruleCategory, source: 'rule' };
    if (row.category) return { category: ensure(row.category), source: 'file' };
    const fromHistory = history.get(normalizeText(row.description));
    const historyCategory = fromHistory ? this.categories.findById(userId, fromHistory) : null;
    if (historyCategory) return { category: historyCategory, source: 'history' };
    const guess = guessCategoryName(row.description);
    if (guess && byName.has(normalizeText(guess))) {
      return { category: byName.get(normalizeText(guess))!, source: 'keywords' };
    }
    const aiGuess = aiGuesses.get(normalizeText(row.description));
    if (aiGuess && byName.has(normalizeText(aiGuess))) {
      return { category: byName.get(normalizeText(aiGuess))!, source: 'ai' };
    }
    return { category: ensure('Otros'), source: 'fallback' };
  }
}

// ─── Export ──────────────────────────────────────────────────────────────────

const money = (cents: Cents): number => fromCents(cents);

export const EXPORT_FORMAT = 'finanverso-export';
export const EXPORT_VERSION = 3;

export class ExportService {
  constructor(
    private readonly users: UserRepository,
    private readonly settings: SettingsRepository,
    private readonly accounts: AccountRepository,
    private readonly transfers: TransferRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly rules: RecurringRuleRepository,
    private readonly alerts: CustomAlertRepository,
    private readonly budgets: CategoryBudgetRepository,
    private readonly goals: GoalRepository,
    private readonly personalData: PersonalDataReader,
    private readonly clock: Clock
  ) {}

  /**
   * Everything stored about the user, in a portable format (GDPR art. 20).
   * Version 3 renamed the format from `money-manager-export` and added the sections
   * of `PersonalDataReader`; nothing reads these files back, so old ones need no shim.
   */
  exportAll(userId: string): Record<string, unknown> {
    const user = this.users.findById(userId);
    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: this.clock.now().toISOString(),
      profile: user ? { ...user.toPublic(), createdAt: user.toPrimitives().createdAt } : null,
      settings: this.settings.get(userId),
      accounts: this.accounts.listByUser(userId).map((a) => {
        const p = a.toPrimitives();
        return { ...p, initialBalance: money(p.initialBalanceCents) };
      }),
      categories: this.categories.listByUser(userId).map((c) => c.toPrimitives()),
      transactions: this.transactions.exportAll(userId).map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: money(t.amountCents),
        type: t.type,
        category: t.categoryName,
        account: t.accountName,
        notes: t.notes,
        recurringRuleId: t.recurringRuleId,
      })),
      transfers: this.transfers
        .listByUser(userId, 100_000)
        .map((t) => ({ ...t, amount: money(t.amountCents) })),
      recurringRules: this.rules.listByUser(userId).map((r) => {
        const p = r.toPrimitives();
        return { ...p, amount: money(p.amountCents) };
      }),
      customAlerts: this.alerts.listByUser(userId).map((a) => a.toPrimitives()),
      budgets: this.budgets.listByUser(userId).map((b) => ({ ...b, amount: money(b.amountCents) })),
      goals: this.goals.listByUser(userId).map((g) => {
        const p = g.toPrimitives();
        return { ...p, target: money(p.targetCents) };
      }),
      ...this.personalData.sectionsFor(userId),
    };
  }
}
