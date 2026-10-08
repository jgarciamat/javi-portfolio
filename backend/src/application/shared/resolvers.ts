import { NotFoundError, ValidationError } from '@domain/errors';
import { Account, DEFAULT_ACCOUNT_NAME } from '@domain/model/Account';
import { Category, FALLBACK_CATEGORY_NAME } from '@domain/model/Category';
import {
  AccountRepository,
  CategoryRepository,
  SettingsRepository,
} from '@domain/ports/repositories';

export interface CategoryRef {
  categoryId?: string | null;
  /** Category name; created on the fly when the user does not have it yet. */
  category?: string | null;
}

export class CategoryResolver {
  constructor(private readonly categories: CategoryRepository) {}

  requireById(userId: string, id: string): Category {
    const category = this.categories.findById(userId, id);
    if (!category) throw new NotFoundError('Categoría no encontrada', 'CATEGORY_NOT_FOUND');
    return category;
  }

  findOrCreate(userId: string, name: string): Category {
    const existing = this.categories.findByName(userId, name);
    if (existing) return existing;
    const created = Category.create({ userId, name });
    this.categories.save(created);
    return created;
  }

  resolve(userId: string, ref: CategoryRef): Category {
    if (ref.categoryId) return this.requireById(userId, ref.categoryId);
    if (ref.category && ref.category.trim()) return this.findOrCreate(userId, ref.category);
    throw new ValidationError('La categoría es obligatoria', 'CATEGORY_REQUIRED');
  }

  resolveOptional(userId: string, ref: CategoryRef): Category | null {
    if (!ref.categoryId && !(ref.category && ref.category.trim())) return null;
    return this.resolve(userId, ref);
  }

  fallback(userId: string): Category {
    return this.findOrCreate(userId, FALLBACK_CATEGORY_NAME);
  }
}

export class AccountResolver {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly settings: SettingsRepository
  ) {}

  requireById(userId: string, id: string): Account {
    const account = this.accounts.findById(userId, id);
    if (!account) throw new NotFoundError('Cuenta no encontrada', 'ACCOUNT_NOT_FOUND');
    return account;
  }

  /** The account used when a movement does not say which one (self-heals if missing). */
  defaultAccount(userId: string): Account {
    const settings = this.settings.get(userId);
    if (settings.defaultAccountId) {
      const account = this.accounts.findById(userId, settings.defaultAccountId);
      if (account && !account.archived) return account;
    }
    const firstActive = this.accounts.listByUser(userId).find((a) => !a.archived);
    const account = firstActive ?? Account.create(userId, { name: DEFAULT_ACCOUNT_NAME });
    if (!firstActive) this.accounts.save(account);
    this.settings.save({ ...settings, defaultAccountId: account.id });
    return account;
  }

  /** Account for a new or edited movement: explicit (must be active) or the default one. */
  resolveForMovement(userId: string, accountId?: string | null): Account {
    if (!accountId) return this.defaultAccount(userId);
    const account = this.requireById(userId, accountId);
    if (account.archived) {
      throw new ValidationError('La cuenta está archivada', 'ACCOUNT_ARCHIVED');
    }
    return account;
  }
}
