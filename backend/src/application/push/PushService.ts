import { randomUUID } from 'crypto';
import { ValidationError } from '@domain/errors';
import { PushRepository } from '@domain/ports/repositories';
import { Clock, PushPayload, PushSender } from '@domain/ports/services';

/** Notifications to the phones and browsers that asked for them. */
export class PushService {
  constructor(
    private readonly subscriptions: PushRepository,
    private readonly sender: PushSender,
    private readonly clock: Clock,
    private readonly logger: Pick<Console, 'error'> = console
  ) {}

  get enabled(): boolean {
    return this.sender.enabled;
  }

  publicKey(): string | null {
    return this.sender.publicKey();
  }

  subscribe(userId: string, input: { endpoint: string; p256dh: string; auth: string }): void {
    if (!this.sender.enabled) {
      throw new ValidationError('Las notificaciones push no están activadas', 'PUSH_DISABLED');
    }
    this.subscriptions.save({ id: randomUUID(), userId, ...input }, this.clock.now().toISOString());
  }

  unsubscribe(userId: string, endpoint: string): void {
    this.subscriptions.remove(userId, endpoint);
  }

  /** Sends to every device of the user; returns how many received it. */
  async notify(userId: string, payload: PushPayload): Promise<number> {
    let sent = 0;
    for (const subscription of this.subscriptions.listByUser(userId)) {
      try {
        if ((await this.sender.send(subscription, payload)) === 'gone') {
          this.subscriptions.removeEndpoint(subscription.endpoint);
        } else {
          sent += 1;
        }
      } catch (e) {
        this.logger.error('[push] could not send', e);
      }
    }
    return sent;
  }
}
