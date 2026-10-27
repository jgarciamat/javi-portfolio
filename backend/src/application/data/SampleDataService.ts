import { Transaction } from '@domain/model/Transaction';
import { SettingsRepository, TransactionRepository, UnitOfWork } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { SAMPLE_HASH_PREFIX, sampleMovements } from '@domain/services/sample-data';
import { todayDateOnly } from '@domain/shared/period';
import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';

export interface SampleDataStatus {
  /** Invented movements the user has now. */
  sample: number;
  /** All their movements, the invented ones included. */
  movements: number;
}

/** «Pruébalo con datos de ejemplo»: invented movements to try the app, removed with one tap. */
export class SampleDataService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly categoryResolver: CategoryResolver,
    private readonly accountResolver: AccountResolver,
    private readonly settings: SettingsRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  status(userId: string): SampleDataStatus {
    return {
      sample: this.transactions.countSample(userId),
      movements: this.transactions.count(userId),
    };
  }

  /** Adds the invented movements to the default account; adding them again changes nothing. */
  load(userId: string): SampleDataStatus {
    const now = this.clock.now();
    const startDay = this.settings.get(userId).monthStartDay;
    this.uow.run(() => {
      const account = this.accountResolver.resolveForMovement(userId, null);
      sampleMovements(todayDateOnly(now)).forEach((movement, index) => {
        const category = this.categoryResolver.findOrCreate(userId, movement.category);
        this.transactions.insertIfAbsent(
          Transaction.create(
            {
              userId,
              accountId: account.id,
              categoryId: category.id,
              description: movement.description,
              amountCents: movement.amountCents,
              type: movement.type,
              date: movement.date,
              notes: null,
              importHash: `${SAMPLE_HASH_PREFIX}${index}`,
            },
            startDay,
            now
          )
        );
      });
    });
    return this.status(userId);
  }

  /** Removes every invented movement (the person's own ones stay). Returns how many. */
  remove(userId: string): number {
    return this.transactions.deleteSample(userId);
  }
}
