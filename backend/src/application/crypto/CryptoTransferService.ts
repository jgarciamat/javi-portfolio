import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@domain/errors';
import { Transaction } from '@domain/model/Transaction';
import {
  CryptoSimRepository,
  SettingsRepository,
  TransactionRepository,
  UnitOfWork,
} from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { todayDateOnly } from '@domain/shared/period';
import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';

/** The simulator always works in euros (an account in another currency cannot take it as is). */
const SIMULATOR_CURRENCY = 'EUR';

/** The category of the movements, created the first time (one name per language). */
export const TRANSFER_CATEGORY = { es: 'Consola crypto', en: 'Crypto console' } as const;
export const TRANSFER_CATEGORY_ICON = '🪙';

type Language = keyof typeof TRANSFER_CATEGORY;

/** «+123,45 €» / «+€123.45»: always with its sign, in whole cents. */
function signedEuros(cents: Cents, language: Language): string {
  const sign = cents < 0 ? '-' : '+';
  const amount = (Math.abs(cents) / 100).toFixed(2);
  return language === 'en' ? `${sign}€${amount}` : `${sign}${amount.replace('.', ',')} €`;
}

/**
 * The words of the movement: it says, in the description and in the notes, that the money comes
 * from practice in the simulator (not from a real operation), so the account never looks as if it
 * had earned or lost it in a market.
 */
export function transferWording(
  position: { symbol: string; direction: 'long' | 'short'; pnlCents: Cents; closedAt: string },
  language: Language
): { description: string; notes: string } {
  const amount = signedEuros(position.pnlCents, language);
  const day = position.closedAt.slice(0, 10);
  if (language === 'en') {
    return {
      description: `Crypto console (practice): ${position.symbol} ${amount}`,
      notes:
        `Practice money from the Crypto console simulator: not a real trade or money from an ` +
        `exchange. Result of the ${position.symbol} ${position.direction} practice trade closed on ${day}.`,
    };
  }
  const side = position.direction === 'long' ? 'en largo' : 'en corto';
  return {
    description: `Consola crypto (práctica): ${position.symbol} ${amount}`,
    notes:
      `Dinero de práctica del simulador de la Consola crypto: no es una operación real ni dinero ` +
      `de un exchange. Resultado de la operación de práctica de ${position.symbol} ${side} ` +
      `cerrada el ${day}.`,
  };
}

/**
 * Adds the result of a closed operation of a practice portfolio to one of the person's accounts
 * of type Criptomonedas: one income (gain) or expense (loss) of exactly that result, in whole
 * cents, dated today, which changes the balance of that account and so the total of the accounts.
 * Only practice: the official portfolio of the month (the ranking) is never added. Once per
 * operation: the second time is a conflict that names the account it already went to.
 */
export class CryptoTransferService {
  constructor(
    private readonly repo: CryptoSimRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountResolver,
    private readonly categories: CategoryResolver,
    private readonly settings: SettingsRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  /**
   * `userId` owns the operation (the simulator is personal); `dataUserId` owns the account (the
   * same person, or the owner of the household they joined, whose accounts they already use).
   * Answers with the portfolio of the operation, so the route can show it again.
   */
  add(
    userId: string,
    dataUserId: string,
    positionId: string,
    accountId: string
  ): { portfolioId: string; transactionId: string } {
    return this.uow.run(() => {
      const position = this.repo.position(userId, positionId);
      if (!position) {
        throw new NotFoundError('Esa operación ya no existe', 'CRYPTO_POSITION_NOT_FOUND');
      }
      // Never null: an operation goes with its portfolio (ON DELETE CASCADE).
      const portfolio = this.repo.portfolio(userId, position.portfolioId)!;
      if (portfolio.kind !== 'practice') {
        throw new BusinessRuleError(
          'CRYPTO_TRANSFER_OFFICIAL',
          'Solo se puede añadir a una cuenta el resultado de una cartera de práctica, nunca el de la cartera oficial del mes'
        );
      }
      if (!position.closedAt || position.pnlCents === null) {
        throw new BusinessRuleError(
          'CRYPTO_TRANSFER_OPEN',
          'La operación sigue abierta: ciérrala antes de añadir su resultado a una cuenta'
        );
      }
      if (position.pnlCents === 0) {
        throw new BusinessRuleError(
          'CRYPTO_TRANSFER_ZERO',
          'Esta operación no ganó ni perdió dinero: no hay nada que añadir'
        );
      }
      const done = this.repo.transferOf(positionId);
      if (done) {
        throw new ConflictError(
          `Esta operación ya se añadió a la cuenta «${done.accountName}»`,
          'CRYPTO_ALREADY_TRANSFERRED',
          { accountId: done.accountId, accountName: done.accountName }
        );
      }
      const account = this.accounts.resolveForMovement(dataUserId, accountId);
      if (account.toPrimitives().type !== 'crypto') {
        throw new ValidationError(
          'Elige una cuenta de tipo Criptomonedas',
          'CRYPTO_TRANSFER_ACCOUNT_TYPE'
        );
      }
      const settings = this.settings.get(dataUserId);
      if (settings.currency !== SIMULATOR_CURRENCY) {
        throw new BusinessRuleError(
          'CRYPTO_TRANSFER_CURRENCY',
          `El simulador funciona en euros y tus cuentas están en ${settings.currency}: no se puede añadir el resultado sin cambiar su valor`,
          { currency: settings.currency }
        );
      }
      const language: Language = settings.locale === 'en' ? 'en' : 'es';
      const category = this.categories.findOrCreate(
        dataUserId,
        TRANSFER_CATEGORY[language],
        TRANSFER_CATEGORY_ICON
      );
      const now = this.clock.now();
      const wording = transferWording(
        { ...position, pnlCents: position.pnlCents, closedAt: position.closedAt },
        language
      );
      const movement = Transaction.create(
        {
          userId: dataUserId,
          accountId: account.id,
          categoryId: category.id,
          description: wording.description,
          notes: wording.notes,
          amountCents: Math.abs(position.pnlCents),
          type: position.pnlCents > 0 ? 'INCOME' : 'EXPENSE',
          date: todayDateOnly(now),
        },
        settings.monthStartDay,
        now
      );
      this.transactions.save(movement);
      this.repo.insertTransfer({
        positionId,
        userId,
        transactionId: movement.id,
        createdAt: now.toISOString(),
      });
      return { portfolioId: portfolio.id, transactionId: movement.id };
    });
  }
}
