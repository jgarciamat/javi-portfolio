import { PushRepository, SettingsRepository } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { isDigestWindow } from '@domain/services/digest';
import { todayDateOnly } from '@domain/shared/period';
import { WeeklyDigestService } from '@application/digest/WeeklyDigestService';
import { PushService } from './PushService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The mornings (UTC 07-11, i.e. 8-13 h in Spain) when reminders go out. */
const isReminderWindow = (now: Date): boolean => now.getUTCHours() >= 7 && now.getUTCHours() < 11;

const MONTHS = {
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
} as const;

const COPY = {
  es: {
    statementTitle: (month: string) => `Ya tienes el extracto de ${month}`,
    statement:
      'Son 30 segundos: impórtalo con el archivo del banco, el texto copiado o una captura.',
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
    statementTitle: (month: string) => `Your ${month} statement is ready`,
    statement: 'It takes 30 seconds: import the bank file, the copied text or a screenshot.',
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

/** The month that has just ended, by name: its statement can be downloaded now. */
const endedMonth = (today: string, locale: keyof typeof MONTHS): string =>
  MONTHS[locale][(Number(today.slice(5, 7)) + 10) % 12];

/**
 * Push notifications on a schedule, for the users who allowed them on some device: on the day
 * their month starts, that the statement of the month just ended can be imported; the day
 * before the next period charges the automatic movements; and the Monday summary. Called every
 * hour; each notification goes out once. Turning push off on every device stops them all.
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
      const { locale, currency, monthStartDay } = this.settings.get(userId);
      const copy = COPY[locale];
      const tag = locale === 'es' ? 'es-ES' : 'en-GB';
      const money = (cents: number): string =>
        new Intl.NumberFormat(tag, { style: 'currency', currency }).format(cents / 100);

      const monthStarts = Number(today.slice(8, 10)) === monthStartDay;
      if (monthStarts && this.claim(userId, 'statement', today.slice(0, 7), now)) {
        sent += await this.push.notify(userId, {
          title: copy.statementTitle(endedMonth(today, locale)),
          body: copy.statement,
          url: '/?importar=1',
        });
      }

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
