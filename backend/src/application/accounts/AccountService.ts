import { ConflictError, NotFoundError, ValidationError } from '@domain/errors';
import { Account, AccountInput, AccountProps } from '@domain/model/Account';
import { mergeSplits } from '@domain/model/AccountSplit';
import { Transfer } from '@domain/model/Transfer';
import {
  AccountRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransferRepository,
  TransferView,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { Period, periodEnd } from '@domain/shared/period';
import { AccountResolver } from '@application/shared/resolvers';
import { EntitlementService } from '@application/billing/EntitlementService';

export interface AccountWithBalance extends AccountProps {
  balanceCents: Cents;
  isDefault: boolean;
}

export class AccountService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transfers: TransferRepository,
    private readonly settings: SettingsRepository,
    private readonly resolver: AccountResolver,
    private readonly entitlements: EntitlementService,
    private readonly clock: Clock,
    private readonly rules: RecurringRuleRepository,
    private readonly uow: UnitOfWork
  ) {}

  /**
   * An account where active automatic operations note their movements cannot be archived nor
   * deleted: they would keep charging an account that no longer counts. Being one of the
   * accounts an operation is split between counts too. Paused ones do not block (they generate
   * nothing; when resumed they go to the default account meanwhile).
   */
  private assertNoActiveRules(userId: string, account: Account, action: string): void {
    const names = this.rules
      .listByUser(userId)
      .filter((r) => r.active && r.usesAccount(account.id))
      .map((r) => r.description);
    if (names.length === 0) return;
    throw new ConflictError(
      `No puedes ${action} «${account.name}»: la usan estas operaciones automáticas activas: ` +
        `${names.join(', ')}. Cambia su cuenta o páusalas antes.`,
      'ACCOUNT_HAS_RECURRING',
      { rules: names }
    );
  }

  private activeCount(userId: string): number {
    return this.accounts.listByUser(userId).filter((a) => !a.archived).length;
  }

  /**
   * With `period`, each balance is what the account holds at the end of that period (the same
   * moment as the month's available balance); without it, everything recorded, future included.
   */
  list(userId: string, period?: Period): { accounts: AccountWithBalance[]; totalCents: Cents } {
    const defaultId = this.resolver.defaultAccount(userId).id;
    const upTo = period
      ? {
          period,
          endDate: periodEnd(period, this.settings.get(userId).monthStartDay),
        }
      : undefined;
    const movements = this.accounts.movementBalances(userId, upTo);
    const accounts = this.accounts.listByUser(userId).map((a) => {
      const p = a.toPrimitives();
      return {
        ...p,
        balanceCents: p.initialBalanceCents + (movements[p.id] ?? 0),
        isDefault: p.id === defaultId,
      };
    });
    const totalCents = accounts
      .filter((a) => !a.archived)
      .reduce((sum, a) => sum + a.balanceCents, 0);
    return { accounts, totalCents };
  }

  /** Σ initial balances: part of the money available before any movement. */
  initialBalanceTotal(userId: string): Cents {
    return this.accounts.listByUser(userId).reduce((sum, a) => sum + a.initialBalanceCents, 0);
  }

  create(userId: string, input: AccountInput): AccountProps {
    this.entitlements.assertCanCreate(userId, 'accounts', this.activeCount(userId));
    const account = Account.create(userId, input, this.clock.now());
    this.accounts.save(account);
    return account.toPrimitives();
  }

  update(
    userId: string,
    id: string,
    changes: Partial<AccountInput> & { archived?: boolean }
  ): AccountProps {
    const account = this.resolver.requireById(userId, id);
    const settings = this.settings.get(userId);
    if (changes.archived === false && account.archived) {
      this.entitlements.assertCanCreate(userId, 'accounts', this.activeCount(userId));
    }
    if (changes.archived && settings.defaultAccountId === id) {
      throw new ConflictError(
        'No puedes archivar la cuenta por defecto. Elige otra cuenta por defecto primero.',
        'DEFAULT_ACCOUNT'
      );
    }
    if (changes.archived && !account.archived)
      this.assertNoActiveRules(userId, account, 'archivar');
    const updated = account.update(changes);
    this.accounts.save(updated);
    return updated.toPrimitives();
  }

  delete(userId: string, id: string): void {
    const account = this.resolver.requireById(userId, id);
    if (this.settings.get(userId).defaultAccountId === id) {
      throw new ConflictError('No puedes eliminar la cuenta por defecto', 'DEFAULT_ACCOUNT');
    }
    this.assertNoActiveRules(userId, account, 'eliminar');
    if (this.accounts.countReferences(userId, id) > 0) {
      throw new ConflictError(
        'La cuenta tiene movimientos. Archívala en lugar de eliminarla.',
        'ACCOUNT_IN_USE'
      );
    }
    this.uow.run(() => {
      this.releaseFromPausedRules(userId, id);
      this.accounts.delete(userId, id);
    });
  }

  /**
   * A paused operation split with the account being removed: that part goes to the default
   * account (put together with a part already there), as a whole-amount operation in the
   * account would follow the default one once the account is gone.
   */
  private releaseFromPausedRules(userId: string, id: string): void {
    const fallback = this.resolver.defaultAccount(userId).id;
    for (const rule of this.rules.listByUser(userId)) {
      if (!rule.splits.some((s) => s.accountId === id)) continue;
      const splits = mergeSplits(
        rule.splits.map((s) => (s.accountId === id ? { ...s, accountId: fallback } : s))
      );
      this.rules.save(rule.update({ accountId: splits[0]?.accountId ?? fallback, splits }));
    }
  }

  listTransfers(userId: string, limit = 50): TransferView[] {
    return this.transfers.listByUser(userId, limit);
  }

  createTransfer(
    userId: string,
    input: {
      fromAccountId: string;
      toAccountId: string;
      amountCents: Cents;
      date: string;
      description?: string | null;
    }
  ): TransferView {
    const from = this.resolver.resolveForMovement(userId, input.fromAccountId);
    const to = this.resolver.resolveForMovement(userId, input.toAccountId);
    if (from.id === to.id) {
      throw new ValidationError(
        'Las cuentas de origen y destino deben ser distintas',
        'SAME_ACCOUNT'
      );
    }
    const transfer = Transfer.create({ userId, ...input }, this.clock.now());
    this.transfers.save(transfer);
    const p = transfer.toPrimitives();
    return {
      id: p.id,
      fromAccountId: from.id,
      fromAccountName: from.name,
      toAccountId: to.id,
      toAccountName: to.name,
      amountCents: p.amountCents,
      date: p.date,
      description: p.description,
      createdAt: p.createdAt,
    };
  }

  deleteTransfer(userId: string, id: string): void {
    if (!this.transfers.delete(userId, id)) {
      throw new NotFoundError('Transferencia no encontrada', 'TRANSFER_NOT_FOUND');
    }
  }
}
