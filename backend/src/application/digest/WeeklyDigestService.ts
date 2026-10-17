import {
  DigestRepository,
  RecurringRuleRepository,
  SettingsRepository,
  TransactionRepository,
  TransactionSearchResult,
} from '@domain/ports/repositories';
import { Clock, EmailSender } from '@domain/ports/services';
import { DigestData, DigestUpcoming, buildDigest, isDigestWindow } from '@domain/services/digest';
import {
  Period,
  addMonths,
  currentPeriod,
  periodStart,
  todayDateOnly,
} from '@domain/shared/period';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A user gets at most one digest in this many days. */
const MIN_GAP_DAYS = 5;
const MAX_ROWS = 2000;

const isoDay = (now: Date, daysAgo: number): string =>
  todayDateOnly(new Date(now.getTime() - daysAgo * DAY_MS));

/** Sends the opt-in Monday summary by e-mail. Called every hour; it acts only on Mondays. */
export class WeeklyDigestService {
  constructor(
    private readonly digests: DigestRepository,
    private readonly transactions: TransactionRepository,
    private readonly rules: RecurringRuleRepository,
    private readonly settings: SettingsRepository,
    private readonly email: EmailSender,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  /** Returns how many e-mails went out. */
  async run(): Promise<number> {
    const now = this.clock.now();
    if (!isDigestWindow(now)) return 0;
    const since = new Date(now.getTime() - MIN_GAP_DAYS * DAY_MS).toISOString();
    let sent = 0;
    for (const user of this.digests.due(since)) {
      try {
        await this.email.sendWeeklyDigest(
          user.email,
          user.name,
          user.locale,
          this.build(user.userId, now),
          user.currency
        );
        this.digests.markSent(user.userId, now.toISOString());
        sent += 1;
      } catch (e) {
        this.logger.error('[digest] could not send', e);
      }
    }
    return sent;
  }

  build(userId: string, now: Date): DigestData {
    const from = isoDay(now, 7);
    const to = isoDay(now, 1);
    const week = (a: string, b: string, type: 'EXPENSE' | 'INCOME'): TransactionSearchResult =>
      this.transactions.search(userId, {
        type,
        from: a,
        to: b,
        sort: 'date_desc',
        limit: MAX_ROWS,
        offset: 0,
      });
    const expenses = week(from, to, 'EXPENSE');
    const before = week(isoDay(now, 14), isoDay(now, 8), 'EXPENSE');
    const income = week(from, to, 'INCOME');
    return buildDigest({
      from,
      to,
      expenses: expenses.items,
      incomeCents: income.totals.incomeCents,
      previousSpentCents: before.totals.expenseCents,
      upcoming: this.upcoming(userId, now),
    });
  }

  /** Recurring expenses that the next period charges, when it starts within a week. */
  upcoming(userId: string, now: Date): DigestUpcoming | null {
    const startDay = this.settings.get(userId).monthStartDay;
    const next: Period = addMonths(currentPeriod(startDay, now), 1);
    const date = periodStart(next, startDay);
    const today = todayDateOnly(now);
    const daysAway = (Date.parse(date) - Date.parse(today)) / DAY_MS;
    if (daysAway < 0 || daysAway > 7) return null;
    const items = this.rules
      .listByUser(userId)
      .filter((r) => r.appliesTo(next) && r.type === 'EXPENSE')
      .map((r) => ({ description: r.description, amountCents: r.amountCents }));
    if (items.length === 0) return null;
    return {
      date,
      items,
      totalCents: items.reduce((sum, i) => sum + i.amountCents, 0),
    };
  }
}
