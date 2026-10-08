import {
  SettingsChanges,
  UserSettingsProps,
  applySettingsChanges,
} from '@domain/model/UserSettings';
import { SettingsRepository, TransactionRepository, UnitOfWork } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { currentPeriod, periodEnd, periodStart } from '@domain/shared/period';
import { AccountResolver } from '@application/shared/resolvers';
import { RecurringMaterializer } from '@application/recurring/RecurringMaterializer';

export interface SettingsView extends UserSettingsProps {
  currentPeriod: { year: number; month: number; start: string; end: string };
}

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountResolver,
    private readonly materializer: RecurringMaterializer,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  get(userId: string): SettingsView {
    const s = this.settings.get(userId);
    if (!s.defaultAccountId) s.defaultAccountId = this.accounts.defaultAccount(userId).id;
    const p = currentPeriod(s.monthStartDay, this.clock.now());
    return {
      ...s,
      currentPeriod: {
        ...p,
        start: periodStart(p, s.monthStartDay),
        end: periodEnd(p, s.monthStartDay),
      },
    };
  }

  update(userId: string, changes: SettingsChanges): SettingsView {
    const current = this.settings.get(userId);
    const next = applySettingsChanges(current, changes);
    if (next.defaultAccountId && next.defaultAccountId !== current.defaultAccountId) {
      this.accounts.resolveForMovement(userId, next.defaultAccountId);
    }
    this.uow.run(() => {
      this.settings.save(next);
      if (next.monthStartDay !== current.monthStartDay) {
        // Every movement keeps its date but may now belong to another period.
        for (const tx of this.transactions.listAllByUser(userId)) {
          const moved = tx.withPeriodFor(next.monthStartDay);
          if (moved.period.year !== tx.period.year || moved.period.month !== tx.period.month) {
            this.transactions.save(moved);
          }
        }
      }
    });
    if (next.monthStartDay !== current.monthStartDay) this.materializer.invalidate(userId);
    return this.get(userId);
  }
}
