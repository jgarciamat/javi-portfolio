import webpush from 'web-push';
import { PushPayload, PushSender } from '@domain/ports/services';

/** Web Push (VAPID): browsers and installed web apps on Android, iOS 16.4+ and desktop. */
export class WebPushSender implements PushSender {
  readonly enabled = true;

  constructor(
    private readonly keys: { publicKey: string; privateKey: string; subject: string },
    private readonly client: Pick<typeof webpush, 'sendNotification' | 'setVapidDetails'> = webpush
  ) {
    client.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  }

  publicKey(): string {
    return this.keys.publicKey;
  }

  async send(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
  ): Promise<'sent' | 'gone'> {
    try {
      await this.client.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 }
      );
      return 'sent';
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return 'gone';
      throw e;
    }
  }
}

/** Used when no keys are configured: push notifications are simply off. */
export class DisabledPushSender implements PushSender {
  readonly enabled = false;

  publicKey(): null {
    return null;
  }

  async send(): Promise<'sent'> {
    return 'sent';
  }
}
