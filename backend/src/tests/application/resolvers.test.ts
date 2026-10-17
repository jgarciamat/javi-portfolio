import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';
import { Account } from '@domain/model/Account';
import { FALLBACK_CATEGORY_NAME } from '@domain/model/Category';
import { TestContext, TestUser, createTestApp, createUser } from '../helpers/testApp';

describe('resolvers', () => {
  let ctx: TestContext;
  let user: TestUser;
  let accounts: AccountResolver;
  let categories: CategoryResolver;

  beforeEach(async () => {
    ctx = createTestApp();
    user = await createUser(ctx);
    accounts = new AccountResolver(ctx.container.repos.accounts, ctx.container.repos.settings);
    categories = new CategoryResolver(ctx.container.repos.categories);
  });

  const archiveAll = () => {
    for (const a of ctx.container.repos.accounts.listByUser(user.id)) {
      ctx.container.repos.accounts.save(a.update({ archived: true }));
    }
  };

  it('replaces an archived default account with the first active one, or a new one', () => {
    const repo = ctx.container.repos.accounts;
    const first = accounts.defaultAccount(user.id);
    const second = Account.create(user.id, { name: 'Ahorro' });
    repo.save(second);
    repo.save(first.update({ archived: true }));
    expect(accounts.defaultAccount(user.id).id).toBe(second.id);
    expect(ctx.container.repos.settings.get(user.id).defaultAccountId).toBe(second.id);

    // No account at all (self-healing): a new one is created and becomes the default.
    for (const a of repo.listByUser(user.id)) repo.delete(user.id, a.id);
    const created = accounts.defaultAccount(user.id);
    expect([first.id, second.id]).not.toContain(created.id);
    expect(repo.findById(user.id, created.id)?.archived).toBe(false);
    expect(accounts.defaultAccount(user.id).id).toBe(created.id);
  });

  it('refuses archived or unknown accounts for a movement', () => {
    const account = accounts.defaultAccount(user.id);
    expect(accounts.resolveForMovement(user.id, null).id).toBe(account.id);
    expect(accounts.resolveForMovement(user.id, account.id).id).toBe(account.id);
    archiveAll();
    expect(() => accounts.resolveForMovement(user.id, account.id)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_ARCHIVED' })
    );
    expect(() => accounts.resolveForMovement(user.id, 'nope')).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND' })
    );
  });

  it('finds or creates categories by name, and the fallback one', () => {
    const fallback = categories.fallback(user.id);
    expect(fallback.name).toBe(FALLBACK_CATEGORY_NAME);
    expect(categories.fallback(user.id).id).toBe(fallback.id);
    expect(categories.resolveOptional(user.id, { category: '   ' })).toBeNull();
    expect(categories.resolveOptional(user.id, {})).toBeNull();
    const created = categories.resolve(user.id, { category: 'Mascotas' });
    expect(categories.resolve(user.id, { categoryId: created.id }).name).toBe('Mascotas');
    expect(() => categories.resolve(user.id, { category: ' ' })).toThrow(
      expect.objectContaining({ code: 'CATEGORY_REQUIRED' })
    );
    expect(() => categories.requireById(user.id, 'nope')).toThrow(
      expect.objectContaining({ code: 'CATEGORY_NOT_FOUND' })
    );
  });
});
