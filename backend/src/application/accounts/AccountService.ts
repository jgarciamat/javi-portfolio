import { ConflictError, NotFoundError, ValidationError } from '@domain/errors';
import { Account, AccountInput, AccountProps } from '@domain/model/Account';
import { Transfer } from '@domain/model/Transfer';
import {
  AccountRepository,
  SettingsRepository,
  TransferRepository,
  TransferView,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
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
    private readonly clock: Clock
  ) {}

  private activeCount(userId: string): number {
    return this.accounts.listByUser(userId).filter((a) => !a.archived).length;
  }

  list(userId: string): { accounts: AccountWithBalance[]; totalCents: Cents } {
    const defaultId = this.resolver.defaultAccount(userId).id;
    const movements = this.accounts.movementBalances(userId);
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
    const updated = account.update(changes);
    this.accounts.save(updated);
    return updated.toPrimitives();
  }

  delete(userId: string, id: string): void {
    this.resolver.requireById(userId, id);
    if (this.settings.get(userId).defaultAccountId === id) {
      throw new ConflictError('No puedes eliminar la cuenta por defecto', 'DEFAULT_ACCOUNT');
    }
    if (this.accounts.countReferences(userId, id) > 0) {
      throw new ConflictError(
        'La cuenta tiene movimientos. Archívala en lugar de eliminarla.',
        'ACCOUNT_IN_USE'
      );
    }
    this.accounts.delete(userId, id);
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
