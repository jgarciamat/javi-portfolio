import { PushRepository, SettingsRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { isDigestWindow } from '@domain/services/digest';
import { todayDateOnly } from '@domain/shared/period';
import { WeeklyDigestService } from '@application/digest/WeeklyDigestService';
import { PushService } from './PushService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The mornings (UTC 07-11, i.e. 8-13 h in Spain) when reminders go out. */
const isReminderWindow = (now: Date): boolean => now.getUTCHours() >= 7 && now.getUTCHours() < 11;

const COPY = {
  es: {
    billsTitle: 'Mañana se cobran tus operaciones automáticas',
    bills: (count: number, total: string) =>
      `${count} ${count === 1 ? 'operación' : 'operaciones'} por ${total}.`,
    weeklyTitle: 'Tu resumen semanal',
    weekly: (spent: string, pct: number | null) =>
      pct === null
        ? `La semana pasada gastaste ${spent}.`
        : `La semana pasada gastaste ${spent} (${
            pct > 0 ? '+' : ''
          }${pct} % respecto a la anterior).`,
  },
  en: {
    billsTitle: 'Your automatic movements are charged tomorrow',
    bills: (count: number, total: string) =>
      `${count} ${count === 1 ? 'movement' : 'movements'} for ${total}.`,
    weeklyTitle: 'Your weekly summary',
    weekly: (spent: string, pct: number | null) =>
      pct === null
        ? `Last week you spent ${spent}.`
        : `Last week you spent ${spent} (${pct > 0 ? '+' : ''}${pct}% vs the week before).`,
  },
} as const;

/**
 * Push notifications on a schedule, for the users who allowed them on some device: the day
 * before the next period charges the automatic movements, and the Monday summary. Called
 * every hour; each notification goes out once.
 */
export class ReminderService {
  constructor(
    private readonly subscriptions: PushRepository,
    private readonly push: PushService,
    private readonly digest: WeeklyDigestService,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /** Returns how many notifications were sent. */
  async run(): Promise<number> {
    const now = this.clock.now();
    if (!this.push.enabled || !isReminderWindow(now)) return 0;
    const today = todayDateOnly(now);
    let sent = 0;
    for (const userId of this.subscriptions.subscribedUsers()) {
      const { locale, currency } = this.settings.get(userId);
      const copy = COPY[locale];
      const tag = locale === 'es' ? 'es-ES' : 'en-GB';
      const money = (cents: number) =>
        new Intl.NumberFormat(tag, { style: 'currency', currency }).format(cents / 100);

      const bills = this.digest.upcoming(userId, now);
      const tomorrow = bills && Date.parse(bills.date) - Date.parse(today) === DAY_MS;
      if (bills && tomorrow && this.claim(userId, 'bills', bills.date, now)) {
        sent += await this.push.notify(userId, {
          title: copy.billsTitle,
          body: copy.bills(bills.items.length, money(bills.totalCents)),
          url: '/',
        });
      }

      if (isDigestWindow(now) && this.claim(userId, 'weekly', today, now)) {
        const week = this.digest.build(userId, now);
        sent += await this.push.notify(userId, {
          title: copy.weeklyTitle,
          body: copy.weekly(money(week.spentCents), week.changePct),
          url: '/',
        });
      }
    }
    return sent;
  }

  private claim(userId: string, kind: string, key: string, now: Date): boolean {
    return this.subscriptions.claim(userId, kind, key, now.toISOString());
  }
}
