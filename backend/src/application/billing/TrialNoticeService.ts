import { planOf } from '@domain/model/Subscription';
import { SubscriptionRepository, TrialNoticeRepository } from '@domain/ports/repositories';
import {
  Clock,
  EmailSender,
  FunnelRecorder,
  PushPayload,
  TrialNoticeKind,
  TrialUsage,
} from '@domain/ports/services';
import { ENDED_NOTICE_DAYS, ENDS_SOON_DAYS, trialNoticeKind } from '@domain/services/trial-notices';
import { PushService } from '@application/push/PushService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The mornings (UTC 07-11, i.e. 8-13 h in Spain) when the notices go out. */
const isNoticeWindow = (now: Date): boolean => now.getUTCHours() >= 7 && now.getUTCHours() < 11;

const COPY = {
  es: {
    endsSoon: (date: string) => ({
      title: `Tu prueba de Premium termina el ${date}`,
      body: 'Después sigues con el plan gratuito y todos tus datos. Mira qué cambia.',
    }),
    lastDay: {
      title: 'Hoy termina tu prueba de Premium',
      body: 'Después sigues con el plan gratuito y todos tus datos. Mira qué cambia.',
    },
    ended: {
      title: 'Tu prueba de Premium ha terminado',
      body: 'Sigues con el plan gratuito y todos tus datos. Aquí tienes qué incluye cada plan.',
    },
  },
  en: {
    endsSoon: (date: string) => ({
      title: `Your Premium trial ends on ${date}`,
      body: 'Afterwards you stay on the free plan with all your data. See what changes.',
    }),
    lastDay: {
      title: 'Your Premium trial ends today',
      body: 'Afterwards you stay on the free plan with all your data. See what changes.',
    },
    ended: {
      title: 'Your Premium trial has ended',
      body: 'You stay on the free plan with all your data. Here is what each plan includes.',
    },
  },
} as const;

/**
 * Service messages about the end of the 14-day trial, by e-mail (verified address) and push
 * (devices that allowed it) two days before and on the last day, and once after it ended by
 * push only (never by e-mail). Only
 * to people on the trial (not Premium, not cancelling) who have not turned the notices off;
 * each message goes out once per user. Called every hour; it acts in the morning window.
 */
export class TrialNoticeService {
  constructor(
    private readonly notices: TrialNoticeRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly email: EmailSender,
    private readonly push: PushService,
    private readonly usage: (userId: string) => TrialUsage,
    private readonly funnel: FunnelRecorder,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  /** Returns how many messages (e-mails and notifications) went out. */
  async run(): Promise<number> {
    const now = this.clock.now();
    if (!isNoticeWindow(now)) return 0;
    const from = new Date(now.getTime() - (ENDED_NOTICE_DAYS + 1) * DAY_MS).toISOString();
    const to = new Date(now.getTime() + (ENDS_SOON_DAYS + 1) * DAY_MS).toISOString();
    let sent = 0;
    for (const user of this.notices.candidates(from, to)) {
      const kind = trialNoticeKind(user.trialEndsAt, now);
      if (!kind || !this.stillOnTrial(user.userId, now)) continue;
      if (!this.notices.claim(user.userId, kind, now.toISOString())) continue;
      const delivered = await this.deliver(user, kind);
      if (delivered === 0) this.notices.release(user.userId, kind);
      sent += delivered;
    }
    return sent;
  }

  /** The query already filters; this is the single rule of the plan model, as a safeguard. */
  private stillOnTrial(userId: string, now: Date): boolean {
    const sub = this.subscriptions.get(userId);
    return (
      !!sub &&
      sub.source === 'trial' &&
      !sub.lifetime &&
      !sub.cancelAtPeriodEnd &&
      planOf({ ...sub, trialEndsAt: null }, now) === 'free'
    );
  }

  private async deliver(
    user: {
      userId: string;
      email: string;
      name: string;
      locale: 'es' | 'en';
      emailVerified: boolean;
      trialEndsAt: string;
    },
    kind: TrialNoticeKind
  ): Promise<number> {
    let delivered = 0;
    // The notice after the end goes only as a push: no e-mail and no e-mail retry.
    if (user.emailVerified && kind !== 'ended') {
      try {
        await this.email.sendTrialNotice(
          user.email,
          user.name,
          { kind, endsAt: user.trialEndsAt, usage: this.usage(user.userId) },
          user.locale
        );
        delivered += 1;
        this.funnel.record('trial_notice', { detail: `${kind}:email` });
      } catch (e) {
        this.logger.error('[trial] could not send the e-mail', e);
      }
    }
    if (this.push.enabled) {
      const pushed = await this.push.notify(user.userId, this.payload(user, kind));
      if (pushed > 0) {
        delivered += 1;
        this.funnel.record('trial_notice', { detail: `${kind}:push` });
      }
    }
    return delivered;
  }

  private payload(
    user: { locale: 'es' | 'en'; trialEndsAt: string },
    kind: TrialNoticeKind
  ): PushPayload {
    const copy = COPY[user.locale];
    const date = new Date(user.trialEndsAt).toLocaleDateString(
      user.locale === 'es' ? 'es-ES' : 'en-GB',
      { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }
    );
    const text =
      kind === 'ends_soon' ? copy.endsSoon(date) : kind === 'last_day' ? copy.lastDay : copy.ended;
    return { ...text, url: '/pricing' };
  }
}
