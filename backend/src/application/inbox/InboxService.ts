import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { UnauthorizedError } from '@domain/errors';
import { InboxMessage, InboxRepository, InboxStatus } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { inboxTokenOf, parseReceiptEmail } from '@domain/services/receipt-email';
import { Cents } from '@domain/shared/money';
import { ImportService } from '@application/data/DataServices';

export interface InboxConfig {
  /** Domain of the receiving addresses; null leaves the feature off. */
  domain: string | null;
  /** Shared secret of the service that forwards the e-mails to us. */
  secret: string | null;
}

export interface IncomingMail {
  to: string;
  from: string;
  subject: string;
  text: string;
  date?: string | null;
}

export interface InboxOverview {
  /** The user's private address, or null while the feature is not configured. */
  address: string | null;
  recent: InboxMessage[];
}

const RECENT = 10;

/** Receipts forwarded by e-mail become expenses (Premium, like importing a bank file). */
export class InboxService {
  constructor(
    private readonly repo: InboxRepository,
    private readonly importer: ImportService,
    private readonly config: InboxConfig,
    private readonly clock: Clock
  ) {}

  enabled(): boolean {
    return !!this.config.domain && !!this.config.secret;
  }

  overview(userId: string): InboxOverview {
    if (!this.enabled()) return { address: null, recent: [] };
    let token = this.repo.tokenOf(userId);
    if (!token) token = this.newToken(userId);
    return {
      address: `${token}@${this.config.domain}`,
      recent: this.repo.recent(userId, RECENT),
    };
  }

  /** Gives the user a new address (the old one stops working). */
  rotate(userId: string): InboxOverview {
    if (this.enabled()) this.newToken(userId);
    return this.overview(userId);
  }

  async receive(secret: string | undefined, mail: IncomingMail): Promise<InboxStatus | 'ignored'> {
    if (!this.authorized(secret)) throw new UnauthorizedError('Servicio no autorizado');
    const token = inboxTokenOf(mail.to);
    const userId = token ? this.repo.userOf(token) : null;
    if (!userId) return 'ignored';

    const parsed = parseReceiptEmail(mail);
    if (!parsed) return this.record(userId, 'unreadable', null, null);
    try {
      const result = await this.importer.import(
        userId,
        [
          {
            date: parsed.date ?? this.clock.now().toISOString().slice(0, 10),
            description: parsed.description,
            amountCents: -parsed.amountCents,
            type: 'EXPENSE',
            notes: 'Recibido por email',
          },
        ],
        {}
      );
      const status =
        result.imported > 0 ? 'imported' : result.duplicates > 0 ? 'duplicate' : 'failed';
      return this.record(userId, status, parsed.description, parsed.amountCents);
    } catch {
      return this.record(userId, 'failed', parsed.description, parsed.amountCents);
    }
  }

  private record(
    userId: string,
    status: InboxStatus,
    description: string | null,
    amountCents: Cents | null
  ): InboxStatus {
    this.repo.log(userId, {
      id: randomUUID(),
      receivedAt: this.clock.now().toISOString(),
      status,
      description,
      amountCents,
    });
    return status;
  }

  private newToken(userId: string): string {
    const token = `mm-${randomBytes(10).toString('hex')}`;
    this.repo.setToken(userId, token, this.clock.now().toISOString());
    return token;
  }

  private authorized(secret: string | undefined): boolean {
    if (!this.enabled() || !secret) return false;
    const expected = Buffer.from(this.config.secret as string);
    const given = Buffer.from(secret);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
