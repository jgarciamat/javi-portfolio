import { NotFoundError, ValidationError } from '@domain/errors';
import { Account, DEFAULT_ACCOUNT_NAME } from '@domain/model/Account';
import { AccountSplit, mergeSplits } from '@domain/model/AccountSplit';
import { Category } from '@domain/model/Category';
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

  findOrCreate(userId: string, name: string, icon?: string): Category {
    const existing = this.categories.findByName(userId, name);
    if (existing) return existing;
    const created = Category.create({ userId, name, icon });
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
    const all = this.accounts.listByUser(userId);
    const account = all.find((a) => !a.archived) ?? this.restoreOrCreateDefault(userId, all);
    this.settings.save({ ...settings, defaultAccountId: account.id });
    return account;
  }

  /**
   * Every account is archived (or there is none): the archived one with the default name is
   * brought back, since creating another with the same name would break the unique name.
   */
  private restoreOrCreateDefault(userId: string, all: Account[]): Account {
    const archived = all.find((a) => a.name === DEFAULT_ACCOUNT_NAME);
    const account = archived
      ? archived.update({ archived: false })
      : Account.create(userId, { name: DEFAULT_ACCOUNT_NAME });
    this.accounts.save(account);
    return account;
  }

  /**
   * Account for a movement an automatic operation generates: the one it chose while it is still
   * active; archived or gone (deleted accounts leave it null), the default one, so the movement
   * keeps counting in the total instead of landing where nobody sees it.
   */
  forGeneratedMovement(userId: string, accountId: string | null): Account {
    const chosen = accountId ? this.accounts.findById(userId, accountId) : null;
    return chosen && !chosen.archived ? chosen : this.defaultAccount(userId);
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

  /**
   * The parts of a split movement or operation: each account must be the user's (or the
   * household's) and active. A part that keeps an account of `kept` (the parts it already had)
   * is accepted even if that account was archived since, so editing anything else never fails.
   * The amounts are checked against the total by the entity.
   */
  resolveSplits(
    userId: string,
    splits: readonly AccountSplit[],
    kept: readonly AccountSplit[] = []
  ): AccountSplit[] {
    return splits.map((s) => ({
      accountId: kept.some((k) => k.accountId === s.accountId)
        ? this.requireById(userId, s.accountId).id
        : this.resolveForMovement(userId, s.accountId).id,
      amountCents: s.amountCents,
    }));
  }

  /**
   * Where a movement an automatic operation generates is noted: each part's account as
   * `forGeneratedMovement` says (archived or gone: the default one), parts that end in the same
   * account put together. `accountId` is the first part's (or the only) account.
   */
  forGeneratedSplits(
    userId: string,
    accountId: string | null,
    splits: readonly AccountSplit[]
  ): { accountId: string; splits: AccountSplit[] } {
    if (splits.length === 0) {
      return { accountId: this.forGeneratedMovement(userId, accountId).id, splits: [] };
    }
    const mapped = splits.map((s) => ({
      accountId: this.forGeneratedMovement(userId, s.accountId).id,
      amountCents: s.amountCents,
    }));
    return { accountId: mapped[0].accountId, splits: mergeSplits(mapped) };
  }
}
